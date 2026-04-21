import { StyleSheet, Text, View } from "react-native";

/** Placeholder for future AI-assisted scan flow */
export default function ScanPlaceholder() {
  return (
    <View style={styles.box}>
      <Text style={styles.title}>Scan coming soon</Text>
      <Text style={styles.body}>
        Photo-based identification will plug into the same classification_attempt / classification_signal tables.
        For the MVP, use search and the optional question flow.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, padding: 20, justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  body: { fontSize: 15, lineHeight: 22, color: "#444" },
});
