export type RelevanceFields = {
  url: string;
  title: string | null;
  snippet: string | null;
  domain: string | null;
};

export function companyTokens(companyName: string, domain: string | null): string[] {
  const tokens = new Set<string>();
  const base = companyName.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  for (const part of base.split(/\s+/)) {
    if (part.length >= 3) tokens.add(part);
  }
  if (domain) {
    const root = domain.split(".")[0]?.toLowerCase();
    if (root && root.length >= 3) tokens.add(root);
  }
  return Array.from(tokens);
}

export function mentionsCompany(text: string, tokens: string[]): boolean {
  const hay = text.toLowerCase();
  return tokens.some((t) => hay.includes(t));
}

/** Drop Exa false-positives (e.g. Verto/VLink when searching Vercel). */
export function isOnTopicResult(
  result: RelevanceFields,
  companyName: string,
  domain: string | null,
): boolean {
  const tokens = companyTokens(companyName, domain);
  if (tokens.length === 0) return true;
  const blob = `${result.url} ${result.title ?? ""} ${result.snippet ?? ""} ${result.domain ?? ""}`;
  return mentionsCompany(blob, tokens);
}
