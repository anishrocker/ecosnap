import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { parseItemFlowJson, type ItemFlowDefinition } from "@ecosnap/shared";
import { applyFlowAnswer, evaluateDispositions, type Disposition, type RulesBundle } from "@ecosnap/rules-engine";
import { supabase } from "../../lib/supabase";
import { getPreferredJurisdictionId } from "../../lib/jurisdiction";

export default function FlowScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const router = useRouter();
  const [flow, setFlow] = useState<ItemFlowDefinition | null>(null);
  const [questionId, setQuestionId] = useState<string | null>(null);
  const [attrs, setAttrs] = useState<Record<string, string>>({});
  const [bundle, setBundle] = useState<RulesBundle | null>(null);
  const [jid, setJid] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [finalAttrs, setFinalAttrs] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<Disposition[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const j = await getPreferredJurisdictionId();
      if (!cancelled) setJid(j);
      const { data: row } = await supabase
        .from("item_flow")
        .select("flow_json")
        .eq("item_id", itemId)
        .eq("status", "published")
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!row?.flow_json) {
        if (!cancelled) setFlow(null);
        return;
      }
      const parsed = parseItemFlowJson(row.flow_json);
      if (!parsed.success || cancelled) {
        setFlow(null);
        return;
      }
      setFlow(parsed.data);
      setQuestionId(parsed.data.start_question_id);

      const { data: item } = await supabase.from("item").select("*").eq("id", itemId).single();
      const [ws, sd, rules, jur] = await Promise.all([
        supabase.from("waste_stream").select("*"),
        supabase.from("source_document").select("*"),
        supabase.from("disposition_rule").select("*").eq("item_id", itemId),
        supabase.from("jurisdiction").select("*"),
      ]);
      if (!item || cancelled) return;
      const b: RulesBundle = {
        generated_at: new Date().toISOString(),
        jurisdictions: (jur.data ?? []) as RulesBundle["jurisdictions"],
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
        item_search_aliases: [],
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
      setBundle(b);
    })();
    return () => {
      cancelled = true;
    };
  }, [itemId]);

  useEffect(() => {
    if (!done || !bundle || !jid) return;
    setPreview(
      evaluateDispositions({
        bundle,
        jurisdictionId: jid,
        itemId,
        attributes: finalAttrs,
      }),
    );
  }, [done, bundle, jid, itemId, finalAttrs]);

  if (!flow || !questionId) {
    return (
      <View style={styles.centered}>
        {!flow && <Text>No published flow for this item.</Text>}
        {flow && !questionId && <ActivityIndicator />}
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text>Back</Text>
        </Pressable>
      </View>
    );
  }

  if (done) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.prompt}>Here is guidance for your answers:</Text>
        {preview.length === 0 ? (
          <Text style={styles.muted}>No matching rules for this combination.</Text>
        ) : (
          preview.map((d) => (
            <View key={d.rule_id} style={styles.card}>
              <Text style={styles.stream}>{d.waste_stream.label}</Text>
              {d.rationale ? <Text>{d.rationale}</Text> : null}
            </View>
          ))
        )}
        <Pressable style={styles.primary} onPress={() => router.replace({ pathname: "/item/[id]", params: { id: itemId } })}>
          <Text style={styles.primaryText}>Back to item</Text>
        </Pressable>
      </ScrollView>
    );
  }

  const q = flow.questions.find((x) => x.id === questionId);
  if (!q) {
    return (
      <View style={styles.centered}>
        <Text>Invalid flow: missing question {questionId}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>{q.prompt}</Text>
      {q.answers.map((a) => (
        <Pressable
          key={a.label}
          style={styles.answer}
          onPress={() => {
            const { nextQuestionId, merged } = applyFlowAnswer(flow, questionId, a.label, attrs);
            setAttrs(merged);
            if (!nextQuestionId) {
              setFinalAttrs(merged);
              setDone(true);
            } else {
              setQuestionId(nextQuestionId);
            }
          }}
        >
          <Text style={styles.answerText}>{a.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20, gap: 12 },
  container: { flex: 1, padding: 16, gap: 10, paddingBottom: 32 },
  prompt: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  answer: { borderWidth: 1, borderColor: "#ccc", borderRadius: 10, padding: 14 },
  answerText: { fontSize: 16 },
  back: { marginTop: 8 },
  card: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 12, marginBottom: 8 },
  stream: { fontWeight: "700", color: "#0a7", marginBottom: 4 },
  muted: { color: "#666" },
  primary: { marginTop: 16, backgroundColor: "#0a7", padding: 14, borderRadius: 10, alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "600" },
});
