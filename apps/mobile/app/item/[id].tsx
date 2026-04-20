import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  evaluateDispositions,
  itemTrustLine,
  type Disposition,
  type RulesBundle,
} from "@ecosnap/rules-engine";
import { supabase } from "../../lib/supabase";
import { getPreferredJurisdictionId } from "../../lib/jurisdiction";

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bundle, setBundle] = useState<RulesBundle | null>(null);
  const [dispositions, setDispositions] = useState<Disposition[]>([]);
  const [trust, setTrust] = useState<Disposition["trust"] | null>(null);
  const [hasFlow, setHasFlow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const jid = await getPreferredJurisdictionId();

      const { data: item, error: itemErr } = await supabase
        .from("item")
        .select("*")
        .eq("id", id)
        .single();
      if (itemErr || !item) {
        if (!cancelled) setBundle(null);
        if (!cancelled) setLoading(false);
        return;
      }

      const { data: flow } = await supabase
        .from("item_flow")
        .select("id")
        .eq("item_id", id)
        .eq("status", "published")
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!cancelled) setHasFlow(!!flow);

      const [ws, sd, aliases, rules] = await Promise.all([
        supabase.from("waste_stream").select("*"),
        supabase.from("source_document").select("*"),
        supabase.from("item_search_alias").select("*").eq("item_id", id),
        supabase.from("disposition_rule").select("*").eq("item_id", id),
      ]);

      const jurisdictionsRes = await supabase.from("jurisdiction").select("*");

      const b: RulesBundle = {
        generated_at: new Date().toISOString(),
        jurisdictions: (jurisdictionsRes.data ?? []) as RulesBundle["jurisdictions"],
        waste_streams: (ws.data ?? []) as RulesBundle["waste_streams"],
        source_documents: (sd.data ?? []) as RulesBundle["source_documents"],
        items: [
          {
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
          },
        ],
        item_search_aliases: (aliases.data ?? []).map((a) => ({
          item_id: a.item_id,
          alias_normalized: a.alias_normalized,
          weight: a.weight,
          locale: a.locale,
        })),
        disposition_rules: (rules.data ?? []).map((r) => ({
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
        })),
      };

      if (!cancelled) {
        setBundle(b);
        const sources = new Map(b.source_documents.map((s) => [s.id, s]));
        setTrust(itemTrustLine(b.items[0], sources));
      }
      if (!cancelled && jid) {
        const ev = evaluateDispositions({
          bundle: b,
          jurisdictionId: jid,
          itemId: item.id,
          attributes: {},
        });
        setDispositions(ev);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const trustText = useMemo(() => {
    if (!trust) return "";
    const parts: string[] = [];
    if (trust.source_title) parts.push(`Source: ${trust.source_title}`);
    if (trust.citation_url) parts.push("Link on file");
    if (trust.last_reviewed_at) parts.push(`Last reviewed ${trust.last_reviewed_at.slice(0, 10)}`);
    if (trust.published_at) parts.push(`Published ${trust.published_at.slice(0, 10)}`);
    return parts.join(" · ");
  }, [trust]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!bundle) {
    return (
      <View style={styles.centered}>
        <Text>Item not found or offline.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{bundle.items[0].title}</Text>
      {bundle.items[0].category ? <Text style={styles.cat}>{bundle.items[0].category}</Text> : null}
      <Text style={styles.trust}>{trustText || "Trust metadata will appear when content is published."}</Text>

      {hasFlow ? (
        <Pressable style={styles.flowBtn} onPress={() => router.push({ pathname: "/flow/[itemId]", params: { itemId: id } })}>
          <Text style={styles.flowBtnText}>Answer a few questions for your situation</Text>
        </Pressable>
      ) : null}

      <Text style={styles.section}>How to dispose</Text>
      {dispositions.length === 0 ? (
        <Text style={styles.muted}>No published rules for your city yet.</Text>
      ) : (
        dispositions.map((d) => (
          <View key={d.rule_id} style={styles.card}>
            <Text style={styles.stream}>{d.waste_stream.label}</Text>
            {d.rationale ? <Text style={styles.body}>{d.rationale}</Text> : null}
            {d.notes ? <Text style={styles.note}>{d.notes}</Text> : null}
            {d.trust.citation_url ? (
              <Text style={styles.link} onPress={() => Linking.openURL(d.trust.citation_url!)}>
                Open citation
              </Text>
            ) : null}
          </View>
        ))
      )}

      <Pressable style={styles.feedback} onPress={() => {}}>
        <Text style={styles.muted}>Report outdated info (sign in + feedback API in admin)</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { padding: 16, gap: 12, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "700" },
  cat: { color: "#555" },
  trust: { color: "#444", fontSize: 13, lineHeight: 18 },
  section: { marginTop: 12, fontSize: 18, fontWeight: "600" },
  card: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#fafafa",
  },
  stream: { fontSize: 17, fontWeight: "700", color: "#0a7" },
  body: { marginTop: 6, fontSize: 15 },
  note: { marginTop: 4, color: "#555" },
  link: { marginTop: 8, color: "#06c", fontWeight: "600" },
  muted: { color: "#666" },
  flowBtn: { backgroundColor: "#eef6ff", padding: 12, borderRadius: 10, marginTop: 8 },
  flowBtnText: { fontWeight: "600", color: "#124" },
  feedback: { marginTop: 24 },
});
