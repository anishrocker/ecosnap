import type {
  Disposition,
  DispositionRuleDTO,
  EvaluateInput,
  ItemDTO,
  RulesBundle,
  SourceDocumentDTO,
  WasteStreamDTO,
} from "./types.js";

function isActiveOnDate(
  rule: DispositionRuleDTO,
  on: Date,
): boolean {
  if (rule.effective_from) {
    const from = new Date(rule.effective_from);
    if (on < from) return false;
  }
  if (rule.effective_to) {
    const to = new Date(rule.effective_to);
    if (on > to) return false;
  }
  return true;
}

function ruleMatchesAttributes(
  rule: DispositionRuleDTO,
  attributes: Record<string, string>,
): boolean {
  const req = rule.attributes_json ?? {};
  for (const [k, v] of Object.entries(req)) {
    if (attributes[k] !== v) return false;
  }
  return true;
}

function specificity(rule: DispositionRuleDTO): number {
  return Object.keys(rule.attributes_json ?? {}).length;
}

function trustFromRule(
  rule: DispositionRuleDTO,
  sources: Map<string, SourceDocumentDTO>,
): Disposition["trust"] {
  const doc = rule.primary_source_document_id
    ? sources.get(rule.primary_source_document_id) ?? null
    : null;
  return {
    primary_source_document_id: rule.primary_source_document_id,
    citation_url: rule.citation_url,
    source_title: doc?.title ?? null,
    last_reviewed_at: rule.last_reviewed_at,
    published_at: rule.published_at,
    content_updated_at: null,
  };
}

/**
 * Deterministic rule selection: active date, published, attribute match,
 * higher specificity first, then lower priority number, then rule id.
 */
export function evaluateDispositions(input: EvaluateInput, now = new Date()): Disposition[] {
  const { bundle, jurisdictionId, itemId, attributes } = input;
  const streams = new Map(bundle.waste_streams.map((w) => [w.id, w]));
  const sources = new Map(bundle.source_documents.map((s) => [s.id, s]));

  const candidates = bundle.disposition_rules.filter(
    (r) =>
      r.status === "published" &&
      r.jurisdiction_id === jurisdictionId &&
      r.item_id === itemId &&
      isActiveOnDate(r, now) &&
      ruleMatchesAttributes(r, attributes),
  );

  candidates.sort((a, b) => {
    const sp = specificity(b) - specificity(a);
    if (sp !== 0) return sp;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.id.localeCompare(b.id);
  });

  const seen = new Set<string>();
  const out: Disposition[] = [];
  for (const rule of candidates) {
    const ws = streams.get(rule.waste_stream_id);
    if (!ws || seen.has(ws.id)) continue;
    seen.add(ws.id);
    out.push({
      waste_stream: ws,
      notes: rule.notes,
      rationale: rule.rationale,
      trust: trustFromRule(rule, sources),
      rule_id: rule.id,
    });
  }
  return out;
}

export function getPublishedItem(bundle: RulesBundle, itemId: string): ItemDTO | undefined {
  return bundle.items.find((i) => i.id === itemId && i.status === "published");
}

export function itemTrustLine(
  item: ItemDTO,
  sources: Map<string, SourceDocumentDTO>,
): Disposition["trust"] {
  const doc = item.primary_source_document_id
    ? sources.get(item.primary_source_document_id) ?? null
    : null;
  return {
    primary_source_document_id: item.primary_source_document_id,
    citation_url: item.citation_url,
    source_title: doc?.title ?? null,
    last_reviewed_at: item.last_reviewed_at,
    published_at: item.published_at,
    content_updated_at: item.content_updated_at,
  };
}

export function wasteStreamMap(bundle: RulesBundle): Map<string, WasteStreamDTO> {
  return new Map(bundle.waste_streams.map((w) => [w.id, w]));
}
