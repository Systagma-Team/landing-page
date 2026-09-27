import { excerpt, normalizeWithMap } from "@/lib/text";
import type { InnovationClass, OpportunityKind } from "./types";

/** PNCP modality codes (Manual API Consultas, tabela de domínio "Modalidade de Contratação"). */
export const PNCP_MODALITIES: Record<number, string> = {
  1: "Leilão - Eletrônico",
  2: "Diálogo Competitivo",
  3: "Concurso",
  4: "Concorrência - Eletrônica",
  5: "Concorrência - Presencial",
  6: "Pregão - Eletrônico",
  7: "Pregão - Presencial",
  8: "Dispensa",
  9: "Inexigibilidade",
  10: "Manifestação de Interesse",
  11: "Pré-qualificação",
  12: "Credenciamento",
  13: "Leilão - Presencial",
};

export function kindFromModality(code: number | null | undefined): OpportunityKind {
  if (code === 8 || code === 9) return "DIRECT_PROCUREMENT";
  // Auctions sell public assets; they are not purchase opportunities.
  if (code === 1 || code === 13) return "OTHER";
  if (code == null) return "OTHER";
  return "ACTIVE_TENDER";
}

/** PNCP "Situação da Contratação": 1 Divulgada, 2 Revogada, 3 Anulada, 4 Suspensa. */
export function statusFromSituation(id: number | null | undefined): "PUBLISHED" | "SUSPENDED" | "CANCELLED" | "UNKNOWN" {
  switch (id) {
    case 1:
      return "PUBLISHED";
    case 2:
    case 3:
      return "CANCELLED";
    case 4:
      return "SUSPENDED";
    default:
      return "UNKNOWN";
  }
}

interface Pattern {
  re: RegExp;
}

function findFirst(text: string, patterns: Pattern[]): string | null {
  if (!text) return null;
  const mapped = normalizeWithMap(text);
  for (const p of patterns) {
    const m = p.re.exec(mapped.text);
    if (m) {
      const start = mapped.map[m.index] ?? 0;
      const end = (mapped.map[m.index + m[0].length - 1] ?? start) + 1;
      return excerpt(text, start, end, 90);
    }
  }
  return null;
}

const CPSI_LEGAL = [
  { re: /lei complementar (?:no? )?182(?: 2021)?/ },
  { re: /\blc 182\b/ },
  { re: /marco legal das startups/ },
];
const CPSI_TEXT = [
  { re: /contrato publico para solucao inovadora/ },
  { re: /(?<![a-z0-9])cpsi(?![a-z0-9])/ },
  { re: /licitacao especial para (?:o )?teste de solucoes inovadoras/ },
];
const ETEC_TEXT = [{ re: /encomendas? tecnologicas?/ }, { re: /(?<![a-z0-9])etec(?![a-z0-9])/ }];
const INNOVATION_TEXT = [
  { re: /solucao inovadora|solucoes inovadoras/ },
  { re: /desafio tecnologico|desafios tecnologicos/ },
  { re: /(?<![a-z0-9])startups?(?![a-z0-9])/ },
  { re: /inovacao tecnologica/ },
  { re: /transformacao digital/ },
  { re: /(?<![a-z0-9])inovacao(?![a-z0-9])/ },
];

export interface InnovationClassification {
  innovationClass: InnovationClass;
  evidence: string | null;
}

/**
 * Classifies innovation character from official data only.
 * CPSI requires an explicit legal-basis or instrument mention; a generic "inovação" is only a mention.
 */
export function classifyInnovation(input: {
  objectDescription: string;
  complementaryInfo?: string | null;
  legalBasisText?: string | null;
  modalityCode?: number | null;
}): InnovationClassification {
  const legal = input.legalBasisText ?? "";
  const text = [input.objectDescription, input.complementaryInfo ?? ""].join("\n");

  const legalHit = findFirst(legal, CPSI_LEGAL);
  if (legalHit) return { innovationClass: "CPSI", evidence: `Amparo legal: ${legalHit}` };
  const cpsiHit = findFirst(text, CPSI_TEXT) ?? findFirst(text, CPSI_LEGAL);
  if (cpsiHit) return { innovationClass: "CPSI", evidence: cpsiHit };
  const etecHit = findFirst(text, ETEC_TEXT) ?? findFirst(legal, ETEC_TEXT);
  if (etecHit) return { innovationClass: "ETEC", evidence: etecHit };
  if (input.modalityCode === 2) {
    return { innovationClass: "COMPETITIVE_DIALOGUE", evidence: "Modalidade: Diálogo Competitivo (Lei 14.133/2021, art. 32)" };
  }
  const mention = findFirst(text, INNOVATION_TEXT);
  if (mention) return { innovationClass: "INNOVATION_MENTION", evidence: mention };
  return { innovationClass: "NONE", evidence: null };
}

const ME_EPP_EXCLUSIVE = [
  { re: /exclusiv[ao]s? (?:para |a |as |de )?(?:participacao de )?(?:me|epp|mei|microempresas?|empresas de pequeno porte)(?![a-z0-9])/ },
  { re: /participacao exclusiva (?:de |para )?(?:me|epp|microempresas?)/ },
];

/** Returns true only with textual evidence; otherwise null (unknown), never false by inference. */
export function detectExclusiveMeEpp(texts: (string | null | undefined)[]): { value: boolean | null; evidence: string | null } {
  for (const t of texts) {
    if (!t) continue;
    const hit = findFirst(t, ME_EPP_EXCLUSIVE);
    if (hit) return { value: true, evidence: hit };
  }
  return { value: null, evidence: null };
}
