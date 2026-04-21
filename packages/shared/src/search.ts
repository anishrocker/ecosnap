/**
 * Normalizes user search input for parity with DB `alias_normalized` / RPC.
 * Keeps `#` for plastic resin codes; lowercases; collapses whitespace.
 */
export function normalizeSearchQuery(raw: string): string {
  let s = raw.trim().toLowerCase();
  s = s.replace(/\s+/g, " ");
  // Remove punctuation except # and alphanumeric spaces
  s = s.replace(/[^\p{L}\p{N}#\s-]/gu, "");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}
