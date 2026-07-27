/** Page-type heuristics shared by collectors + section agents. */

const LEADERSHIP_KEYWORD =
  /\b(founder|co-?founder|ceo|chief executive|founded by|key people)\b/gi;
const PRICING_KEYWORD =
  /\b(pricing|per\s+(seat|user|month)|\/mo\b|subscription|plan\s*s?\b|usage[- ]based|enterprise\s+pricing)\b/gi;
const SECURITY_KEYWORD =
  /\b(soc\s?2|iso\s?27001|hipaa|gdpr|trust\s*center|sso|scim|rbac|encryption|compliance|certification)\b/gi;
const COMPETITOR_KEYWORD =
  /\b(vs\.?|versus|alternative|competitor|compared\s+to|competitive)\b/gi;
const ENGINEERING_KEYWORD =
  /\b(api|sdk|openapi|changelog|status\s*page|uptime|release\s*notes|documentation|webhook)\b/gi;

/** About/team only — avoid `/company/blog` matching as leadership. */
export const LEADERSHIP_PATH =
  /\/(about|team|founders?|leadership|people)(\/?|$|\?)|\/company(\/?|$|\?)/i;
export const PRICING_PATH = /\/(pricing|plans?|billing|buy)(\/?|$|\?)/i;
export const SECURITY_PATH =
  /\/(security|trust|trust-?center|trustcenter|compliance|privacy)(\/?|$|\?)/i;
export const COMPETITOR_PATH = /\/(compare|alternatives?|vs)(\/?|$|\?)|g2\.com\/compare/i;
export const ENGINEERING_PATH =
  /\/(docs?|api|sdk|changelog|release-notes|status|developers?)(\/?|$|\?)/i;

export type EvidenceFields = {
  url: string;
  title?: string | null;
  snippet?: string | null;
  markdown?: string | null;
};

function blobOf(fields: EvidenceFields): string {
  return `${fields.title ?? ""} ${fields.snippet ?? ""} ${fields.markdown ?? ""}`;
}

function hasKeyword(re: RegExp, text: string): boolean {
  re.lastIndex = 0;
  return re.test(text);
}

export function isLeadershipEvidence(fields: EvidenceFields): boolean {
  if (LEADERSHIP_PATH.test(fields.url)) return true;
  if (/linkedin\.com\/(in|company)/i.test(fields.url)) return true;
  if (/crunchbase\.com|wikipedia\.org|inc42\.com|yourstory\.com|blume\.vc/i.test(fields.url)) {
    return true;
  }
  return hasKeyword(LEADERSHIP_KEYWORD, blobOf(fields));
}

export function isPricingEvidence(fields: EvidenceFields): boolean {
  if (PRICING_PATH.test(fields.url)) return true;
  if (/pricingsaas\.com|trustradius\.com.*pricing/i.test(fields.url)) return true;
  return hasKeyword(PRICING_KEYWORD, blobOf(fields));
}

export function isSecurityEvidence(fields: EvidenceFields): boolean {
  if (SECURITY_PATH.test(fields.url)) return true;
  if (/breachsense|haveibeenpwned|trust\.|security\.|vanta\.com|safebase/i.test(fields.url)) {
    return true;
  }
  return hasKeyword(SECURITY_KEYWORD, blobOf(fields));
}

export function isCompetitorEvidence(fields: EvidenceFields): boolean {
  if (COMPETITOR_PATH.test(fields.url)) return true;
  if (/\/alternatives?\b|\/competitors?\b/i.test(fields.url)) return true;
  return hasKeyword(COMPETITOR_KEYWORD, `${fields.title ?? ""} ${fields.snippet ?? ""}`);
}

export function isEngineeringEvidence(fields: EvidenceFields): boolean {
  if (ENGINEERING_PATH.test(fields.url)) return true;
  if (/statuspage\.io|\/developers?\b/i.test(fields.url)) return true;
  return hasKeyword(ENGINEERING_KEYWORD, blobOf(fields));
}

function findKeywordCenters(text: string, keywords: RegExp[]): number[] {
  const matches: number[] = [];
  for (const re of keywords) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      matches.push(match.index);
      if (matches.length >= 12) return matches;
    }
  }
  return matches;
}

/**
 * Prefer a window around diligence keywords instead of head-truncating —
 * hero/nav often bury pricing tables, cert lists, and founder bios.
 */
export function truncateEvidenceText(
  text: string,
  maxChars: number,
  keywords: RegExp[] = [LEADERSHIP_KEYWORD, PRICING_KEYWORD, SECURITY_KEYWORD, COMPETITOR_KEYWORD],
): string {
  if (text.length <= maxChars) return text;

  const matches = findKeywordCenters(text, keywords);
  if (matches.length === 0) return text.slice(0, maxChars);

  const center = matches[0]!;
  const start = Math.max(0, center - Math.floor(maxChars * 0.35));
  const end = Math.min(text.length, start + maxChars);
  const adjustedStart = Math.max(0, end - maxChars);

  let slice = text.slice(adjustedStart, end);
  if (adjustedStart > 0) slice = `…${slice}`;
  if (end < text.length) slice = `${slice}…`;
  return slice;
}

export function evidenceCharBudget(fields: EvidenceFields): number {
  if (
    isLeadershipEvidence(fields) ||
    isPricingEvidence(fields) ||
    isSecurityEvidence(fields) ||
    isCompetitorEvidence(fields) ||
    isEngineeringEvidence(fields)
  ) {
    return 4000;
  }
  return 2200;
}
