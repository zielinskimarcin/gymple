// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Fallback na web (SecureStore nie działa w przeglądarce)
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

// Native (iOS/Android)
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

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// (pomoc w debugowaniu — możesz usunąć później)
console.log("[supabase] url:", SUPABASE_URL);
console.log("[supabase] platform:", Platform.OS);