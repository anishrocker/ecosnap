import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import { getPreferredJurisdictionId, setPreferredJurisdictionId } from "../lib/jurisdiction";

type Jurisdiction = { id: string; name: string; slug: string };

export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.from("jurisdiction").select("id,name,slug").order("name");
        if (error) throw error;
        if (!cancelled) setJurisdictions(data ?? []);
        const pref = await getPreferredJurisdictionId();
        if (!cancelled) setSelectedId(pref ?? data?.[0]?.id ?? null);
      } catch {
        if (!cancelled) setJurisdictions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSelect(id: string) {
    setSelectedId(id);
    await setPreferredJurisdictionId(id);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading jurisdictions…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Where do you recycle?</Text>
      <Text style={styles.sub}>Cedar Park, Leander, and Austin</Text>
      <FlatList
        data={jurisdictions}
        keyExtractor={(j) => j.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onSelect(item.id)}
            style={[styles.chip, item.id === selectedId && styles.chipSelected]}
          >
            <Text style={styles.chipText}>{item.name}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.muted}>Add Supabase keys + run migrations to load cities.</Text>}
      />
      <Link href="/search" asChild>
        <Pressable style={styles.primary} disabled={!selectedId}>
          <Text style={styles.primaryText}>Search items</Text>
        </Pressable>
      </Link>
      <Pressable style={styles.secondary} onPress={() => router.push("/settings")}>
        <Text>Settings</Text>
      </Pressable>
      <Pressable style={styles.secondary} onPress={() => router.push("/scan")}>
        <Text>Scan (coming soon)</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  heading: { fontSize: 22, fontWeight: "700" },
  sub: { color: "#555", marginBottom: 8 },
  muted: { color: "#666" },
  chip: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 8,
  },
  chipSelected: { borderColor: "#0a7", backgroundColor: "#e8fff4" },
  chipText: { fontSize: 16 },
  primary: {
    marginTop: 12,
    backgroundColor: "#0a7",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryText: { color: "#fff", fontWeight: "600" },
  secondary: { padding: 12, alignItems: "center" },
});
