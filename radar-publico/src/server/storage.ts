import "server-only";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "@/lib/hash";

/**
 * Private file storage for internal company documents. Files live outside `public/`, get random
 * names, are never executed, and are served only through an authenticated route as attachments.
 * The interface is small so an S3-compatible backend can replace the local disk later.
 */

const ALLOWED: Record<string, { mime: string; check: (b: Buffer) => boolean }> = {
  pdf: { mime: "application/pdf", check: (b) => b.subarray(0, 5).toString("latin1") === "%PDF-" },
  png: { mime: "image/png", check: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  jpg: { mime: "image/jpeg", check: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  jpeg: { mime: "image/jpeg", check: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", check: isZip },
  xlsx: { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", check: isZip },
  odt: { mime: "application/vnd.oasis.opendocument.text", check: isZip },
  ods: { mime: "application/vnd.oasis.opendocument.spreadsheet", check: isZip },
  doc: { mime: "application/msword", check: isOle },
  xls: { mime: "application/vnd.ms-excel", check: isOle },
  txt: { mime: "text/plain; charset=utf-8", check: isText },
  csv: { mime: "text/csv; charset=utf-8", check: isText },
};

function isZip(b: Buffer) {
  return b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
}
function isOle(b: Buffer) {
  return b.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
}
function isText(b: Buffer) {
  if (b.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(b.subarray(0, 64 * 1024));
    return true;
  } catch {
    return false;
  }
}

export class FileValidationError extends Error {}

export function storageRoot(): string {
  // Runtime-configured directory; excluded from build tracing on purpose.
  return path.resolve(/*turbopackIgnore: true*/ process.env.STORAGE_DIR ?? "./storage");
}

export function maxUploadBytes(): number {
  return Number(process.env.MAX_UPLOAD_MB ?? 15) * 1024 * 1024;
}

export interface StoredFile {
  storageKey: string;
  sha256: string;
  sizeBytes: number;
  mimeType: string;
  originalName: string;
}

export async function saveUpload(file: File): Promise<StoredFile> {
  if (!file || file.size === 0) throw new FileValidationError("Arquivo vazio.");
  if (file.size > maxUploadBytes()) throw new FileValidationError(`Arquivo maior que ${Math.round(maxUploadBytes() / 1024 / 1024)} MB.`);
  const originalName = path.basename(file.name).replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 150) || "arquivo";
  const ext = originalName.includes(".") ? originalName.split(".").pop()!.toLowerCase() : "";
  const rule = ALLOWED[ext];
  if (!rule) throw new FileValidationError(`Extensão não permitida. Aceitos: ${Object.keys(ALLOWED).join(", ")}.`);
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!rule.check(buffer)) throw new FileValidationError("O conteúdo do arquivo não corresponde à extensão informada.");
  const hash = sha256(buffer);
  // Content-addressed: identical files are stored once.
  const storageKey = `${hash.slice(0, 2)}/${hash}`;
  const target = resolveKey(storageKey);
  await mkdir(path.dirname(target), { recursive: true });
  const exists = await stat(target).then(() => true).catch(() => false);
  if (!exists) await writeFile(target, buffer, { mode: 0o600 });
  return { storageKey, sha256: hash, sizeBytes: buffer.length, mimeType: rule.mime, originalName };
}

function resolveKey(storageKey: string): string {
  if (!/^[0-9a-f]{2}\/[0-9a-f]{64}$/.test(storageKey)) throw new Error("Chave de armazenamento inválida");
  const root = storageRoot();
  const full = path.resolve(/*turbopackIgnore: true*/ root, storageKey);
  if (!full.startsWith(root + path.sep)) throw new Error("Caminho fora do armazenamento");
  return full;
}

export async function readStored(storageKey: string): Promise<Buffer> {
  return readFile(resolveKey(storageKey));
}
