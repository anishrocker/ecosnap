import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "../lib/supabase";
import { getPreferredJurisdictionId, setPreferredJurisdictionId } from "../lib/jurisdiction";

type Jurisdiction = { id: string; name: string };

export default function SettingsScreen() {
  const [rows, setRows] = useState<Jurisdiction[]>([]);
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("jurisdiction").select("id,name").order("name");
      setRows(data ?? []);
      setCurrent(await getPreferredJurisdictionId());
    })();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Default jurisdiction</Text>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.row, item.id === current && styles.rowOn]}
            onPress={async () => {
              await setPreferredJurisdictionId(item.id);
              setCurrent(item.id);
            }}
          >
            <Text>{item.name}</Text>
          </Pressable>
        )}
      />
      <Text style={styles.footer}>EcoSnap MVP — non-AI. Configure EXPO_PUBLIC_SUPABASE_* in .env</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  heading: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
  row: { padding: 14, borderBottomWidth: 1, borderColor: "#eee" },
  rowOn: { backgroundColor: "#e8fff4" },
  footer: { marginTop: 24, color: "#666", fontSize: 12 },
});
