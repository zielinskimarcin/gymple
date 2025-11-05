// src/storage/onboarding.ts
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type OnbDraft = {
  name?: string;
  workoutsPerWeek?: number;
  focus?: "strength" | "hypertrophy" | "endurance" | "mixed";
};

const DRAFT_KEY = "onboarding:draft";
const DONE_KEY = "onboarding:done";

/** --- malutki emitter bez zależności node 'events' --- */
type DoneListener = (done: boolean) => void;
const _listeners = new Set<DoneListener>();

export const onboardingEvents = {
  addListener: (_event: "doneChanged", cb: DoneListener) => {
    _listeners.add(cb);
    return { remove: () => _listeners.delete(cb) };
  },
  removeListener: (_event: "doneChanged", cb: DoneListener) => {
    _listeners.delete(cb);
  },
  emitDoneChanged: (done: boolean) => {
    _listeners.forEach((cb) => {
      try { cb(done); } catch {}
    });
  },
};

/** helpers storage */
async function storageGet(key: string) {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage === "undefined") return null;
      return localStorage.getItem(key);
    }
    return (await SecureStore.getItemAsync(key)) ?? null;
  } catch {
    return null;
  }
}
async function storageSet(key: string, value: string) {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch {}
}
async function storageDel(key: string) {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch {}
}

/** Zapisz (merge) szkic */
export async function saveOnbDraft(partial: Partial<OnbDraft>) {
  const prev = await storageGet(DRAFT_KEY);
  const cur: OnbDraft = prev ? JSON.parse(prev) : {};
  const next = { ...cur, ...partial };
  await storageSet(DRAFT_KEY, JSON.stringify(next));
}

/** Pobierz szkic (bez czyszczenia) */
export async function getOnbDraft(): Promise<OnbDraft | null> {
  const raw = await storageGet(DRAFT_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as OnbDraft; } catch { return null; }
}

/** Wyczyść szkic */
export async function clearOnbDraft() {
  await storageDel(DRAFT_KEY);
}

/** Pobierz i od razu wyczyść szkic – używamy po zalogowaniu */
export async function takeOnbDraft(): Promise<OnbDraft | null> {
  const raw = await storageGet(DRAFT_KEY);
  await storageDel(DRAFT_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as OnbDraft; } catch { return null; }
}

/** Ustaw flagę ukończenia onboardingu */
export async function markOnboardingDone(done: boolean) {
  if (done) await storageSet(DONE_KEY, "1");
  else await storageDel(DONE_KEY);
  onboardingEvents.emitDoneChanged(done);
}

/** Odczytaj flagę ukończenia */
export async function isOnboardingDone(): Promise<boolean> {
  const v = await storageGet(DONE_KEY);
  return v === "1";
}