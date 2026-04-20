import { describe, expect, it } from "vitest";
import type { RulesBundle } from "./types.js";
import { evaluateDispositions } from "./evaluate.js";

const bundle: RulesBundle = {
  generated_at: new Date().toISOString(),
  jurisdictions: [
    {
      id: "11111111-1111-1111-1111-111111111111",
      slug: "austin",
      name: "Austin",
      timezone: "America/Chicago",
      official_url: "https://www.austintexas.gov",
    },
  ],
  waste_streams: [
    { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", code: "recycle", label: "Recycling", sort_order: 1 },
    { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", code: "trash", label: "Trash", sort_order: 2 },
  ],
  source_documents: [
    { id: "cccccccc-cccc-cccc-cccc-cccccccccccc", title: "Austin Recycle Guide", url: "https://example.com" },
  ],
  items: [
    {
      id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
      title: "Plastic bottle",
      slug: "plastic-bottle",
      description: null,
      category: "Plastic",
      hazard: false,
      status: "published",
      published_at: "2026-01-01T00:00:00.000Z",
      not_covered: false,
      coming_soon: false,
      coverage_notes: null,
      primary_source_document_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      citation_url: null,
      last_reviewed_at: "2026-01-02T00:00:00.000Z",
      content_updated_at: "2026-01-02T00:00:00.000Z",
    },
  ],
  item_search_aliases: [],
  disposition_rules: [
    {
      id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
      jurisdiction_id: "11111111-1111-1111-1111-111111111111",
      item_id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
      waste_stream_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      priority: 10,
      notes: "Empty and caps on",
      rationale: "Accepted in single-stream",
      attributes_json: {},
      effective_from: null,
      effective_to: null,
      citation_url: null,
      primary_source_document_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      last_reviewed_at: "2026-01-02T00:00:00.000Z",
      status: "published",
      published_at: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "ffffffff-ffff-ffff-ffff-ffffffffffff",
      jurisdiction_id: "11111111-1111-1111-1111-111111111111",
      item_id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
      waste_stream_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      priority: 5,
      notes: "PET only",
      rationale: "Narrow plastic type",
      attributes_json: { plasticResin: "PET" },
      effective_from: null,
      effective_to: null,
      citation_url: "https://example.com/pet",
      primary_source_document_id: null,
      last_reviewed_at: "2026-01-02T00:00:00.000Z",
      status: "published",
      published_at: "2026-01-01T00:00:00.000Z",
    },
  ],
};

describe("evaluateDispositions", () => {
  it("picks higher-specificity rule for PET", () => {
    const res = evaluateDispositions({
      bundle,
      jurisdictionId: "11111111-1111-1111-1111-111111111111",
      itemId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
      attributes: { plasticResin: "PET" },
    });
    expect(res.length).toBeGreaterThanOrEqual(1);
    expect(res[0].waste_stream.code).toBe("trash");
  });

  it("uses default rule when attributes empty", () => {
    const res = evaluateDispositions({
      bundle,
      jurisdictionId: "11111111-1111-1111-1111-111111111111",
      itemId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
      attributes: {},
    });
    expect(res[0].waste_stream.code).toBe("recycle");
  });
});
