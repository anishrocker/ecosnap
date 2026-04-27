import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import { getPreferredJurisdictionId, setPreferredJurisdictionId } from "../lib/jurisdiction";

type Jurisdiction = { id: string; name: string; slug: string };
type CategoryCard = {
  key: string;
  title: string;
  subtitle: string;
  tone: string;
};

export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const selectedJurisdiction = useMemo(
    () => jurisdictions.find((j) => j.id === selectedId) ?? null,
    [jurisdictions, selectedId],
  );

  const quickChips = ["Pizza box", "Plastic bag", "Battery", "Glass bottle", "Cardboard", "Styrofoam", "Paint", "Clothing"];
  const categories: CategoryCard[] = [
    { key: "paper", title: "Paper & Cardboard", subtitle: "Newspapers, cardboard, office paper", tone: "#eef2ff" },
    { key: "plastics", title: "Plastics", subtitle: "Bottles, containers, bags", tone: "#ecfdf3" },
    { key: "glass", title: "Glass", subtitle: "Bottles and jars", tone: "#eafaf6" },
    { key: "metals", title: "Metals", subtitle: "Cans, foil, steel", tone: "#f2f7ff" },
    { key: "organics", title: "Organics", subtitle: "Food scraps, yard waste", tone: "#fff5ea" },
    { key: "electronics", title: "Electronics", subtitle: "E-waste, batteries, devices", tone: "#f6f0ff" },
    { key: "hazardous", title: "Hazardous", subtitle: "Chemicals, paint, medications", tone: "#fff0f6" },
    { key: "textiles", title: "Clothing & Textiles", subtitle: "Clothes, shoes, fabric", tone: "#eefafc" },
  ];

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
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <View style={styles.topBar}>
        <Text style={styles.brand}>EcoSnap</Text>
        <Pressable onPress={() => router.push("/settings")} style={styles.settingsChip}>
          <Text style={styles.settingsText}>Settings</Text>
        </Pressable>
      </View>

      <View style={styles.hero}>
        <View style={styles.locationPill}>
          <Text style={styles.locationText}>{selectedJurisdiction?.name ?? "Choose location"}</Text>
        </View>
        <Text style={styles.heroTitle}>What can you recycle today?</Text>
        <Text style={styles.heroSub}>Get instant disposal guidance for Cedar Park, Leander & Austin</Text>
      </View>

      <View style={styles.cityRow}>
        {jurisdictions.map((j) => (
          <Pressable
            key={j.id}
            onPress={() => onSelect(j.id)}
            style={[styles.cityChip, j.id === selectedId && styles.cityChipSelected]}
          >
            <Text style={[styles.cityChipText, j.id === selectedId && styles.cityChipTextSelected]}>{j.name}</Text>
          </Pressable>
        ))}
      </View>
      {!jurisdictions.length ? (
        <Text style={styles.muted}>Add Supabase keys + run migrations to load cities.</Text>
      ) : null}

      <Pressable onPress={() => router.push("/search")}>
        <View style={styles.searchBox}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search an item (e.g. pizza box)..."
            placeholderTextColor="#96a19d"
            style={styles.searchInput}
            onSubmitEditing={() => router.push("/search")}
          />
        </View>
      </Pressable>

      <View style={styles.quickChipsWrap}>
        {quickChips.map((chip) => (
          <Pressable key={chip} style={styles.quickChip} onPress={() => router.push("/search")}>
            <Text style={styles.quickChipText}>{chip}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.scanCard} onPress={() => router.push("/scan")}>
        <View>
          <Text style={styles.scanTitle}>Scan an item</Text>
          <Text style={styles.scanSub}>AI identifies it instantly — get recycling rules</Text>
        </View>
        <Text style={styles.scanArrow}>→</Text>
      </Pressable>

      <Pressable style={styles.mapCard} onPress={() => router.push("/map")}>
        <View>
          <Text style={styles.mapCardTitle}>Find drop-off locations</Text>
          <Text style={styles.mapCardSub}>See nearby recycling, compost, hazardous, and electronics sites</Text>
        </View>
        <Text style={styles.mapCardArrow}>📍</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Browse by Category</Text>
      <View style={styles.categoryGrid}>
        {categories.map((c) => (
          <Pressable
            key={c.key}
            style={[styles.categoryCard, { backgroundColor: c.tone }]}
            onPress={() => router.push("/search")}
          >
            <Text style={styles.categoryTitle}>{c.title}</Text>
            <Text style={styles.categorySub}>{c.subtitle}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f7faf8" },
  pageContent: { padding: 16, paddingBottom: 32, gap: 12 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 6,
  },
  brand: { fontSize: 22, fontWeight: "700", color: "#0f2a21" },
  settingsChip: {
    borderRadius: 18,
    backgroundColor: "#e9efeb",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  settingsText: { color: "#31423b", fontSize: 13, fontWeight: "600" },
  hero: { alignItems: "center", gap: 8, marginTop: 8, marginBottom: 4 },
  locationPill: { backgroundColor: "#dff6eb", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  locationText: { color: "#1e7d5b", fontWeight: "600", fontSize: 12 },
  heroTitle: { fontSize: 42, textAlign: "center", fontWeight: "800", color: "#15261f", lineHeight: 48 },
  heroSub: { fontSize: 17, textAlign: "center", color: "#50615a", lineHeight: 23 },
  cityRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 6 },
  cityChip: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#edf3ef",
  },
  cityChipSelected: { backgroundColor: "#dff6eb" },
  cityChipText: { fontSize: 12, color: "#577069", fontWeight: "600" },
  cityChipTextSelected: { color: "#1e7d5b" },
  searchBox: {
    backgroundColor: "#fff",
    borderColor: "#d9e2dd",
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 6,
  },
  searchInput: { fontSize: 16, color: "#21352c", paddingVertical: 10 },
  quickChipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  quickChip: { backgroundColor: "#e7efea", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  quickChipText: { fontSize: 12, color: "#3a4f46", fontWeight: "600" },
  scanCard: {
    marginTop: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#b6d7c9",
    backgroundColor: "#e7f6ef",
    paddingVertical: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scanTitle: { fontSize: 24, fontWeight: "700", color: "#1a3a2f" },
  scanSub: { color: "#55756a", marginTop: 4, fontSize: 14 },
  scanArrow: { fontSize: 24, color: "#1a8b64", fontWeight: "700" },
  mapCard: {
    marginTop: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dbe7e1",
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mapCardTitle: { fontSize: 20, fontWeight: "700", color: "#17352a" },
  mapCardSub: { color: "#5f776d", marginTop: 4, fontSize: 14, maxWidth: 260 },
  mapCardArrow: { fontSize: 22 },
  sectionTitle: { marginTop: 10, fontWeight: "700", fontSize: 30, color: "#1a2f27" },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  categoryCard: {
    width: "48%",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 14,
    minHeight: 96,
    borderWidth: 1,
    borderColor: "#e4ece7",
  },
  categoryTitle: { fontSize: 20, fontWeight: "700", color: "#1e332b", marginBottom: 5 },
  categorySub: { fontSize: 14, color: "#60766d", lineHeight: 18 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  muted: { color: "#666" },
});
