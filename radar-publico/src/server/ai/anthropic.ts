import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { ExtractionSchema, type AIProvider, type AIResult, type AISource, type Extraction } from "./types";

const SYSTEM = `Você extrai informações de documentos de contratações públicas brasileiras (Lei 14.133/2021) para uma equipe que decide, manualmente, se vale a pena participar.

Regras obrigatórias:
- Extraia apenas o que está escrito explicitamente nos textos fornecidos. Não deduza, não complete e não use conhecimento externo.
- Cada item precisa de "supporting_quote": um trecho copiado literalmente do texto (mesmas palavras e números), e de "source_ref": exatamente uma das referências fornecidas.
- Nunca invente prazos, valores, certificações, CNAEs, exigências de qualificação ou requisitos técnicos. Se algo não aparece no texto, deixe a lista vazia.
- Na "description" de um requisito, não inclua números, datas ou valores que não estejam no trecho citado.
- Use "page" = 0 quando a página não estiver indicada no texto.
- Não avalie elegibilidade ou habilitação da empresa; apenas descreva o que o texto exige.`;

function renderSources(title: string, sources: AISource[]): string {
  const parts = sources.map((s) => `<fonte ref="${s.ref}" descricao="${s.label.replace(/"/g, "'")}">\n${s.text}\n</fonte>`);
  return `Contratação: ${title}\n\nTextos oficiais disponíveis:\n\n${parts.join("\n\n")}\n\nExtraia objetivo, serviços exigidos, tecnologias, entregáveis, requisitos (qualificação técnica/profissional, certificações, econômico-financeiros, experiência, CNAE, visita técnica, consórcio, subcontratação, ME/EPP, prazos de execução, datas, integrações, plataformas, exigências geográficas) e riscos — sempre com citação literal.`;
}

/**
 * Anthropic provider. Only public procurement texts are sent (never vault documents).
 * Structured output is validated against the Zod schema by the SDK and again by the caller.
 */
export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  private readonly client: Anthropic;

  constructor(readonly model: string = process.env.AI_MODEL || "claude-opus-5") {
    // Credentials resolve from the environment (ANTHROPIC_API_KEY or other supported sources).
    this.client = new Anthropic({ maxRetries: 3, timeout: 10 * 60 * 1000 });
  }

  async extractRequirements(input: { title: string; sources: AISource[] }): Promise<AIResult<Extraction>> {
    try {
      const response = await this.client.beta.messages.parse({
        model: this.model,
        max_tokens: 16000,
        // On a policy refusal, the API retries on a fallback model inside the same call.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        thinking: { type: "adaptive" },
        system: SYSTEM,
        output_config: { format: betaZodOutputFormat(ExtractionSchema) },
        messages: [{ role: "user", content: renderSources(input.title, input.sources) }],
      });
      if (response.stop_reason === "refusal") {
        return { status: "REFUSED", error: `Recusado: ${response.stop_details?.category ?? "sem categoria"}`, model: response.model };
      }
      if (response.stop_reason === "max_tokens") {
        return { status: "TRUNCATED", error: "Resposta truncada (max_tokens)", model: response.model };
      }
      const parsed = response.parsed_output ? ExtractionSchema.safeParse(response.parsed_output) : null;
      if (!parsed?.success) return { status: "INVALID_OUTPUT", error: "Saída fora do esquema", model: response.model };
      return {
        status: "OK",
        output: parsed.data,
        model: response.model,
        usage: { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens },
      };
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError) return { status: "ERROR", error: "Credenciais da API de IA inválidas", model: this.model };
      if (err instanceof Anthropic.RateLimitError) return { status: "ERROR", error: "Limite de requisições da IA atingido", model: this.model };
      if (err instanceof Anthropic.BadRequestError) return { status: "ERROR", error: `Requisição rejeitada: ${err.message.slice(0, 300)}`, model: this.model };
      if (err instanceof Anthropic.APIError) return { status: "ERROR", error: `Erro da API (${err.status ?? "rede"}): ${err.message.slice(0, 300)}`, model: this.model };
      throw err;
    }
  }
}
