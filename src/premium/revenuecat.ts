import Constants from "expo-constants";
import { Platform } from "react-native";
import Purchases from "react-native-purchases";

function isExpoGo() {
  return Constants.appOwnership === "expo";
}

let configured = false;

export function configureRevenueCat() {
  if (Platform.OS !== "ios" || isExpoGo()) return false;
  if (configured) return true;

  const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
  if (!apiKey) return false;

  try {
    Purchases.configure({ apiKey });
    configured = true;
    return true;
  } catch {
    return false;
  }
}

export async function isRevenueCatReady() {
  if (!configureRevenueCat()) return false;
  try {
    return await Purchases.isConfigured();
  } catch {
    return false;
  }
}

export async function revenueCatLogIn(userId: string) {
  if (!(await isRevenueCatReady())) return;
  try {
    await Purchases.logIn(userId);
  } catch {
  }
}

export async function revenueCatLogOut() {
  if (!(await isRevenueCatReady())) return;
  try {
    await Purchases.logOut();
  } catch {
  }
}
