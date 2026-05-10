import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase environment variables.");
}

const WebStorageAdapter = {
  getItem: async (key: string) => {
    try { return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null; }
    catch { return null; }
  },
  setItem: async (key: string, value: string) => {
    try { if (typeof localStorage !== "undefined") localStorage.setItem(key, value); }
    catch {}
  },
  removeItem: async (key: string) => {
    try { if (typeof localStorage !== "undefined") localStorage.removeItem(key); }
    catch {}
  },
};

const SecureStoreAdapter = {
  getItem: async (key: string) => {
    try { return (await SecureStore.getItemAsync(key)) ?? null; } catch { return null; }
  },
  setItem: async (key: string, value: string) => {
    try { await SecureStore.setItemAsync(key, value); } catch {}
  },
  removeItem: async (key: string) => {
    try { await SecureStore.deleteItemAsync(key); } catch {}
  },
};

const storage = Platform.OS === "web" ? (WebStorageAdapter as any) : (SecureStoreAdapter as any);
const authStorageKey = `sb-${new URL(SUPABASE_URL).hostname.split(".")[0]}-auth-token`;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    storageKey: authStorageKey,
    autoRefreshToken: true,
    persistSession: true,
    flowType: "pkce",
    detectSessionInUrl: true,
  },
});

export async function clearSupabaseAuthStorage() {
  await Promise.all([
    storage.removeItem(authStorageKey),
    storage.removeItem(`${authStorageKey}-code-verifier`),
    storage.removeItem(`${authStorageKey}-user`),
  ]);
}

export function getSupabaseFunctionsUrl() {
  return `${SUPABASE_URL.replace(/\/+$/, "")}/functions/v1`;
}
