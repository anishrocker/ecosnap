import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "ecosnap_preferred_jurisdiction_id";

export async function getPreferredJurisdictionId(): Promise<string | null> {
  return AsyncStorage.getItem(KEY);
}

export async function setPreferredJurisdictionId(id: string) {
  await AsyncStorage.setItem(KEY, id);
}
