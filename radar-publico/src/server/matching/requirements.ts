import { normalizeText, normalizeWithMap, onlyDigits } from "@/lib/text";
import type { RequirementCategory, RequirementInput } from "./types";

/**
 * Deterministic requirement extraction.
 * Every requirement carries the verbatim sentence it came from and a source reference;
 * nothing is inferred when the text does not say it.
 */

export const RULES_SCHEMA_VERSION = "rules-v1";

export interface TextSource {
  /** "field:objectDescription", "field:complementaryInfo", "document:<uuid>" */
  ref: string;
  text: string;
  page?: number | null;
}

interface Rule {
  id: string;
  category: RequirementCategory;
  pattern: RegExp;
  confidence: number;
  describe: (m: RegExpExecArray, sentence: string) => { description: string; attributes?: Record<string, unknown> } | null;
}

function sentenceAround(original: string, start: number, end: number): string {
  const limit = 360;
  let from = start;
  while (from > 0 && start - from < limit && !/[.;\n]/.test(original[from - 1])) from--;
  let to = end;
  while (to < original.length && to - end < limit && !/[.;\n]/.test(original[to])) to++;
  if (to < original.length && /[.;]/.test(original[to])) to++;
  return original.slice(from, to).replace(/\s+/g, " ").trim();
}

function allowedFromSentence(sentence: string): boolean | null {
  const n = normalizeText(sentence);
  if (/(vedad|nao sera (permitid|admitid|aceit)|nao serao (permitid|admitid|aceit)|proibid|nao podera|nao e permitid|nao e admitid|impedid)/.test(n)) return false;
  if (/(sera permitid|sera admitid|serao admitid|serao permitid|e permitid|e admitid|podera|admite se|permite se)/.test(n)) return true;
  return null;
}

const CERTIFICATIONS: { re: RegExp; label: (m: RegExpExecArray) => string }[] = [
  { re: /(?<![a-z0-9])(?:abnt )?(?:nbr )?iso(?: iec)? (9001|27001|27701|20000(?: 1)?|14001|22301|37001)(?![0-9])/, label: (m) => `ISO ${m[1].replace(" ", "-")}` },
  { re: /(?<![a-z0-9])cmmi(?: dev)?(?: (?:nivel|level|nível))? ?([2-5]|ii|iii|iv|v)?(?![a-z0-9])/, label: (m) => (m[1] ? `CMMI nível ${m[1].toUpperCase()}` : "CMMI") },
  { re: /(?<![a-z0-9])mps ?br(?![a-z0-9])/, label: () => "MPS.BR" },
  { re: /(?<![a-z0-9])pmp(?![a-z0-9])/, label: () => "PMP" },
  { re: /(?<![a-z0-9])itil(?![a-z0-9])/, label: () => "ITIL" },
  { re: /(?<![a-z0-9])cobit(?![a-z0-9])/, label: () => "COBIT" },
  { re: /(?<![a-z0-9])(?:scrum master|psm i|csm)(?![a-z0-9])/, label: () => "Scrum Master" },
  { re: /(?<![a-z0-9])(?:pl 300|da 100|microsoft certified power bi)(?![a-z0-9])/, label: () => "Certificação Microsoft Power BI" },
];

const TECHNOLOGIES = [
  "Power BI", "Java", ".NET", "Python", "PHP", "React", "Angular", "Node.js", "PostgreSQL", "Oracle", "SQL Server",
  "MySQL", "MongoDB", "SAP", "Salesforce", "AWS", "Azure", "Google Cloud", "Kubernetes", "Docker", "Moodle",
  "WordPress", "Drupal", "Liferay", "Qlik", "Tableau", "Pentaho", "Airflow", "Spark", "Hadoop", "Dynamics 365",
];
const TECH_PATTERNS = TECHNOLOGIES.map((t) => {
  const n = normalizeText(t);
  return { label: t, re: new RegExp(`(?<![a-z0-9])${n.replace(/ /g, " ")}(?![a-z0-9])`) };
});

const RULES: Rule[] = [
  {
    id: "atestado-capacidade-tecnica",
    category: "TECHNICAL_QUALIFICATION",
    pattern: /atestados? de (?:capacidade|capacitacao|qualificacao) tecnic[ao]s?/,
    confidence: 0.9,
    describe: () => ({ description: "Exige atestado(s) de capacidade técnica" }),
  },
  {
    id: "capacidade-tecnico-operacional",
    category: "TECHNICAL_QUALIFICATION",
    pattern: /capacidade tecnico (?:operacional|profissional)|qualificacao tecnico (?:operacional|profissional)/,
    confidence: 0.75,
    describe: (m) => ({ description: `Exige comprovação de ${m[0].includes("profissional") ? "capacidade técnico-profissional" : "capacidade técnico-operacional"}` }),
  },
  {
    id: "experiencia-previa",
    category: "PREVIOUS_EXPERIENCE",
    pattern: /experiencia (?:minima|previa|comprovada|anterior)|comprovacao de experiencia|ter executado (?:servicos|contratos)/,
    confidence: 0.75,
    describe: () => ({ description: "Exige comprovação de experiência anterior" }),
  },
  {
    id: "visita-tecnica",
    category: "SITE_VISIT",
    pattern: /visita(?:s)? tecnica(?:s)?|vistoria (?:previa|tecnica)/,
    confidence: 0.85,
    describe: (_m, sentence) => {
      const n = normalizeText(sentence);
      const mandatory = /obrigatori/.test(n) ? true : /facultativ|opcional/.test(n) ? false : null;
      return {
        description:
          mandatory === true ? "Visita técnica obrigatória" : mandatory === false ? "Visita técnica facultativa" : "Menciona visita técnica",
        attributes: { mandatory },
      };
    },
  },
  {
    id: "consorcio",
    category: "CONSORTIUM",
    pattern: /consorcio|consorciad[ao]s/,
    confidence: 0.7,
    describe: (_m, sentence) => {
      const allowed = allowedFromSentence(sentence);
      return {
        description: allowed === false ? "Participação em consórcio vedada" : allowed === true ? "Participação em consórcio permitida" : "Menciona consórcio",
        attributes: { allowed },
      };
    },
  },
  {
    id: "subcontratacao",
    category: "SUBCONTRACTING",
    pattern: /subcontratac(?:ao|oes)|subcontratar/,
    confidence: 0.7,
    describe: (_m, sentence) => {
      const allowed = allowedFromSentence(sentence);
      return {
        description: allowed === false ? "Subcontratação vedada" : allowed === true ? "Subcontratação permitida (verificar limites)" : "Menciona subcontratação",
        attributes: { allowed },
      };
    },
  },
  {
    id: "me-epp-exclusiva",
    category: "ME_EPP",
    pattern: /exclusiv[ao]s? (?:para |a |as |de )?(?:participacao de )?(?:me|epp|mei|microempresas?|empresas de pequeno porte)(?![a-z0-9])|cota reservada/,
    confidence: 0.85,
    describe: (m) => ({
      description: m[0].includes("cota") ? "Cota reservada para ME/EPP" : "Participação exclusiva para ME/EPP",
      attributes: { exclusive: !m[0].includes("cota") },
    }),
  },
  {
    id: "qualificacao-economico-financeira",
    category: "FINANCIAL",
    pattern: /patrimonio liquido (?:minimo|equivalente)|capital social minimo|indices? de liquidez|liquidez (?:geral|corrente)|solvencia geral|balanco patrimonial|garantia (?:de proposta|contratual|da execucao|de execucao)/,
    confidence: 0.8,
    describe: (m) => ({ description: `Exigência econômico-financeira: ${m[0]}`, attributes: { kind: m[0] } }),
  },
  {
    id: "registro-profissional",
    category: "PROFESSIONAL_QUALIFICATION",
    pattern: /registro (?:no|junto ao|perante o) (?:crea|cau|crc|cra|cfa|cft|conselho regional)|responsavel tecnico|profissional (?:de nivel superior|com certificacao|certificado)/,
    confidence: 0.7,
    describe: (m) => ({ description: `Qualificação profissional: ${m[0]}` }),
  },
  {
    id: "prazo-execucao",
    category: "EXECUTION_TIMEFRAME",
    pattern: /(?:prazo de (?:execucao|vigencia|entrega|conclusao)|vigencia(?: contratual)?(?: do contrato)?)(?: sera)?(?: de)?(?: ate)? (\d{1,4})(?: [a-z]+)? (dias|meses|anos)/,
    confidence: 0.8,
    describe: (m) => ({
      description: `Prazo de execução/vigência: ${m[1]} ${m[2]}`,
      attributes: { amount: Number(m[1]), unit: m[2] },
    }),
  },
  {
    id: "prazo-impugnacao-esclarecimento",
    category: "DEADLINE",
    pattern: /(impugna|esclarecimento|visita)[a-z]*[^.]{0,120}?(\d{2}) (\d{2}) (\d{4})/,
    confidence: 0.6,
    describe: (m) => {
      const kind = m[1].startsWith("impugna") ? "impugnação" : m[1].startsWith("esclarec") ? "esclarecimento" : "visita";
      const [dd, mm, yyyy] = [m[2], m[3], m[4]];
      if (Number(mm) < 1 || Number(mm) > 12 || Number(dd) < 1 || Number(dd) > 31) return null;
      return { description: `Data mencionada para ${kind}: ${dd}/${mm}/${yyyy}`, attributes: { kind, date: `${yyyy}-${mm}-${dd}` } };
    },
  },
  {
    id: "execucao-local",
    category: "GEOGRAPHIC",
    pattern: /(?:sede|filial|escritorio) (?:ou (?:filial|escritorio) )?(?:no|na|em) (?:municipio|cidade|estado)|presencialmente nas dependencias|execucao presencial/,
    confidence: 0.65,
    describe: (m) => ({ description: `Requisito geográfico/presencial: ${m[0]}` }),
  },
  {
    id: "integracao-sistemas",
    category: "INTEGRATION",
    pattern: /integracao (?:com (?:o|os|a|as) )?(?:sistemas?|plataformas?|bases?|api|apis|webservices?)/,
    confidence: 0.6,
    describe: () => ({ description: "Menciona integração obrigatória ou prevista com sistemas existentes" }),
  },
];

export function extractRequirementsByRules(sources: TextSource[]): RequirementInput[] {
  const out: RequirementInput[] = [];
  const seen = new Set<string>();

  const push = (req: RequirementInput, dedupKey: string) => {
    if (seen.has(dedupKey)) return;
    seen.add(dedupKey);
    out.push(req);
  };

  for (const source of sources) {
    if (!source.text?.trim()) continue;
    const mapped = normalizeWithMap(source.text);
    const toOriginal = (idx: number, len: number) => {
      const start = mapped.map[idx] ?? 0;
      const end = (mapped.map[idx + len - 1] ?? start) + 1;
      return { start, end };
    };

    for (const rule of RULES) {
      const re = new RegExp(rule.pattern.source, "g");
      let m: RegExpExecArray | null;
      while ((m = re.exec(mapped.text)) !== null) {
        const pos = toOriginal(m.index, m[0].length);
        const sentence = sentenceAround(source.text, pos.start, pos.end);
        const described = rule.describe(m, sentence);
        if (described) {
          push(
            {
              category: rule.category,
              ruleId: rule.id,
              description: described.description,
              supportingText: sentence,
              sourceRef: source.ref,
              attributes: { ...(described.attributes ?? {}), confidence: rule.confidence, page: source.page ?? null },
              verification: "VERIFIED",
            },
            `${rule.id}|${JSON.stringify(described.attributes ?? {})}|${rule.id.startsWith("prazo") ? source.ref : ""}`,
          );
        }
        if (m[0].length === 0) re.lastIndex++;
      }
    }

    for (const cert of CERTIFICATIONS) {
      const re = new RegExp(cert.re.source, "g");
      let m: RegExpExecArray | null;
      while ((m = re.exec(mapped.text)) !== null) {
        const label = cert.label(m);
        const pos = toOriginal(m.index, m[0].length);
        const sentence = sentenceAround(source.text, pos.start, pos.end);
        push(
          {
            category: "CERTIFICATE",
            ruleId: "certificacao",
            description: `Menciona certificação: ${label}`,
            supportingText: sentence,
            sourceRef: source.ref,
            attributes: { certification: label, confidence: 0.8, page: source.page ?? null },
            verification: "VERIFIED",
          },
          `cert|${label}`,
        );
      }
    }

    const cnaeRe = /cnae[^0-9]{0,25}((?:\d{4} ?\d ?\d{2}(?:[^0-9]{1,6})?){1,6})/g;
    let cm: RegExpExecArray | null;
    while ((cm = cnaeRe.exec(mapped.text)) !== null) {
      const codes = Array.from(cm[1].matchAll(/(\d{4}) ?(\d) ?(\d{2})/g)).map((x) => `${x[1]}${x[2]}${x[3]}`);
      if (codes.length === 0) continue;
      const pos = toOriginal(cm.index, cm[0].length);
      push(
        {
          category: "CNAE",
          ruleId: "cnae",
          description: `Menciona CNAE: ${codes.map(formatCnae).join(", ")}`,
          supportingText: sentenceAround(source.text, pos.start, pos.end),
          sourceRef: source.ref,
          attributes: { codes, confidence: 0.85, page: source.page ?? null },
          verification: "VERIFIED",
        },
        `cnae|${codes.sort().join(",")}`,
      );
    }

    for (const tech of TECH_PATTERNS) {
      const m = tech.re.exec(mapped.text);
      if (m) {
        const pos = toOriginal(m.index, m[0].length);
        push(
          {
            category: "PLATFORM",
            ruleId: "tecnologia",
            description: `Tecnologia/plataforma mencionada: ${tech.label}`,
            supportingText: sentenceAround(source.text, pos.start, pos.end),
            sourceRef: source.ref,
            attributes: { technology: tech.label, confidence: 0.6, page: source.page ?? null },
            verification: "VERIFIED",
          },
          `tech|${tech.label}`,
        );
      }
    }
  }
  return out;
}

export function formatCnae(code: string): string {
  const d = onlyDigits(code).padEnd(7, "0");
  return `${d.slice(0, 4)}-${d.slice(4, 5)}/${d.slice(5, 7)}`;
}

// ---------------------------------------------------------------- evidence validation (AI output)

export interface ValidationResult {
  verification: "VERIFIED" | "UNVERIFIED";
  reason: string | null;
}

/**
 * A requirement proposed by an AI model is only presented as fact when its supporting quote is found
 * verbatim (modulo accents, case, punctuation, whitespace) in the referenced source text, and every
 * number/date it states also appears in that quote. Otherwise it is kept as UNVERIFIED.
 */
export function validateRequirementEvidence(
  req: { description: string; supportingText: string | null; sourceRef: string },
  sources: Map<string, string>,
): ValidationResult {
  const sourceText = sources.get(req.sourceRef);
  if (!sourceText) return { verification: "UNVERIFIED", reason: "Fonte referenciada não encontrada" };
  const quote = req.supportingText ?? "";
  const parts = quote
    .split(/…|\.\.\./)
    .map((p) => normalizeText(p))
    .filter((p) => p.length > 0);
  const quoteNormalized = parts.join(" ");
  if (quoteNormalized.length < 15) return { verification: "UNVERIFIED", reason: "Citação ausente ou curta demais" };
  const haystack = normalizeText(sourceText);
  for (const part of parts) {
    if (part.length >= 6 && !haystack.includes(part)) {
      return { verification: "UNVERIFIED", reason: "Citação não encontrada no texto da fonte" };
    }
  }
  const numbersInDescription = normalizeText(req.description).match(/\d+/g) ?? [];
  const paddedQuote = ` ${quoteNormalized} `;
  for (const n of numbersInDescription) {
    if (!paddedQuote.includes(` ${n} `)) {
      return { verification: "UNVERIFIED", reason: `Valor "${n}" não aparece na citação` };
    }
  }
  return { verification: "VERIFIED", reason: null };
}
