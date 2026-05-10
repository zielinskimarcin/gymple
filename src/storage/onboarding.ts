import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export type OnbDraft = {
  name?: string;
  workoutsPerWeek?: number;
  focus?: "strength" | "hypertrophy" | "endurance" | "mixed";
};

const DRAFT_KEY = "onboarding:draft";
const DONE_KEY = "onboarding:done";

const AFTER_KEY = "onboarding:after_signup_needed";

type DoneListener = (done: boolean) => void;
const _listeners = new Set<DoneListener>();
export const onboardingEvents = {
  addListener: (_: "doneChanged", cb: DoneListener) => {
    _listeners.add(cb);
    return { remove: () => _listeners.delete(cb) };
  },
  removeListener: (_: "doneChanged", cb: DoneListener) => {
    _listeners.delete(cb);
  },
  emitDoneChanged: (done: boolean) => {
    _listeners.forEach((cb) => {
      try { cb(done); } catch {}
    });
  },
};

async function getItem(key: string) {
  try {
    if (Platform.OS === "web") return localStorage.getItem(key);
    const a = await AsyncStorage.getItem(key);
    if (a !== null) return a;
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function setItem(key: string, val: string) {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(key, val);
      return;
    }
    await AsyncStorage.setItem(key, val);
    await SecureStore.setItemAsync(key, val);
  } catch {}
}

async function delItem(key: string) {
  try {
    if (Platform.OS === "web") {
      localStorage.removeItem(key);
      return;
    }
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  } catch {}
}

export async function saveOnbDraft(partial: Partial<OnbDraft>) {
  const prev = await getItem(DRAFT_KEY);
  const cur: OnbDraft = prev ? JSON.parse(prev) : {};
  const next = { ...cur, ...partial };
  await setItem(DRAFT_KEY, JSON.stringify(next));
}

export async function getOnbDraft(): Promise<OnbDraft | null> {
  const raw = await getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OnbDraft;
  } catch {
    return null;
  }
}

export async function clearOnbDraft() {
  await delItem(DRAFT_KEY);
}

export async function markOnboardingDone(done: boolean) {
  if (done) await setItem(DONE_KEY, "1");
  else await delItem(DONE_KEY);
  onboardingEvents.emitDoneChanged(done);
}

export async function isOnboardingDone(): Promise<boolean> {
  const v = await getItem(DONE_KEY);
  return v === "1";
}

export async function setAfterSignupNeeded(val: boolean) {
  if (val) await setItem(AFTER_KEY, "1");
  else await delItem(AFTER_KEY);
}

export async function isAfterSignupNeeded(): Promise<boolean> {
  const v = await getItem(AFTER_KEY);
  return v === "1";
}

export async function clearAfterSignupNeeded() {
  await delItem(AFTER_KEY);
}

export async function resetOnboardingLocal() {
  await Promise.all([delItem(DRAFT_KEY), delItem(DONE_KEY), delItem(AFTER_KEY)]);
  onboardingEvents.emitDoneChanged(false);
}
