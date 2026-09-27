import { AnthropicProvider } from "./anthropic";
import { AIDisabledError, type AIProvider } from "./types";

let override: AIProvider | null | undefined;

/** AI_PROVIDER=anthropic enables analysis; anything else keeps it off (deterministic rules still run). */
export function getAIProvider(): AIProvider | null {
  if (override !== undefined) return override;
  return process.env.AI_PROVIDER === "anthropic" ? new AnthropicProvider() : null;
}

export function requireAIProvider(): AIProvider {
  const p = getAIProvider();
  if (!p) throw new AIDisabledError();
  return p;
}

/** Test hook. */
export function setAIProvider(provider: AIProvider | null | undefined): void {
  override = provider;
}
