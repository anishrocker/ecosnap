import { useEffect, useMemo, useState } from "react";
import { FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import type { MapMarkerProps, MapViewProps } from "react-native-maps";
import { getPreferredJurisdictionId } from "../lib/jurisdiction";
import { supabase } from "../lib/supabase";

// Conditional imports for native vs web
let MapViewComponent: React.ComponentType<MapViewProps> | null = null;
let MarkerComponent: React.ComponentType<MapMarkerProps> | null = null;
if (Platform.OS !== "web") {
  void import("react-native-maps").then((RNMaps) => {
    MapViewComponent = RNMaps.default;
    MarkerComponent = RNMaps.Marker;
  });
}

type LocationCategory = "recycling" | "hazardous" | "compost" | "electronics";
type FilterCategory = "all" | LocationCategory;

type DropoffLocation = {
  id: string;
  name: string;
  address: string;
  jurisdiction_id: string;
  latitude: number;
  longitude: number;
  categories: LocationCategory[];
  accepted_items: string[];
};

type Jurisdiction = {
  id: string;
  name: string;
};

const CATEGORIES: { key: FilterCategory; label: string; icon: string; color: string }[] = [
  { key: "all", label: "All", icon: "apps-outline", color: "#1c9d67" },
  { key: "recycling", label: "Recycling", icon: "leaf-outline", color: "#2d7ef6" },
  { key: "hazardous", label: "Hazardous", icon: "warning-outline", color: "#f39a07" },
  { key: "compost", label: "Compost", icon: "nutrition-outline", color: "#63ad3d" },
  { key: "electronics", label: "Electronics", icon: "hardware-chip-outline", color: "#8a32b8" },
];

const DEMO_LOCATIONS: Omit<DropoffLocation, "jurisdiction_id">[] = [
  {
    id: "cedar-park-recycling-dropoff",
    name: "Cedar Park Recycling Drop-Off",
    address: "1435 Arrow Point Dr, Cedar Park, TX 78613",
    latitude: 30.5083,
    longitude: -97.8419,
    categories: ["recycling"],
    accepted_items: ["Paper & Cardboard", "Plastics", "Glass", "Metals"],
  },
  {
    id: "cedar-park-hhw",
    name: "Cedar Park Household Hazardous Waste",
    address: "1435 Arrow Point Dr, Cedar Park, TX 78613",
    latitude: 30.5074,
    longitude: -97.8402,
    categories: ["hazardous", "electronics"],
    accepted_items: ["Hazardous Waste", "Electronics"],
  },
  {
    id: "goodwill-cedar-park",
    name: "Goodwill Cedar Park",
    address: "1730 E Whitestone Blvd, Cedar Park, TX 78613",
    latitude: 30.5112,
    longitude: -97.7935,
    categories: ["recycling"],
    accepted_items: ["Clothing & Textiles"],
  },
];

function haversineMiles(aLat: number, aLon: number, bLat: number, bLon: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);

  const angle =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(angle), Math.sqrt(1 - angle));
  return earthRadiusMiles * c;
}

function categoryColor(categories: LocationCategory[]) {
  if (categories.includes("hazardous")) return "#f39a07";
  if (categories.includes("electronics")) return "#8a32b8";
  if (categories.includes("compost")) return "#63ad3d";
  return "#2d7ef6";
}

export default function MapScreen() {
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>("all");
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<Jurisdiction | null>(null);
  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [locationStatus, setLocationStatus] = useState<"loading" | "granted" | "denied">("loading");
  const [dropoffLocations, setDropoffLocations] = useState<DropoffLocation[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const preferredId = await getPreferredJurisdictionId();
      const { data: jurisdictions } = await supabase
        .from("jurisdiction")
        .select("id,name")
        .order("name");

      const currentJurisdiction =
        jurisdictions?.find((j) => j.id === preferredId) ?? jurisdictions?.[0] ?? null;
      if (!cancelled) setSelectedJurisdiction(currentJurisdiction);

      if (currentJurisdiction) {
        const seeded = DEMO_LOCATIONS.map((entry) => ({
          ...entry,
          jurisdiction_id: currentJurisdiction.id,
        }));
        if (!cancelled) setDropoffLocations(seeded);
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;

      if (status !== "granted") {
        setLocationStatus("denied");
        return;
      }

      setLocationStatus("granted");
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (!cancelled) setLocation(current.coords);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredLocations = useMemo(() => {
    const base =
      selectedCategory === "all"
        ? dropoffLocations
        : dropoffLocations.filter((loc) => loc.categories.includes(selectedCategory));

    if (!location) return base;

    return [...base].sort(
      (a, b) =>
        haversineMiles(location.latitude, location.longitude, a.latitude, a.longitude) -
        haversineMiles(location.latitude, location.longitude, b.latitude, b.longitude),
    );
  }, [dropoffLocations, selectedCategory, location]);

  const center = useMemo(
    () =>
      location
        ? {
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.2,
            longitudeDelta: 0.2,
          }
        : {
            latitude: 30.5052,
            longitude: -97.8203,
            latitudeDelta: 0.2,
            longitudeDelta: 0.2,
          },
    [location],
  );

  const NativeMapView = MapViewComponent;
  const NativeMarker = MarkerComponent;

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Drop-off Locations</Text>
          <Text style={styles.subtitle}>
            {selectedJurisdiction?.name ?? "Local"} · {filteredLocations.length} facilities
          </Text>
        </View>
        <View style={styles.myLocationPill}>
          <Ionicons name="navigate-outline" size={13} color="#177f55" />
          <Text style={styles.myLocationText}>My Location</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {CATEGORIES.map((cat) => {
          const selected = selectedCategory === cat.key;
          return (
            <Pressable
              key={cat.key}
              style={[styles.filterChip, selected && { backgroundColor: cat.color }]}
              onPress={() => setSelectedCategory(cat.key)}
            >
              <Ionicons name={cat.icon as never} size={13} color={selected ? "#fff" : cat.color} />
              <Text style={[styles.filterLabel, selected && styles.filterLabelSelected]}>{cat.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.mapCard}>
        {Platform.OS === "web" || NativeMapView == null || NativeMarker == null ? (
          <View style={styles.webMapPlaceholder}>
            <Ionicons name="map-outline" size={48} color="#8fa59b" />
            <Text style={styles.webMapText}>Map view (mobile only)</Text>
            <Text style={styles.webMapSubtext}>
              {filteredLocations.length} locations shown below
            </Text>
          </View>
        ) : (
          <NativeMapView style={styles.map} initialRegion={center} region={center}>
            {location ? (
              <NativeMarker
                coordinate={{ latitude: location.latitude, longitude: location.longitude }}
                title="Your location"
                pinColor="#1b9f68"
              />
            ) : null}
            {filteredLocations.map((loc) => (
              <NativeMarker
                key={loc.id}
                coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
                title={loc.name}
                description={loc.address}
                pinColor={categoryColor(loc.categories)}
              />
            ))}
          </NativeMapView>
        )}
      </View>

      <View style={styles.legendRow}>
        <Text style={[styles.legendItem, { color: "#2d7ef6" }]}>● ♻ Recycling</Text>
        <Text style={[styles.legendItem, { color: "#f39a07" }]}>● ⚠ Hazardous</Text>
        <Text style={[styles.legendItem, { color: "#63ad3d" }]}>● 🌱 Compost</Text>
        <Text style={[styles.legendItem, { color: "#8a32b8" }]}>● 🖥 Electronics</Text>
      </View>

      <Text style={styles.listHeading}>ALL LOCATIONS ({filteredLocations.length})</Text>
      <FlatList
        data={filteredLocations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listWrap}
        renderItem={({ item }) => {
          const distanceText =
            location == null
              ? null
              : `${haversineMiles(location.latitude, location.longitude, item.latitude, item.longitude).toFixed(1)} mi`;
          return (
            <View style={styles.locationCard}>
              <View style={styles.locationIcon}>
                <Ionicons name="location-outline" size={19} color="#24a26e" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.locationTitleRow}>
                  <Text style={styles.locationName}>{item.name}</Text>
                  {distanceText ? <Text style={styles.distanceText}>{distanceText}</Text> : null}
                </View>
                <Text style={styles.locationAddress}>{item.address}</Text>
                <View style={styles.tagsRow}>
                  {item.accepted_items.slice(0, 4).map((tag) => (
                    <Text key={tag} style={styles.tag}>
                      {tag}
                    </Text>
                  ))}
                </View>
              </View>
            </View>
          );
        }}
      />
      {locationStatus === "denied" ? (
        <Text style={styles.permissionNote}>Location permission denied. Showing default Cedar Park area.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f2f5f4", padding: 14, paddingBottom: 0 },
  header: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 35, fontWeight: "800", color: "#10251e" },
  subtitle: { marginTop: 3, color: "#60736b", fontSize: 16, fontWeight: "600" },
  myLocationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#e6f2ed",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  myLocationText: { color: "#177f55", fontWeight: "700" },
  filterRow: { gap: 10, marginTop: 16, paddingRight: 10 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#e3e9e6",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterLabel: { color: "#364840", fontWeight: "700", fontSize: 15 },
  filterLabelSelected: { color: "#fff" },
  mapCard: {
    marginTop: 12,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#cad8d2",
  },
  map: { width: "100%", height: 310 },
  webMapPlaceholder: {
    width: "100%",
    height: 310,
    backgroundColor: "#f9fbfa",
    alignItems: "center",
    justifyContent: "center",
  },
  webMapText: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "700",
    color: "#5d7068",
  },
  webMapSubtext: {
    marginTop: 4,
    fontSize: 14,
    color: "#8fa59b",
  },
  legendRow: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  legendItem: { fontSize: 16, fontWeight: "700" },
  listHeading: { marginTop: 14, color: "#5d7068", fontSize: 20, fontWeight: "800" },
  listWrap: { paddingVertical: 10, gap: 10, paddingBottom: 56 },
  locationCard: {
    backgroundColor: "#fff",
    borderColor: "#d3ddda",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    gap: 10,
  },
  locationIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#eaf4ef",
    alignItems: "center",
    justifyContent: "center",
  },
  locationTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  locationName: { fontSize: 24, fontWeight: "800", color: "#1c2e28", flexShrink: 1 },
  distanceText: { fontSize: 14, color: "#4f645c", fontWeight: "700" },
  locationAddress: { marginTop: 4, color: "#5d7068", fontSize: 16, fontWeight: "600" },
  tagsRow: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 7 },
  tag: {
    backgroundColor: "#e9efec",
    color: "#4b5e56",
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    fontSize: 13,
  },
  permissionNote: {
    marginBottom: 8,
    marginTop: 2,
    textAlign: "center",
    color: "#8a5b1b",
    fontSize: 13,
    fontWeight: "600",
  },
});
