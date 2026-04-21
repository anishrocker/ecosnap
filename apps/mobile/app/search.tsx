import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { normalizeSearchQuery } from "@ecosnap/shared";
import { supabase } from "../lib/supabase";
import { getPreferredJurisdictionId } from "../lib/jurisdiction";

type Row = { item_id: string; title: string; snippet: string; match_type: string };

export default function SearchScreen() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [jid, setJid] = useState<string | null>(null);

  useEffect(() => {
    getPreferredJurisdictionId().then(setJid);
  }, []);

  const runSearch = useCallback(async () => {
    if (!jid) return;
    setLoading(true);
    const n = normalizeSearchQuery(q);
    const { data, error } = await supabase.rpc("search_items", {
      p_query: n,
      p_jurisdiction: jid,
    });
    setLoading(false);
    if (error) {
      setRows([]);
      return;
    }
    setRows((data as Row[]) ?? []);
  }, [q, jid]);

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Search (e.g. plastic bottle, styro)"
        value={q}
        onChangeText={setQ}
        style={styles.input}
        autoCorrect={false}
        onSubmitEditing={runSearch}
      />
      <Pressable style={styles.btn} onPress={runSearch}>
        <Text style={styles.btnText}>Search</Text>
      </Pressable>
      {!jid ? (
        <Text style={styles.muted}>Pick a jurisdiction on the home screen first.</Text>
      ) : loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.item_id}
          ListEmptyComponent={<Text style={styles.muted}>No results. Try another term.</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push({ pathname: "/item/[id]", params: { id: item.item_id } })}
            >
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>
                {item.match_type} · {item.snippet}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  btn: { backgroundColor: "#0a7", padding: 12, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "600" },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  title: { fontSize: 17, fontWeight: "600" },
  meta: { color: "#666", marginTop: 4 },
  muted: { color: "#666" },
});
