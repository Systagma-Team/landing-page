import { describe, expect, it } from "vitest";
import { matchOpportunity } from "@/server/matching/engine";
import { extractRequirementsByRules, validateRequirementEvidence } from "@/server/matching/requirements";
import { classifyInnovation, detectExclusiveMeEpp } from "@/server/matching/classify";
import { meiSnapshot, opportunity, systagmaSnapshot } from "./helpers/profiles";

const STRONG_OBJECT =
  "Contratação de empresa especializada para desenvolvimento de sistemas web sob demanda, " +
  "incluindo integração de sistemas via APIs, sustentação de sistemas e manutenção evolutiva, " +
  "com painel gerencial em Power BI.";

describe("Systagma matching", () => {
  it("scenario 4: strong Software + Integration match gets a high, explained score", () => {
    const r = matchOpportunity(opportunity({ objectDescription: STRONG_OBJECT }), systagmaSnapshot());
    expect(r.status).toBe("HIGH_COMPATIBILITY");
    expect(r.score).toBeGreaterThanOrEqual(75);
    const names = r.serviceMatches.map((m) => m.name);
    expect(names).toEqual(expect.arrayContaining(["Software sob medida", "Integração de sistemas e APIs", "Sustentação e evolução de sistemas"]));
    expect(r.explanation).toContain("✓ Software sob medida");
    expect(r.explanation).toContain("Revisão humana necessária");
    expect(r.breakdown.dimensions).toHaveLength(9);
  });

  it("scenario 2: pure software licensing/resale is not a high Systagma match", () => {
    const r = matchOpportunity(
      opportunity({ objectDescription: "Aquisição de licenças de software Microsoft Office 365, licenças de uso por 12 meses, para a Secretaria de Administração." }),
      systagmaSnapshot(),
    );
    expect(r.status).not.toBe("HIGH_COMPATIBILITY");
    expect(["LIKELY_INCOMPATIBLE", "LOW_COMPATIBILITY"]).toContain(r.status);
    expect(r.score).toBeLessThan(35);
  });

  it("licensing that dominates weak service mentions is excluded", () => {
    const r = matchOpportunity(
      opportunity({ objectDescription: "Renovação de licenças de uso e subscrição de software de banco de dados com suporte a sistemas do fabricante." }),
      systagmaSnapshot(),
    );
    expect(r.status).toBe("LIKELY_INCOMPATIBLE");
    expect(r.breakdown.cap?.value).toBeLessThanOrEqual(25);
  });

  it("hardware purchase mentioning 'software' is not compatible", () => {
    const r = matchOpportunity(
      opportunity({ objectDescription: "Aquisição de computadores, notebooks e impressoras com software pré-instalado." }),
      systagmaSnapshot(),
    );
    expect(r.relevant).toBe(false);
    expect(r.status).toBe("LIKELY_INCOMPATIBLE");
  });

  it("scenario 5: required technical capacity certificate without evidence produces a gap warning", () => {
    const object = STRONG_OBJECT;
    const reqs = extractRequirementsByRules([
      { ref: "field:complementaryInfo", text: "A licitante deverá apresentar atestado de capacidade técnica compatível com o objeto." },
    ]);
    const r = matchOpportunity(opportunity({ objectDescription: object, requirements: reqs }), systagmaSnapshot());
    expect(r.gaps.map((g) => g.code)).toContain("POTENTIAL_TECHNICAL_QUALIFICATION_GAP");
    expect(r.attention.map((a) => a.code)).toContain("REQUIRES_TECHNICAL_CAPACITY");
  });

  it("matching evidence is suggested as possible support, not as satisfying the requirement", () => {
    const reqs = extractRequirementsByRules([{ ref: "field:complementaryInfo", text: "Exige-se atestado de capacidade técnica em Power BI." }]);
    const r = matchOpportunity(
      opportunity({ objectDescription: STRONG_OBJECT, requirements: reqs }),
      systagmaSnapshot({
        evidence: [{ id: "ev1", type: "ATESTADO_CAPACIDADE_TECNICA", title: "Atestado — Projeto X", issuer: "Órgão X", capabilities: ["Power BI", "integração de APIs", "dashboard"], documentId: "doc1" }],
      }),
    );
    expect(r.evidenceMatches).toHaveLength(1);
    expect(r.gaps.map((g) => g.code)).not.toContain("POTENTIAL_TECHNICAL_QUALIFICATION_GAP");
    expect(r.explanation).toContain("Possível evidência de apoio encontrada");
  });

  it("explicit certification absent from the profile is a deterministic documentation gap (not just lower similarity)", () => {
    const reqs = extractRequirementsByRules([{ ref: "field:complementaryInfo", text: "A contratada deverá possuir certificação ISO 27001 vigente." }]);
    const r = matchOpportunity(opportunity({ objectDescription: STRONG_OBJECT, requirements: reqs }), systagmaSnapshot());
    expect(r.gaps.map((g) => g.code)).toContain("POTENTIAL_CERTIFICATION_GAP");
    expect(r.status).toBe("REQUIRES_REVIEW");
  });

  it("never emits an ELIGIBLE status", () => {
    const r = matchOpportunity(opportunity({ objectDescription: STRONG_OBJECT }), systagmaSnapshot());
    expect(JSON.stringify(r)).not.toMatch(/"ELIGIBLE"/);
  });

  it("short acronyms only match as whole words", () => {
    const r = matchOpportunity(opportunity({ objectDescription: "Contratação de serviços de limpeza da secretaria e manutenção predial diária." }), systagmaSnapshot());
    expect(r.serviceMatches).toHaveLength(0);
  });
});

describe("MEI matching", () => {
  it("scenario 3: technology object not matching MEI registered activity → mismatch", () => {
    const r = matchOpportunity(opportunity({ objectDescription: STRONG_OBJECT, estimatedValue: 9000 }), meiSnapshot());
    expect(["LIKELY_INCOMPATIBLE", "REQUIRES_REVIEW"]).toContain(r.status);
    expect(r.gaps.map((g) => g.code)).toContain("POTENTIAL_CNAE_ACTIVITY_MISMATCH");
    expect(r.score).toBeLessThanOrEqual(34);
  });

  it("MEI without registered activities is INSUFFICIENT_INFORMATION with incomplete-profile notice", () => {
    const r = matchOpportunity(opportunity({ objectDescription: STRONG_OBJECT }), meiSnapshot({ activities: [], capabilities: [] }));
    expect(r.status).toBe("INSUFFICIENT_INFORMATION");
    expect(r.profileIncomplete).toBe(true);
    expect(r.explanation).toContain("PERFIL INCOMPLETO");
  });

  it("object matching the MEI occupation is compatible", () => {
    const r = matchOpportunity(
      opportunity({ objectDescription: "Contratação de serviços de fotografia para cobertura fotográfica dos eventos da Secretaria de Cultura.", estimatedValue: 8000 }),
      meiSnapshot(),
    );
    expect(r.activityMatches.length).toBeGreaterThan(0);
    expect(["HIGH_COMPATIBILITY", "MEDIUM_COMPATIBILITY"]).toContain(r.status);
  });

  it("value above the configured MEI limit is a potential blocker", () => {
    const r = matchOpportunity(
      opportunity({ objectDescription: "Contratação de serviços de fotografia para cobertura fotográfica de eventos.", estimatedValue: 90000 }),
      meiSnapshot(),
    );
    expect(r.blockers.map((b) => b.code)).toContain("VALUE_ABOVE_LIMIT");
    expect(r.status).not.toBe("HIGH_COMPATIBILITY");
  });
});

describe("requirement extraction and AI evidence validation", () => {
  const edital =
    "7.1. A licitante deverá apresentar atestado de capacidade técnica. 7.2. A visita técnica é obrigatória e deverá ocorrer até 10/10/2026. " +
    "7.3. É vedada a participação de empresas reunidas em consórcio. 7.4. Prazo de execução de 12 (doze) meses. CNAE 6201-5/01.";

  it("extracts deterministic requirements with verbatim supporting text", () => {
    const reqs = extractRequirementsByRules([{ ref: "document:abc", text: edital, page: 3 }]);
    const byRule = Object.fromEntries(reqs.map((r) => [r.ruleId, r]));
    expect(byRule["atestado-capacidade-tecnica"].supportingText).toContain("atestado de capacidade técnica");
    expect(byRule["visita-tecnica"].attributes.mandatory).toBe(true);
    expect(byRule["consorcio"].attributes.allowed).toBe(false);
    expect(byRule["prazo-execucao"].attributes).toMatchObject({ amount: 12, unit: "meses" });
    expect(byRule["cnae"].attributes.codes).toEqual(["6201501"]);
    for (const r of reqs) expect(edital).toContain(r.supportingText!.slice(0, 20));
  });

  it("scenario 6: an AI-invented requirement is not verified", () => {
    const sources = new Map([["document:abc", edital]]);
    const invented = validateRequirementEvidence(
      { description: "Exige certificação ISO 9001", supportingText: "A licitante deverá possuir certificação ISO 9001 vigente.", sourceRef: "document:abc" },
      sources,
    );
    expect(invented.verification).toBe("UNVERIFIED");

    const wrongNumber = validateRequirementEvidence(
      { description: "Prazo de execução de 24 meses", supportingText: "Prazo de execução de 12 (doze) meses.", sourceRef: "document:abc" },
      sources,
    );
    expect(wrongNumber.verification).toBe("UNVERIFIED");

    const genuine = validateRequirementEvidence(
      { description: "Prazo de execução de 12 meses", supportingText: "prazo de execução de 12 (doze) meses", sourceRef: "document:abc" },
      sources,
    );
    expect(genuine.verification).toBe("VERIFIED");
  });
});

describe("classification", () => {
  it("does not label CPSI just because the text says 'inovação'", () => {
    expect(classifyInnovation({ objectDescription: "Aquisição de mobiliário para o laboratório de inovação." }).innovationClass).toBe("INNOVATION_MENTION");
    expect(
      classifyInnovation({ objectDescription: "Contrato Público para Solução Inovadora (CPSI) para triagem de documentos com IA." }).innovationClass,
    ).toBe("CPSI");
    expect(
      classifyInnovation({ objectDescription: "Teste de solução", legalBasisText: "Lei Complementar nº 182/2021, art. 13" }).innovationClass,
    ).toBe("CPSI");
    expect(classifyInnovation({ objectDescription: "Serviço de limpeza" }).innovationClass).toBe("NONE");
  });

  it("detects exclusive ME/EPP only with textual evidence", () => {
    expect(detectExclusiveMeEpp(["Licitação exclusiva para ME/EPP."]).value).toBe(true);
    expect(detectExclusiveMeEpp(["Pregão eletrônico para serviços de TI."]).value).toBeNull();
  });
});
