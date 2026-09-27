import { normalizeText, onlyDigits } from "@/lib/text";
import { daysUntil } from "@/lib/dates";
import {
  combineStrengths,
  compileTerms,
  findHits,
  keywordOverlap,
  prepareTexts,
  strengthFromHits,
  totalWeight,
  type CompiledTerm,
} from "./text-match";
import { formatCnae } from "./requirements";
import type {
  ActivityMatch,
  AttentionItem,
  CapabilityMatch,
  CompatibilityStatus,
  Dimension,
  DimensionScore,
  EvidenceMatch,
  GapItem,
  MatchResult,
  OpportunityInput,
  ProfileSnapshot,
  TermHit,
} from "./types";

export const ENGINE_VERSION = "match-v1";

const LEVEL_FACTOR = { CORE: 1, SECONDARY: 0.65, EXPLORATORY: 0.35 } as const;

const DOC_LABEL: Record<string, string> = {
  CNPJ_CARD: "Cartão CNPJ",
  CCMEI: "CCMEI",
  SICAF: "SICAF",
  CERTIDAO_FEDERAL: "Certidão federal (Receita/PGFN)",
  CERTIDAO_ESTADUAL: "Certidão estadual",
  CERTIDAO_MUNICIPAL: "Certidão municipal",
  CERTIDAO_FGTS: "Certidão FGTS",
  CERTIDAO_TRABALHISTA: "Certidão trabalhista (CNDT)",
  CERTIDAO_FALENCIA: "Certidão de falência/recuperação",
};

/** Compiled per-profile matchers are cached by profile version. */
const compiledCache = new Map<string, CompiledProfile>();

interface CompiledProfile {
  capabilities: { cap: ProfileSnapshot["capabilities"][number]; terms: CompiledTerm[] }[];
  activities: { act: ProfileSnapshot["activities"][number]; terms: CompiledTerm[] }[];
  negative: { spec: ProfileSnapshot["negativeTerms"][number]; term: CompiledTerm }[];
}

function compileProfile(profile: ProfileSnapshot): CompiledProfile {
  const key = `${profile.profileId}:${profile.version}`;
  const cached = compiledCache.get(key);
  if (cached) return cached;
  const compiled: CompiledProfile = {
    capabilities: profile.capabilities.map((cap) => ({ cap, terms: compileTerms(cap.terms) })),
    activities: profile.activities.map((act) => ({
      act,
      terms: compileTerms(
        act.keywords.map((k) => ({ term: k, weight: 1, caseSensitive: /^[A-Z0-9]{2,4}$/.test(k.trim()) })),
      ),
    })),
    negative: profile.negativeTerms
      .map((spec) => ({ spec, term: compileTerms([spec])[0] }))
      .filter((n): n is { spec: ProfileSnapshot["negativeTerms"][number]; term: CompiledTerm } => !!n.term),
  };
  if (compiledCache.size > 200) compiledCache.clear();
  compiledCache.set(key, compiled);
  return compiled;
}

export function profileCompleteness(profile: ProfileSnapshot): { value: number; missing: string[] } {
  const checks: [boolean, string][] = [
    [!!profile.legalName, "Razão social"],
    [!!profile.cnpj, "CNPJ"],
    [profile.activities.length > 0, profile.kind === "MEI" ? "CNAEs / ocupações MEI" : "CNAEs"],
    [profile.capabilities.length > 0, "Capacidades de serviço"],
    [profile.nationwide || profile.preferredStates.length > 0, "Abrangência geográfica"],
    [profile.maxProjectValue != null || profile.minProjectValue != null, "Faixa de valor por projeto"],
    [!!profile.sicafStatus, "Situação no SICAF"],
    [profile.documents.length > 0, "Documentos no cofre"],
  ];
  if (profile.kind === "COMPANY") checks.push([profile.evidence.length > 0, "Evidências técnicas (atestados/cases)"]);
  const missing = checks.filter(([ok]) => !ok).map(([, label]) => label);
  return { value: (checks.length - missing.length) / checks.length, missing };
}

function dim(dimension: Dimension, weight: number, value: number | null, note: string): DimensionScore {
  const effective = value == null ? 0.5 : Math.max(0, Math.min(1, value));
  return { dimension, weight, value: value == null ? null : Math.round(effective * 100) / 100, points: weight * effective, note };
}

function statusFromScore(score: number, t: ProfileSnapshot["scoring"]["thresholds"]): CompatibilityStatus {
  if (score >= t.high) return "HIGH_COMPATIBILITY";
  if (score >= t.medium) return "MEDIUM_COMPATIBILITY";
  if (score >= t.low) return "LOW_COMPATIBILITY";
  return "LIKELY_INCOMPATIBLE";
}

export function matchOpportunity(opportunity: OpportunityInput, profile: ProfileSnapshot, now: Date = new Date()): MatchResult {
  const compiled = compileProfile(profile);
  const weights = profile.scoring.weights;
  const attention: AttentionItem[] = [];
  const blockers: AttentionItem[] = [];
  const gaps: GapItem[] = [];
  const riskFlags: AttentionItem[] = [];
  const missingInformation: string[] = [];
  const confidenceFactors: string[] = [];
  let confidence = 1;

  const completeness = profileCompleteness(profile);
  if (completeness.value < 1) {
    missingInformation.push(`Perfil incompleto: ${completeness.missing.join(", ")}`);
  }
  if (completeness.value < 0.6) {
    confidence -= 0.3;
    confidenceFactors.push("Perfil com poucas informações cadastradas");
  }

  const texts = prepareTexts({
    object: opportunity.objectDescription,
    complementary: opportunity.complementaryInfo,
    extra: opportunity.extraText,
  });
  const verifiedRequirements = opportunity.requirements.filter((r) => r.verification === "VERIFIED");

  // ---------------------------------------------------------- service capabilities
  const serviceMatches: CapabilityMatch[] = [];
  for (const { cap, terms } of compiled.capabilities) {
    const hits = findHits(terms, texts);
    if (hits.length > 0) {
      serviceMatches.push({
        capabilityId: cap.id,
        name: cap.name,
        category: cap.category,
        level: cap.level,
        strength: Math.round(strengthFromHits(hits) * 100) / 100,
        hits,
      });
    }
  }
  serviceMatches.sort((a, b) => b.strength - a.strength);
  const positiveWeight = serviceMatches.reduce((acc, m) => acc + totalWeight(m.hits), 0);

  // ---------------------------------------------------------- negative signals
  const negativeHits: TermHit[] = [];
  let excludeWeight = 0;
  let penalty = 0;
  for (const { spec, term } of compiled.negative) {
    const hits = findHits([term], texts);
    if (hits.length === 0) continue;
    negativeHits.push(...hits);
    const w = Math.max(...hits.map((h) => h.weight));
    if (spec.effect === "EXCLUDE") excludeWeight += w;
    else penalty += 0.15 * w;
  }
  const excluded = excludeWeight > 0 && excludeWeight >= positiveWeight;
  let serviceValue = combineStrengths(serviceMatches.map((m) => m.strength));
  if (negativeHits.length > 0 && !excluded) {
    serviceValue *= Math.max(0.3, 1 - Math.min(0.6, penalty + (excludeWeight > 0 ? 0.25 : 0)));
    riskFlags.push({
      code: "NEGATIVE_SIGNALS",
      message: `Objeto também menciona itens fora do perfil (${Array.from(new Set(negativeHits.map((h) => h.term))).join(", ")}) — verificar escopo`,
      supportingText: negativeHits[0]?.snippet,
    });
  }

  // ---------------------------------------------------------- activities / CNAE
  const activityMatches: ActivityMatch[] = [];
  for (const { act, terms } of compiled.activities) {
    const hits = findHits(terms, texts);
    if (hits.length > 0) {
      activityMatches.push({
        activityId: act.id,
        type: act.type,
        code: act.code,
        description: act.description,
        strength: Math.round(strengthFromHits(hits) * 100) / 100,
        hits,
      });
    }
  }
  activityMatches.sort((a, b) => b.strength - a.strength);
  const hasActivities = profile.activities.length > 0;
  let activityValue: number | null = hasActivities ? combineStrengths(activityMatches.map((a) => a.strength)) : null;
  if (!hasActivities) {
    confidence -= 0.15;
    confidenceFactors.push("CNAEs/atividades não cadastrados — compatibilidade de atividade desconhecida");
  }

  const profileCodes = new Set(profile.activities.map((a) => onlyDigits(a.code)).filter((c) => c.length >= 4));
  for (const req of verifiedRequirements.filter((r) => r.category === "CNAE")) {
    const codes = ((req.attributes.codes as string[] | undefined) ?? []).map(onlyDigits);
    if (codes.length === 0) continue;
    if (profileCodes.size === 0) {
      missingInformation.push(`Edital menciona CNAE ${codes.map(formatCnae).join(", ")} — CNAEs do perfil não cadastrados`);
      continue;
    }
    const matched = codes.some((c) => profileCodes.has(c) || Array.from(profileCodes).some((p) => p.slice(0, 5) === c.slice(0, 5)));
    if (matched) {
      activityValue = Math.max(activityValue ?? 0, 1);
    } else {
      const gap: GapItem = {
        code: "POTENTIAL_CNAE_ACTIVITY_MISMATCH",
        required: `CNAE ${codes.map(formatCnae).join(", ")}`,
        profileEvidence: `CNAEs do perfil: ${Array.from(profileCodes).map(formatCnae).join(", ")}`,
        result: "POSSÍVEL INCOMPATIBILIDADE DE CNAE / ATIVIDADE",
        supportingText: req.supportingText,
        sourceRef: req.sourceRef,
      };
      gaps.push(gap);
      blockers.push({ code: "CNAE_MISMATCH", message: `CNAE mencionado (${gap.required}) não consta no perfil`, supportingText: req.supportingText, sourceRef: req.sourceRef });
    }
  }

  // ---------------------------------------------------------- technical capacity
  let technicalValue: number;
  if (serviceMatches.length > 0) {
    technicalValue = combineStrengths(serviceMatches.map((m) => m.strength * LEVEL_FACTOR[m.level]));
  } else if (profile.kind === "MEI" && activityMatches.length > 0) {
    technicalValue = combineStrengths(activityMatches.map((a) => a.strength));
  } else {
    technicalValue = 0;
  }

  // ---------------------------------------------------------- technical evidence
  const matchedLabels = [
    ...serviceMatches.flatMap((m) => [m.name, m.category, ...m.hits.map((h) => h.term)]),
    ...activityMatches.map((a) => a.description),
  ];
  const opportunityText = texts.map((t) => t.original).join(" \n ");
  const evidenceMatches: EvidenceMatch[] = [];
  for (const ev of profile.evidence) {
    const matchedOn = new Set<string>();
    for (const c of ev.capabilities) {
      for (const label of matchedLabels) if (keywordOverlap(c, label)) matchedOn.add(c);
      if (normalizeText(c).length >= 4 && normalizeText(opportunityText).includes(normalizeText(c))) matchedOn.add(c);
    }
    if (matchedOn.size > 0) {
      evidenceMatches.push({ evidenceId: ev.id, title: ev.title, type: ev.type, documentId: ev.documentId, matchedOn: Array.from(matchedOn) });
    }
  }
  const evidenceValue = evidenceMatches.length === 0 ? 0 : Math.min(1, 0.5 * evidenceMatches.length);

  const requiresAtestado = verifiedRequirements.filter(
    (r) => r.category === "TECHNICAL_QUALIFICATION" || r.category === "PREVIOUS_EXPERIENCE",
  );
  if (requiresAtestado.length > 0) {
    const r = requiresAtestado[0];
    attention.push({ code: "REQUIRES_TECHNICAL_CAPACITY", message: "Exige comprovação de capacidade técnica / experiência", supportingText: r.supportingText, sourceRef: r.sourceRef });
    const atestados = evidenceMatches.filter((e) => e.type === "ATESTADO_CAPACIDADE_TECNICA" || e.type === "CONTRACT");
    if (atestados.length === 0) {
      gaps.push({
        code: "POTENTIAL_TECHNICAL_QUALIFICATION_GAP",
        required: r.description,
        profileEvidence: "Nenhum atestado/contrato compatível encontrado no cofre",
        result: "POSSÍVEL LACUNA DE QUALIFICAÇÃO TÉCNICA",
        supportingText: r.supportingText,
        sourceRef: r.sourceRef,
      });
    }
  }

  // ---------------------------------------------------------- certifications
  const profileCertTexts = [
    ...profile.evidence.filter((e) => e.type === "CERTIFICATION").flatMap((e) => [e.title, ...e.capabilities]),
    ...profile.documents.filter((d) => d.category === "PROFESSIONAL_CERTIFICATION" || d.category === "TEAM_QUALIFICATION").map((d) => d.title),
  ].map(normalizeText);
  for (const req of verifiedRequirements.filter((r) => r.category === "CERTIFICATE")) {
    const cert = String(req.attributes.certification ?? "");
    const certKey = normalizeText(cert);
    const has = profileCertTexts.some((t) => t.includes(certKey));
    if (!has) {
      gaps.push({
        code: "POTENTIAL_CERTIFICATION_GAP",
        required: cert,
        profileEvidence: "Certificação não encontrada no cofre/evidências do perfil",
        result: "POSSÍVEL LACUNA DOCUMENTAL",
        supportingText: req.supportingText,
        sourceRef: req.sourceRef,
      });
      blockers.push({ code: "CERTIFICATION_GAP", message: `Menciona certificação ${cert} — não encontrada no perfil`, supportingText: req.supportingText, sourceRef: req.sourceRef });
    }
  }

  // ---------------------------------------------------------- other requirement-derived signals
  for (const req of verifiedRequirements) {
    if (req.category === "FINANCIAL") {
      if (!attention.some((a) => a.code === "FINANCIAL_QUALIFICATION")) {
        attention.push({ code: "FINANCIAL_QUALIFICATION", message: "Qualificação econômico-financeira deve ser verificada", supportingText: req.supportingText, sourceRef: req.sourceRef });
      }
    } else if (req.category === "SITE_VISIT" && req.attributes.mandatory === true) {
      attention.push({ code: "SITE_VISIT", message: "Visita técnica obrigatória", supportingText: req.supportingText, sourceRef: req.sourceRef });
    } else if (req.category === "PROFESSIONAL_QUALIFICATION") {
      if (!attention.some((a) => a.code === "PROFESSIONAL_QUALIFICATION")) {
        attention.push({ code: "PROFESSIONAL_QUALIFICATION", message: "Exige qualificação/registro profissional", supportingText: req.supportingText, sourceRef: req.sourceRef });
      }
    } else if (req.category === "GEOGRAPHIC") {
      riskFlags.push({ code: "LOCAL_PRESENCE", message: "Possível exigência de presença/sede local", supportingText: req.supportingText, sourceRef: req.sourceRef });
    }
  }

  // ---------------------------------------------------------- ME/EPP
  if (opportunity.exclusiveMeEpp === true) {
    if (profile.isMeEpp === false) {
      blockers.push({ code: "ME_EPP_EXCLUSIVE", message: "Participação exclusiva ME/EPP — perfil configurado como não ME/EPP" });
    } else if (profile.isMeEpp == null) {
      attention.push({ code: "ME_EPP_EXCLUSIVE", message: "Participação exclusiva ME/EPP — confirmar enquadramento do perfil" });
    }
  }

  // ---------------------------------------------------------- economic viability
  let economicValue: number | null;
  const value = opportunity.estimatedValue && opportunity.estimatedValue > 0 ? opportunity.estimatedValue : null;
  if (value == null) {
    economicValue = null;
    missingInformation.push("Valor estimado não informado ou sigiloso");
    confidence -= 0.1;
  } else if (profile.minProjectValue == null && profile.maxProjectValue == null) {
    economicValue = 0.7;
  } else if (profile.maxProjectValue != null && value > profile.maxProjectValue) {
    economicValue = 0.1;
    const msg = `Valor estimado acima do máximo configurado para o perfil`;
    if (profile.kind === "MEI") blockers.push({ code: "VALUE_ABOVE_LIMIT", message: msg });
    else attention.push({ code: "VALUE_ABOVE_LIMIT", message: msg });
  } else if (profile.minProjectValue != null && value < profile.minProjectValue) {
    economicValue = 0.3;
    attention.push({ code: "VALUE_BELOW_MIN", message: "Valor estimado abaixo do mínimo configurado para o perfil" });
  } else {
    economicValue = 1;
  }

  // ---------------------------------------------------------- time
  let timeValue: number | null;
  const days = opportunity.proposalDeadline ? daysUntil(opportunity.proposalDeadline, now) : null;
  if (opportunity.kind === "FUTURE_PROCUREMENT") {
    timeValue = 1;
  } else if (days == null) {
    timeValue = null;
    missingInformation.push("Prazo de proposta não informado pela fonte");
    confidence -= 0.05;
  } else if (days < 0) {
    timeValue = 0;
    riskFlags.push({ code: "DEADLINE_PASSED", message: "Prazo de proposta encerrado" });
  } else {
    timeValue = days < 3 ? 0.1 : days < 7 ? 0.4 : days < 15 ? 0.7 : 1;
    if (days < 15) attention.push({ code: "DEADLINE", message: days === 0 ? "Prazo encerra hoje" : `Prazo em ${days} dia${days === 1 ? "" : "s"}` });
  }

  // ---------------------------------------------------------- geography
  let geoValue: number | null;
  if (profile.nationwide) geoValue = 1;
  else if (!opportunity.state) geoValue = null;
  else if (profile.preferredStates.includes(opportunity.state)) geoValue = 1;
  else if (profile.preferredStates.length === 0) geoValue = null;
  else if (profile.restrictToPreferredStates) {
    geoValue = 0;
    attention.push({ code: "OUT_OF_REGION", message: `Fora da área de atuação configurada (${opportunity.state})` });
  } else geoValue = 0.5;

  // ---------------------------------------------------------- documentation readiness
  const referenceDate = opportunity.proposalDeadline ?? now;
  const essential = profile.scoring.essentialDocuments;
  const missingDocs: string[] = [];
  const expiredDocs: string[] = [];
  for (const category of essential) {
    const docs = profile.documents.filter((d) => d.category === category);
    if (docs.length === 0) missingDocs.push(DOC_LABEL[category] ?? category);
    else if (docs.every((d) => d.expiresOn != null && new Date(`${d.expiresOn}T23:59:59-03:00`) < referenceDate)) {
      expiredDocs.push(DOC_LABEL[category] ?? category);
    }
  }
  const docValue = essential.length === 0 ? null : (essential.length - missingDocs.length - expiredDocs.length) / essential.length;
  if (expiredDocs.length > 0) {
    gaps.push({
      code: "POTENTIAL_DOCUMENTATION_GAP",
      required: expiredDocs.join(", "),
      profileEvidence: "Documento vencido (ou vencerá até o prazo da proposta)",
      result: "POSSÍVEL LACUNA DOCUMENTAL",
    });
  }
  if (missingDocs.length > 0) {
    missingInformation.push(`Documentos essenciais não cadastrados no cofre: ${missingDocs.join(", ")}`);
  }

  // ---------------------------------------------------------- strategic / innovation
  let strategicValue = 0.3;
  if (["CPSI", "ETEC", "COMPETITIVE_DIALOGUE"].includes(opportunity.innovationClass)) strategicValue = 1;
  else if (serviceMatches.some((m) => profile.capabilities.find((c) => c.id === m.capabilityId)?.strategic)) strategicValue = 0.8;
  else if (opportunity.innovationClass === "INNOVATION_MENTION") strategicValue = 0.6;

  // ---------------------------------------------------------- score
  const dimensions: DimensionScore[] = [
    dim("service", weights.service, serviceMatches.length > 0 || profile.capabilities.length > 0 ? serviceValue : null, serviceMatches.length > 0 ? `${serviceMatches.length} capacidade(s) encontrada(s)` : "Nenhuma capacidade encontrada"),
    dim("activity", weights.activity, activityValue, activityValue == null ? "Atividades/CNAEs do perfil não cadastrados" : activityMatches.length > 0 ? `${activityMatches.length} atividade(s) compatível(is)` : "Nenhuma atividade cadastrada corresponde ao objeto"),
    dim("technicalCapacity", weights.technicalCapacity, technicalValue, "Nível das capacidades encontradas"),
    dim("evidence", weights.evidence, evidenceValue, evidenceMatches.length > 0 ? `${evidenceMatches.length} evidência(s) possivelmente relacionada(s)` : "Sem evidência técnica relacionada"),
    dim("economic", weights.economic, economicValue, value == null ? "Valor desconhecido" : "Valor vs faixa configurada"),
    dim("time", weights.time, timeValue, days == null ? "Prazo desconhecido" : `${days} dia(s) até o prazo`),
    dim("geographic", weights.geographic, geoValue, opportunity.state ? `UF ${opportunity.state}` : "UF desconhecida"),
    dim("documentation", weights.documentation, docValue, `${missingDocs.length} ausente(s), ${expiredDocs.length} vencido(s)`),
    dim("strategic", weights.strategic, strategicValue, opportunity.innovationClass !== "NONE" ? "Caráter de inovação" : "Valor estratégico"),
  ];
  const totalW = dimensions.reduce((a, d) => a + d.weight, 0) || 1;
  const rawScore = Math.round((dimensions.reduce((a, d) => a + d.points, 0) / totalW) * 100);

  let cap: { value: number; reason: string } | null = null;
  const applyCap = (value: number, reason: string) => {
    if (!cap || value < cap.value) cap = { value, reason };
  };

  const hasServiceSignal = serviceMatches.length > 0;
  const hasActivitySignal = activityMatches.length > 0;
  const relevant = hasServiceSignal || hasActivitySignal;
  const opportunityThin = normalizeText(opportunity.objectDescription).length < 20;

  if (!relevant) applyCap(20, "Nenhuma capacidade ou atividade do perfil encontrada no objeto");
  if (excluded) applyCap(25, "Sinais negativos dominam (ex.: licenças, revenda, hardware) — não é prestação de serviço do perfil");

  const activityMismatch = profile.kind === "MEI" && hasActivities && !hasActivitySignal;
  if (activityMismatch) {
    applyCap(34, "Objeto não corresponde às atividades/ocupações registradas do MEI");
    gaps.push({
      code: "POTENTIAL_CNAE_ACTIVITY_MISMATCH",
      required: "Objeto da contratação",
      profileEvidence: `Atividades do MEI: ${profile.activities.map((a) => a.description).join("; ")}`,
      result: "POSSÍVEL INCOMPATIBILIDADE DE CNAE / ATIVIDADE",
    });
  }
  if (profile.kind === "COMPANY" && hasActivities && !hasActivitySignal && hasServiceSignal) {
    attention.push({ code: "ACTIVITY_NOT_MATCHED", message: "Nenhum CNAE cadastrado corresponde diretamente ao objeto — verificar objeto social" });
  }

  const cappedScore = cap ? Math.min(rawScore, (cap as { value: number }).value) : rawScore;
  let status: CompatibilityStatus;
  const meiWithoutActivities = profile.kind === "MEI" && !hasActivities;
  const companyWithoutCapabilities = profile.kind === "COMPANY" && profile.capabilities.length === 0;

  if (meiWithoutActivities || companyWithoutCapabilities) {
    status = "INSUFFICIENT_INFORMATION";
  } else if (opportunityThin) {
    status = "INSUFFICIENT_INFORMATION";
    missingInformation.push("Objeto da contratação sem descrição suficiente");
  } else if (excluded) {
    status = "LIKELY_INCOMPATIBLE";
  } else if (activityMismatch) {
    status = hasServiceSignal ? "REQUIRES_REVIEW" : "LIKELY_INCOMPATIBLE";
  } else {
    status = statusFromScore(cappedScore, profile.scoring.thresholds);
    if (blockers.length > 0 && cappedScore >= profile.scoring.thresholds.low) status = "REQUIRES_REVIEW";
  }

  if (verifiedRequirements.length === 0) {
    confidence -= 0.15;
    confidenceFactors.push("Requisitos não extraídos de documentos (apenas metadados)");
  }
  const confidenceLabel = confidence >= 0.75 ? "HIGH" : confidence >= 0.5 ? "MEDIUM" : "LOW";

  const result: MatchResult = {
    status,
    score: cappedScore,
    confidence: confidenceLabel,
    relevant,
    profileIncomplete: completeness.value < 1,
    profileCompleteness: Math.round(completeness.value * 100) / 100,
    breakdown: { dimensions, rawScore, cap, confidenceFactors },
    serviceMatches,
    activityMatches,
    evidenceMatches,
    negativeHits,
    attention,
    blockers,
    gaps,
    missingInformation,
    riskFlags,
    explanation: "",
  };
  result.explanation = buildExplanation(result, profile);
  return result;
}

const STATUS_TEXT: Record<CompatibilityStatus, string> = {
  HIGH_COMPATIBILITY: "Alta compatibilidade",
  MEDIUM_COMPATIBILITY: "Compatibilidade média",
  LOW_COMPATIBILITY: "Baixa compatibilidade",
  REQUIRES_REVIEW: "Requer revisão humana",
  LIKELY_INCOMPATIBLE: "Provavelmente incompatível",
  INSUFFICIENT_INFORMATION: "Informação insuficiente",
};

export function buildExplanation(r: MatchResult, profile: ProfileSnapshot): string {
  const lines: string[] = [];
  lines.push(`${profile.displayName.toUpperCase()} — ${r.score}/100 — ${STATUS_TEXT[r.status]} (análise automática)`);
  if (r.serviceMatches.length > 0) {
    lines.push("Correspondências fortes:");
    for (const m of r.serviceMatches.slice(0, 6)) lines.push(`✓ ${m.name} (${m.hits.map((h) => h.term).slice(0, 3).join(", ")})`);
  }
  if (r.activityMatches.length > 0) {
    for (const a of r.activityMatches.slice(0, 3)) lines.push(`✓ Atividade: ${a.code ? `${a.code} — ` : ""}${a.description}`);
  }
  if (r.evidenceMatches.length > 0) {
    lines.push("Possível evidência de apoio encontrada:");
    for (const e of r.evidenceMatches.slice(0, 3)) lines.push(`• ${e.title}`);
  }
  if (r.attention.length > 0 || r.riskFlags.length > 0) {
    lines.push("Atenção:");
    for (const a of [...r.attention, ...r.riskFlags]) lines.push(`! ${a.message}`);
  }
  lines.push("Bloqueios potenciais:");
  if (r.blockers.length === 0) lines.push("Nenhum detectado automaticamente");
  for (const b of r.blockers) lines.push(`✕ ${b.message}`);
  for (const g of r.gaps) lines.push(`△ ${g.result}: ${g.required}`);
  if (r.breakdown.cap) lines.push(`Score limitado a ${r.breakdown.cap.value}: ${r.breakdown.cap.reason}`);
  if (r.profileIncomplete) lines.push("PERFIL INCOMPLETO — confiança reduzida.");
  lines.push("Revisão humana necessária. Esta análise não constitui parecer jurídico nem conclusão de habilitação.");
  return lines.join("\n");
}
