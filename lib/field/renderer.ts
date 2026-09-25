import { director, FORMATIONS } from "@/lib/director";
import { generateAll, PLACEMENT, type Meta } from "./formations";

// The Field (Design System 8, SPEC 7): one WebGL2 program drawing N soft points that morph between formations.

const VERT = `#version 300 es
precision highp float;
uniform sampler2D uPositions;
uniform int uFrom, uTo, uRowsPer;
uniform float uMix, uTime, uVelocity, uPointerStrength, uPointSize, uDpr, uBurst, uFlow, uEmit;
uniform vec2 uPointer;
uniform vec4 uStageA, uStageB; // xy offset, zw scale (NDC) for the from/to formations
in float aSeed;
out float vAlpha;
out float vTint;

const int CURRENT = 7;
const int CONVERGE = 8;

vec4 fetchAt(int f) {
  int i = gl_VertexID;
  return texelFetch(uPositions, ivec2(i % 128, i / 128 + f * uRowsPer), 0);
}

// Formation-specific motion in unit space
vec2 local(vec4 v, int f) {
  vec2 p = v.xy;
  if (f == CURRENT) p.x = mod(p.x + uFlow * (0.6 + aSeed) + 1.0, 2.0) - 1.0;
  if (f == CONVERGE) {
    float a = uTime * 0.12 * (0.5 + aSeed);
    p = mat2(cos(a), -sin(a), sin(a), cos(a)) * p;
  }
  return p;
}

float alphaOf(vec4 v, int f) {
  return f == CONVERGE ? v.z + uEmit * exp(-length(v.xy) * 14.0) : v.z;
}

void main() {
  vec4 a = fetchAt(uFrom), b = fetchAt(uTo);
  float t = clamp((uMix - aSeed * 0.35) / 0.65, 0.0, 1.0);
  t = t * t * (3.0 - 2.0 * t);
  vec2 pa = local(a, uFrom) * uStageA.zw + uStageA.xy;
  vec2 pb = local(b, uTo) * uStageB.zw + uStageB.xy;
  vec2 p = mix(pa, pb, t);
  vec2 centre = mix(uStageA.xy, uStageB.xy, t);
  p += normalize(p - centre + 1e-5) * uBurst * (0.5 + aSeed) * 0.8;
  p += 0.004 * vec2(sin(uTime * 0.6 + aSeed * 40.0), cos(uTime * 0.5 + aSeed * 31.0));
  vec2 d = p - uPointer;
  p += normalize(d + 1e-5) * uPointerStrength * smoothstep(0.18, 0.0, length(d)) * 0.06;
  p.y += uVelocity * 0.02 * (aSeed - 0.5);
  gl_Position = vec4(p, 0.0, 1.0);
  gl_PointSize = uPointSize * uDpr * mix(0.6, 1.4, aSeed);
  vAlpha = min(1.0, mix(alphaOf(a, uFrom), alphaOf(b, uTo), t));
  vTint = mix(a.w, b.w, t);
}`;

const FRAG = `#version 300 es
precision mediump float;
uniform vec3 uCool, uWarm;
uniform float uDim;
uniform vec4 uSafe[4];
uniform int uSafeCount;
in float vAlpha;
in float vTint;
out vec4 outColor;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r2 = dot(c, c);
  if (r2 > 0.25) discard;
  float a = vAlpha * smoothstep(0.25, 0.0, r2) * uDim;
  for (int k = 0; k < 4; k++) {
    if (k >= uSafeCount) break;
    vec4 s = uSafe[k];
    if (gl_FragCoord.x > s.x && gl_FragCoord.x < s.z && gl_FragCoord.y > s.y && gl_FragCoord.y < s.w) a *= 0.15;
  }
  vec3 col = mix(uCool, uWarm, vTint);
  col = mix(col, vec3(0.404, 0.878, 0.839), smoothstep(0.85, 1.0, vAlpha) * 0.5); // brightest lift towards Signal
  outColor = vec4(col * a, a);
}`;

/** Field zone per breakpoint (SPEC 7.2): x0, x1, y0, y1 in NDC, then scale. */
function zone(w: number) {
  if (w >= 1024) return [0.05, 0.95, -0.8, 0.8, 0.85];
  if (w >= 768) return [-0.2, 0.95, -0.8, 0.8, 0.8];
  return [-0.9, 0.9, -0.95, 0, 0.7];
}

function stageFor(f: number, w: number, h: number): [number, number, number, number] {
  const aspect = w / h;
  const place = PLACEMENT[FORMATIONS[f]];
  if (place === "viewport") return [0, 0, 1, 1];
  if (place === "converge") return [director.converge[0], director.converge[1], 0.5 / aspect, 0.5];
  const [x0, x1, y0, y1, k] = zone(w);
  const sy = Math.min((y1 - y0) / 2, ((x1 - x0) / 2) * aspect) * k;
  return [(x0 + x1) / 2, (y0 + y1) / 2, sy / aspect, sy];
}

function compile(gl: WebGL2RenderingContext) {
  const program = gl.createProgram()!;
  for (const [type, src] of [
    [gl.VERTEX_SHADER, VERT],
    [gl.FRAGMENT_SHADER, FRAG],
  ] as const) {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
    gl.attachShader(program, s);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "link");
  return program;
}

export type FieldHandle = { meta: Meta; stop: () => void };

/** Starts the field. `onFail` is called when it must fall back (slow device or lost context). */
export async function startField(canvas: HTMLCanvasElement, count: number, onFail: (reason: string) => void): Promise<FieldHandle | null> {
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "high-performance" });
  if (!gl) return null;
  const { data, rowsPer, meta } = await generateAll(count);

  const program = compile(gl);
  gl.useProgram(program);
  const u = (name: string) => gl.getUniformLocation(program, name);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 128, rowsPer * FORMATIONS.length, 0, gl.RGBA, gl.FLOAT, data);

  const seeds = new Float32Array(count);
  let s = 0x9e3779b9;
  for (let i = 0; i < count; i++) seeds[i] = ((s = Math.imul(s ^ (s >>> 13), 0x5bd1e995)) >>> 0) / 4294967296;
  gl.bindVertexArray(gl.createVertexArray());
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
  const aSeed = gl.getAttribLocation(program, "aSeed");
  gl.enableVertexAttribArray(aSeed);
  gl.vertexAttribPointer(aSeed, 1, gl.FLOAT, false, 0, 0);

  gl.uniform1i(u("uRowsPer"), rowsPer);
  gl.uniform3f(u("uCool"), 0x1b / 255, 0x84 / 255, 0xe0 / 255);
  gl.uniform3f(u("uWarm"), 0x03 / 255, 0xb7 / 255, 0xb7 / 255);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.clearColor(0x02 / 255, 0x0a / 255, 0x17 / 255, 1);

  const phone = innerWidth < 768;
  let dprCap = phone ? 1 : 1.5;
  let draw = count;
  let dpr = 1;
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, dprCap);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  resize();
  addEventListener("resize", resize);

  let lost = false;
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    lost = true;
    onFail("context-lost");
  });

  const start = performance.now();
  let last = start;
  let frames = 0;
  let slowSum = 0;
  let degraded = false;
  let dim = director.dim;
  let flow = 0;
  let raf = 0;

  const frame = (now: number) => {
    if (lost) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;

    // Adaptive quality: average frame time over the first 90 frames (then again after degrading)
    frames++;
    slowSum += dt;
    if (frames === 90) {
      const avg = (slowSum / 90) * 1000;
      if (avg > 20 && !degraded) {
        degraded = true;
        draw = Math.floor(count / 2);
        dprCap = 1;
        resize();
        frames = 0;
        slowSum = 0;
      } else if (avg > 20) {
        onFail("slow");
        return;
      }
    }

    director.burst *= Math.pow(0.5, dt / 0.9);
    flow += dt * (0.05 + 0.4 * Math.abs(director.velocity));
    dim += (director.dim - dim) * Math.min(1, dt * 4);

    const w = innerWidth;
    const h = innerHeight;
    gl.uniform1i(u("uFrom"), director.from);
    gl.uniform1i(u("uTo"), director.to);
    gl.uniform1f(u("uMix"), director.mix);
    gl.uniform4f(u("uStageA"), ...stageFor(director.from, w, h));
    gl.uniform4f(u("uStageB"), ...stageFor(director.to, w, h));
    gl.uniform1f(u("uTime"), (now - start) / 1000);
    gl.uniform1f(u("uVelocity"), director.velocity);
    gl.uniform2f(u("uPointer"), ...director.pointer);
    gl.uniform1f(u("uPointerStrength"), director.pointerStrength);
    gl.uniform1f(u("uPointSize"), phone ? 1.8 : 2.4);
    gl.uniform1f(u("uDpr"), dpr);
    gl.uniform1f(u("uBurst"), director.burst);
    gl.uniform1f(u("uFlow"), flow);
    gl.uniform1f(u("uEmit"), director.emit);
    gl.uniform1f(u("uDim"), dim);
    const safe = director.safe.slice(0, 4);
    gl.uniform1i(u("uSafeCount"), safe.length);
    if (safe.length) gl.uniform4fv(u("uSafe"), safe.flatMap((r) => r.map((v) => v * dpr)));

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, draw);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  const onVisibility = () => {
    cancelAnimationFrame(raf);
    if (!document.hidden) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  return {
    meta,
    stop: () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}
