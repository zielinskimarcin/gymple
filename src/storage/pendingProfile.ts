import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";

const KEY = "pending_profile_v1";
const KEY_SEEDED = "pending_profile_seeded_v1";
const DEFAULT_AVATAR = "#60a5fa";

export type PendingProfile = {
  display_name?: string;
  workouts_per_week?: number;
  focus?: "strength" | "hypertrophy" | "endurance" | "mixed";
  avatar_color?: string;
};

async function getRaw(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage === "undefined") return null;
      return localStorage.getItem(KEY);
    }
    const v = await AsyncStorage.getItem(KEY);
    if (v !== null) return v;
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

export async function applyPendingProfileOnce() {
  const already = await isPendingProfileSeeded();
  if (already) return;

  const draft = await getPendingProfile();
  const { data: usr } = await supabase.auth.getUser();
  const userId = usr.user?.id;

  if (!userId || !draft) {
    await markPendingProfileSeeded(true);
    await clearPendingProfile();
    return;
  }

  const payload: Record<string, any> = { id: userId };

  if (draft.display_name && draft.display_name.trim()) payload.display_name = draft.display_name.trim();
  if (typeof draft.workouts_per_week === "number") payload.workouts_per_week = draft.workouts_per_week;
  if (draft.focus) payload.focus = draft.focus;

  payload.avatar_color = (draft.avatar_color && draft.avatar_color.trim()) || DEFAULT_AVATAR;

  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });

  if (error) return;

  await markPendingProfileSeeded(true);
  await clearPendingProfile();
}

export async function clearAllOnboardingLocalKeys() {
  await markPendingProfileSeeded(false);
  await clearPendingProfile();
}
