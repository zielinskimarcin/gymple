// src/storage/lastAdded.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Exercise } from "./customExercises";

const KEY = "temp_last_added_exercise";

export async function setLastAddedExerciseTemp(ex: Exercise) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(ex));
  } catch {}
}

export async function popLastAddedExerciseTemp(): Promise<Exercise | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    await AsyncStorage.removeItem(KEY);
    return JSON.parse(raw) as Exercise;
  } catch {
    return null;
  }
}