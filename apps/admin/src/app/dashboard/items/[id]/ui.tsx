"use client";

import { useMemo, useState } from "react";
import { validateItemPublish, type RulesBundle } from "@ecosnap/rules-engine";
import { normalizeSearchQuery } from "@ecosnap/shared";

type Props = {
  item: Record<string, unknown>;
  aliases: Record<string, unknown>[];
  flow: Record<string, unknown> | null;
  rules: Record<string, unknown>[];
  jurisdictions: { id: string; name: string; slug: string }[];
};

export function ItemEditor({ item, aliases, flow, rules, jurisdictions }: Props) {
  const [title, setTitle] = useState(String(item.title ?? ""));
  const [slug, setSlug] = useState(String(item.slug ?? ""));
  const [status, setStatus] = useState(String(item.status ?? "draft"));
  const [notCovered, setNotCovered] = useState(Boolean(item.not_covered));
  const [comingSoon, setComingSoon] = useState(Boolean(item.coming_soon));
  const [coverageNotes, setCoverageNotes] = useState(String(item.coverage_notes ?? ""));
  const [citationUrl, setCitationUrl] = useState(String(item.citation_url ?? ""));
  const [lastReviewed, setLastReviewed] = useState(
    item.last_reviewed_at ? String(item.last_reviewed_at).slice(0, 10) : "",
  );
  const [aliasLines, setAliasLines] = useState(aliases.map((a) => String(a.alias_text)).join("\n"));
  const [flowJson, setFlowJson] = useState(flow?.flow_json ? JSON.stringify(flow.flow_json, null, 2) : "");
  const [checklist, setChecklist] = useState<{ level: string; message: string }[]>([]);

  const bundle: RulesBundle = useMemo(() => {
    const mapRule = (r: Record<string, unknown>) => ({
      id: String(r.id),
      jurisdiction_id: String(r.jurisdiction_id),
      item_id: String(r.item_id),
      waste_stream_id: String(r.waste_stream_id),
      priority: Number(r.priority ?? 100),
      notes: r.notes ? String(r.notes) : null,
      rationale: r.rationale ? String(r.rationale) : null,
      attributes_json: (r.attributes_json ?? {}) as Record<string, string>,
      effective_from: r.effective_from ? String(r.effective_from) : null,
      effective_to: r.effective_to ? String(r.effective_to) : null,
      citation_url: r.citation_url ? String(r.citation_url) : null,
      primary_source_document_id: r.primary_source_document_id ? String(r.primary_source_document_id) : null,
      last_reviewed_at: r.last_reviewed_at ? String(r.last_reviewed_at) : null,
      status: r.status as "draft" | "published",
      published_at: r.published_at ? String(r.published_at) : null,
    });
    return {
      generated_at: new Date().toISOString(),
      jurisdictions: jurisdictions.map((j) => ({
        id: j.id,
        slug: j.slug,
        name: j.name,
        timezone: "America/Chicago",
        official_url: null,
      })),
      waste_streams: [],
      source_documents: [],
      items: [
        {
          id: String(item.id),
          title,
          slug,
          description: item.description ? String(item.description) : null,
          category: item.category ? String(item.category) : null,
          hazard: Boolean(item.hazard),
          status: status as "draft" | "published",
          published_at: item.published_at ? String(item.published_at) : null,
          not_covered: notCovered,
          coming_soon: comingSoon,
          coverage_notes: coverageNotes || null,
          primary_source_document_id: item.primary_source_document_id ? String(item.primary_source_document_id) : null,
          citation_url: citationUrl || null,
          last_reviewed_at: lastReviewed ? `${lastReviewed}T12:00:00.000Z` : null,
          content_updated_at: item.content_updated_at ? String(item.content_updated_at) : null,
        },
      ],
      item_search_aliases: [],
      disposition_rules: rules.map(mapRule),
    };
  }, [
    item,
    title,
    slug,
    status,
    notCovered,
    comingSoon,
    coverageNotes,
    citationUrl,
    lastReviewed,
    rules,
    jurisdictions,
  ]);

  function runPublishCheck() {
    const itemDto = bundle.items[0];
    const ruleDtos = rules.map((r) => ({
      id: String(r.id),
      jurisdiction_id: String(r.jurisdiction_id),
      item_id: String(r.item_id),
      waste_stream_id: String(r.waste_stream_id),
      priority: Number(r.priority ?? 100),
      notes: r.notes ? String(r.notes) : null,
      rationale: r.rationale ? String(r.rationale) : null,
      attributes_json: (r.attributes_json ?? {}) as Record<string, string>,
      effective_from: r.effective_from ? String(r.effective_from) : null,
      effective_to: r.effective_to ? String(r.effective_to) : null,
      citation_url: r.citation_url ? String(r.citation_url) : null,
      primary_source_document_id: r.primary_source_document_id ? String(r.primary_source_document_id) : null,
      last_reviewed_at: r.last_reviewed_at ? String(r.last_reviewed_at) : null,
      status: (r.status as "draft" | "published") ?? "draft",
      published_at: r.published_at ? String(r.published_at) : null,
    }));
    let flowParsed: unknown = null;
    if (flowJson.trim()) {
      try {
        flowParsed = JSON.parse(flowJson);
      } catch {
        setChecklist([{ level: "error", message: "Flow JSON is invalid" }]);
        return;
      }
    }
    const issues = validateItemPublish(
      { ...itemDto, status: "published" },
      ruleDtos.map((r) => ({ ...r, status: "published" })),
      bundle,
      jurisdictions.map((j) => j.id),
      flowParsed,
    );
    setChecklist(issues.map((i) => ({ level: i.level, message: i.message })));
  }

  return (
    <div style={{ maxWidth: 960, display: "grid", gap: 18 }}>
      <section className="admin-card" style={{ padding: 20 }}>
        <h1 style={{ margin: 0, fontSize: 30 }}>Edit item</h1>
        <p style={{ margin: "8px 0 0", color: "var(--text-muted)" }}>
          Update trust metadata, aliases, and optional disambiguation flow.
        </p>
      </section>

      <section className="admin-card" style={{ padding: 20 }}>
        <div style={{ display: "grid", gap: 14 }}>
          <label>
            <strong>Title</strong>
            <input className="admin-input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label>
            <strong>Slug</strong>
            <input className="admin-input" value={slug} onChange={(e) => setSlug(e.target.value)} />
          </label>
          <label>
            <strong>Status</strong>
            <select className="admin-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="draft">draft</option>
              <option value="published">published</option>
            </select>
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={notCovered} onChange={(e) => setNotCovered(e.target.checked)} />
            not_covered (explicit gap OK)
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={comingSoon} onChange={(e) => setComingSoon(e.target.checked)} />
            coming_soon
          </label>
          <label>
            <strong>Coverage notes</strong>
            <textarea
              className="admin-textarea"
              value={coverageNotes}
              onChange={(e) => setCoverageNotes(e.target.value)}
              rows={3}
            />
          </label>
          <label>
            <strong>Citation URL (item-level)</strong>
            <input className="admin-input" value={citationUrl} onChange={(e) => setCitationUrl(e.target.value)} />
          </label>
          <label>
            <strong>Last reviewed (date)</strong>
            <input className="admin-input" type="date" value={lastReviewed} onChange={(e) => setLastReviewed(e.target.value)} />
          </label>
          <label>
            <strong>Aliases</strong> (one per line; normalized with <code>normalizeSearchQuery</code> on save in production)
            <textarea
              className="admin-textarea"
              value={aliasLines}
              onChange={(e) => setAliasLines(e.target.value)}
              rows={5}
              style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
            />
          </label>
          <label>
            <strong>Item flow JSON</strong> (optional)
            <textarea
              className="admin-textarea"
              value={flowJson}
              onChange={(e) => setFlowJson(e.target.value)}
              rows={12}
              style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
            />
          </label>
        </div>
      </section>

      <section className="admin-card" style={{ padding: 20 }}>
        <h2 style={{ marginTop: 0 }}>Publish checklist (client preview)</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          Server-side enforcement: call <code>/api/publish-item</code> with the service role after saves. This panel mirrors validation rules.
        </p>
        <button type="button" onClick={runPublishCheck} className="admin-button" style={{ marginTop: 8 }}>
          Run validation
        </button>
        <ul style={{ marginBottom: 0, marginTop: 14, paddingLeft: 18 }}>
          {checklist.map((c, i) => (
            <li key={i} style={{ marginBottom: 8, color: "var(--text)" }}>
              <span className={`badge ${c.level === "error" ? "badge-error" : "badge-warning"}`}>{c.level}</span>{" "}
              {c.message}
            </li>
          ))}
        </ul>
        {checklist.length === 0 ? (
          <p style={{ color: "var(--text-muted)", marginBottom: 0 }}>Run validation to see blocking vs warning items.</p>
        ) : null}
      </section>

      <p style={{ marginTop: 2, fontSize: 13, color: "var(--text-muted)" }}>
        Normalization helper: <code>{normalizeSearchQuery("  Plastic #1  ")}</code>
      </p>
    </div>
  );
}
