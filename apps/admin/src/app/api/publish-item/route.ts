import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { validateItemPublish, type ItemDTO, type DispositionRuleDTO, type RulesBundle } from "@ecosnap/rules-engine";

export async function POST(req: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY not set" }, { status: 500 });
  }
  const body = (await req.json()) as { item_id?: string; force_warnings?: boolean };
  if (!body.item_id) {
    return NextResponse.json({ error: "item_id required" }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { data: item, error: itemErr } = await admin.from("item").select("*").eq("id", body.item_id).single();
  if (itemErr || !item) {
    return NextResponse.json({ error: "item not found" }, { status: 404 });
  }

  const [{ data: jurisdictions }, { data: rules }, { data: ws }, { data: sd }, { data: aliases }] = await Promise.all([
    admin.from("jurisdiction").select("id,name,slug"),
    admin.from("disposition_rule").select("*").eq("item_id", body.item_id),
    admin.from("waste_stream").select("*"),
    admin.from("source_document").select("*"),
    admin.from("item_search_alias").select("*").eq("item_id", body.item_id),
  ]);

  const { data: flowRow } = await admin
    .from("item_flow")
    .select("flow_json")
    .eq("item_id", body.item_id)
    .eq("status", "published")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const itemDto: ItemDTO = {
    id: item.id,
    title: item.title,
    slug: item.slug,
    description: item.description,
    category: item.category,
    hazard: item.hazard,
    status: item.status,
    published_at: item.published_at,
    not_covered: item.not_covered,
    coming_soon: item.coming_soon,
    coverage_notes: item.coverage_notes,
    primary_source_document_id: item.primary_source_document_id,
    citation_url: item.citation_url,
    last_reviewed_at: item.last_reviewed_at,
    content_updated_at: item.content_updated_at,
  };

  const ruleDtos: DispositionRuleDTO[] = (rules ?? []).map((r) => ({
    id: r.id,
    jurisdiction_id: r.jurisdiction_id,
    item_id: r.item_id,
    waste_stream_id: r.waste_stream_id,
    priority: r.priority,
    notes: r.notes,
    rationale: r.rationale,
    attributes_json: (r.attributes_json ?? {}) as Record<string, string>,
    effective_from: r.effective_from,
    effective_to: r.effective_to,
    citation_url: r.citation_url,
    primary_source_document_id: r.primary_source_document_id,
    last_reviewed_at: r.last_reviewed_at,
    status: r.status,
    published_at: r.published_at,
  }));

  const bundle: RulesBundle = {
    generated_at: new Date().toISOString(),
    jurisdictions: (jurisdictions ?? []) as RulesBundle["jurisdictions"],
    waste_streams: (ws ?? []) as RulesBundle["waste_streams"],
    source_documents: (sd ?? []) as RulesBundle["source_documents"],
    items: [itemDto],
    item_search_aliases: (aliases ?? []).map((a) => ({
      item_id: a.item_id,
      alias_normalized: a.alias_normalized,
      weight: a.weight,
      locale: a.locale,
    })),
    disposition_rules: ruleDtos,
  };

  const issues = validateItemPublish(
    { ...itemDto, status: "published" },
    ruleDtos.map((r) => ({ ...r, status: "published" })),
    bundle,
    (jurisdictions ?? []).map((j) => j.id),
    flowRow?.flow_json ?? null,
  );

  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");
  if (errors.length) {
    return NextResponse.json({ ok: false, blocking: errors, warnings }, { status: 422 });
  }
  if (warnings.length && !body.force_warnings) {
    return NextResponse.json({ ok: false, warnings, message: "Warnings require force_warnings" }, { status: 409 });
  }

  const now = new Date().toISOString();
  await admin
    .from("item")
    .update({ status: "published", published_at: now })
    .eq("id", body.item_id);

  await admin.from("publish_audit").insert({
    item_id: body.item_id,
    action: "publish_item",
    reason: body.force_warnings ? "force_warnings" : null,
  });

  return NextResponse.json({ ok: true, published_at: now });
}
