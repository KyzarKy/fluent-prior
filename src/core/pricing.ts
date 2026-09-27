// Model list prices, and the cost of one call from the token counts the API reports.
// Prices in USD per million tokens, checked 2026-09-26. Recheck before relying on them.

export interface Prices {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

export const PRICES: Record<string, Prices> = {
  // Groq free tier with no payment method on the account (ADR 0004): over quota is a 429.
  "openai/gpt-oss-120b": { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  "claude-sonnet-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  "claude-haiku-4-5": { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
  "claude-opus-5": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
};

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

export function costUsd(model: string, usage: TokenUsage): number {
  const prices = PRICES[model];
  // An unpriced model would make every spend cap read zero, so fail loudly instead.
  if (!prices) throw new Error(`No price for model ${model}`);
  const perToken = (pricePerMillion: number) => pricePerMillion / 1_000_000;
  return (
    usage.input_tokens * perToken(prices.input) +
    usage.output_tokens * perToken(prices.output) +
    (usage.cache_read_input_tokens ?? 0) * perToken(prices.cacheRead) +
    (usage.cache_creation_input_tokens ?? 0) * perToken(prices.cacheWrite)
  );
}
