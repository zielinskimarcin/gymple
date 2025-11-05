// src/storage/pendingProfile.ts
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";

/**
 * Lokalny bufor danych z onboardingu, które mają zostać
 * zasiane do profilu użytkownika tuż po udanym zalogowaniu/rejestracji.
 *
 * Flow:
 * 1) Onboarding zapisuje roboczo draft -> setPendingProfile(...)
 * 2) Po SIGNED_IN (AuthProvider) wołamy applyPendingProfileOnce()
 *    - robi upsert do `profiles` tego konkretnego usera
 *    - czyści pending i ustawia flagę "seeded", aby nie powtarzać
 */

const KEY = "pending_profile_v1";
const KEY_SEEDED = "pending_profile_seeded_v1";
const DEFAULT_AVATAR = "#60a5fa"; // bezpieczny domyślny kolor, gdy kolumna jest NOT NULL

/* ---------- typy ---------- */
export type PendingProfile = {
  display_name?: string;
  workouts_per_week?: number;
  focus?: "strength" | "hypertrophy" | "endurance" | "mixed";
  avatar_color?: string;
};

/* ---------- helpers: odczyt/zapis (AsyncStorage + SecureStore + web) ---------- */
async function getRaw(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage === "undefined") return null;
      return localStorage.getItem(KEY);
    }
    const v = await AsyncStorage.getItem(KEY);
    if (v !== null) return v;
    // fallback na SecureStore (czasem szybciej dostępny na niektórych buildach)
    return (await SecureStore.getItemAsync(KEY)) ?? null;
  } catch {
    return null;
  }
}

async function setRaw(v: string) {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") localStorage.setItem(KEY, v);
      return;
    }
    await AsyncStorage.setItem(KEY, v);
    // trzymaj w sync na wszelki wypadek
    await SecureStore.setItemAsync(KEY, v);
  } catch {}
}

async function delRaw() {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") localStorage.removeItem(KEY);
    } else {
      await AsyncStorage.removeItem(KEY);
      await SecureStore.deleteItemAsync(KEY);
    }
  } catch {}
}

/* ---------- helpers: flaga "seeded once" ---------- */
async function getSeeded(): Promise<boolean> {
  try {
    if (Platform.OS === "web") return (localStorage.getItem(KEY_SEEDED) ?? "") === "1";
    const a = await AsyncStorage.getItem(KEY_SEEDED);
    if (a === "1") return true;
    const b = await SecureStore.getItemAsync(KEY_SEEDED);
    return b === "1";
  } catch {
    return false;
  }
}

async function setSeeded(v: boolean) {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") {
        if (v) localStorage.setItem(KEY_SEEDED, "1");
        else localStorage.removeItem(KEY_SEEDED);
      }
      return;
    }
    if (v) {
      await AsyncStorage.setItem(KEY_SEEDED, "1");
      await SecureStore.setItemAsync(KEY_SEEDED, "1");
    } else {
      await AsyncStorage.removeItem(KEY_SEEDED);
      await SecureStore.deleteItemAsync(KEY_SEEDED);
    }
  } catch {}
}

/* ---------- public API (używane przez Onboarding + AuthProvider) ---------- */
export async function setPendingProfile(partial: Partial<PendingProfile>) {
  const prev = await getRaw();
  const cur: PendingProfile = prev ? JSON.parse(prev) : {};
  const next = { ...cur, ...partial };
  await setRaw(JSON.stringify(next));
}

export async function getPendingProfile(): Promise<PendingProfile | null> {
  const raw = await getRaw();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingProfile;
  } catch {
    return null;
  }
}

export async function clearPendingProfile() {
  await delRaw();
}

export async function isPendingProfileSeeded() {
  return getSeeded();
}

export async function markPendingProfileSeeded(v: boolean) {
  return setSeeded(v);
}

/**
 * Zasiej pending profile do `profiles` dla aktualnie zalogowanego usera.
 * - działa idempotentnie dzięki fladze KEY_SEEDED
 * - ustawia domyślny avatar_color, aby nie łamać NOT NULL
 * - przy sukcesie czyści pending i ustawia seeded=true
 */
export async function applyPendingProfileOnce() {
  const already = await isPendingProfileSeeded();
  if (already) return;

  const draft = await getPendingProfile();
  const { data: usr } = await supabase.auth.getUser();
  const userId = usr.user?.id;

  // Jeśli nie ma usera lub nic do zapisania — ustaw seeded, żeby nie pętlić
  if (!userId || !draft) {
    await markPendingProfileSeeded(true);
    await clearPendingProfile();
    return;
  }

  // Payload tylko z istniejących pól
  const payload: Record<string, any> = { id: userId };

  if (draft.display_name && draft.display_name.trim()) payload.display_name = draft.display_name.trim();
  if (typeof draft.workouts_per_week === "number") payload.workouts_per_week = draft.workouts_per_week;
  if (draft.focus) payload.focus = draft.focus;

  // bezpieczeństwo NOT NULL
  payload.avatar_color = (draft.avatar_color && draft.avatar_color.trim()) || DEFAULT_AVATAR;

  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });

  if (!error) {
    await markPendingProfileSeeded(true);
    await clearPendingProfile();
  } else {
    // nie blokuj — spróbujemy znów przy następnym SIGNED_IN
    console.warn("[applyPendingProfileOnce] upsert error:", error.message);
  }
}

/** Przydatne w pełnym resecie z Settings (opcjonalne użycie) */
export async function clearAllOnboardingLocalKeys() {
  await markPendingProfileSeeded(false);
  await clearPendingProfile();
}