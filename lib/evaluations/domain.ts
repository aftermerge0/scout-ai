export type ResolvedEntity = {
  normalizedUrl: string | null;
  domain: string | null;
  companyName: string;
};

function titleCaseFromSlug(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function looksLikeBareDomain(value: string): boolean {
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(value);
}

export function resolveEntity(rawInput: string): ResolvedEntity {
  const trimmed = rawInput.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const domain = url.hostname.replace(/^www\./, "");
      return {
        normalizedUrl: `${url.protocol}//${domain}`,
        domain,
        companyName: titleCaseFromSlug(domain.split(".")[0] ?? domain),
      };
    } catch {
      // fall through to name-based handling below
    }
  }

  if (looksLikeBareDomain(trimmed)) {
    const domain = trimmed.replace(/^www\./, "").replace(/\/.*$/, "");
    return {
      normalizedUrl: `https://${domain}`,
      domain,
      companyName: titleCaseFromSlug(domain.split(".")[0] ?? domain),
    };
  }

  return {
    normalizedUrl: null,
    domain: null,
    companyName: trimmed,
  };
}
