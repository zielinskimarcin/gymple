import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Exercise } from "./types";

const KEY_WORKOUTS = "workouts_v1";
const KEY_CUSTOM_EX = "custom_exercises_v1";
const KEY_LAST_ADDED_EX = "last_added_custom_ex_v1";
const KEY_CONFIRM_DONE = "confirm_done_workout_id_v1";
const KEY_CANCEL_DONE = "cancel_done_flag_v1";

export async function loadWorkouts(): Promise<any[]> {
  const raw = await AsyncStorage.getItem(KEY_WORKOUTS);
  return raw ? JSON.parse(raw) : [];
}
export async function saveWorkouts(list: any[]) {
  await AsyncStorage.setItem(KEY_WORKOUTS, JSON.stringify(list));
}
export async function updateWorkout(workoutId: string, patch: (w: any) => any) {
  const list = await loadWorkouts();
  const idx = list.findIndex((x: any) => x.id === workoutId);
  if (idx === -1) return;
  list[idx] = patch(list[idx]);
  await saveWorkouts(list);
}
export async function deleteWorkout(workoutId: string) {
  const list = await loadWorkouts();
  const filtered = list.filter((x: any) => x.id !== workoutId);
  await AsyncStorage.setItem(KEY_WORKOUTS, JSON.stringify(filtered));
}

export async function loadCustomExercises(): Promise<Exercise[]> {
  const raw = await AsyncStorage.getItem(KEY_CUSTOM_EX);
  return raw ? JSON.parse(raw) : [];
}
export async function saveCustomExercises(list: Exercise[]) {
  await AsyncStorage.setItem(KEY_CUSTOM_EX, JSON.stringify(list));
}
export async function deleteCustomExercise(id: string) {
  const list = await loadCustomExercises();
  const filtered = list.filter((e) => e.id !== id);
  await saveCustomExercises(filtered);
}
export async function updateCustomExercise(
  id: string,
  patch: (e: Exercise) => Exercise
) {
  const list = await loadCustomExercises();
  const idx = list.findIndex((e) => e.id === id);
  if (idx === -1) return;
  const updated = patch(list[idx]);
  const next = [...list];
  next[idx] = updated;
  await saveCustomExercises(next);
}

export async function setLastAddedExerciseTemp(ex: Exercise) {
  await AsyncStorage.setItem(KEY_LAST_ADDED_EX, JSON.stringify(ex));
}
export async function popLastAddedExerciseTemp(): Promise<Exercise | null> {
  const raw = await AsyncStorage.getItem(KEY_LAST_ADDED_EX);
  if (!raw) return null;
  await AsyncStorage.removeItem(KEY_LAST_ADDED_EX);
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setConfirmDone(workoutId: string) {
  await AsyncStorage.setItem(KEY_CONFIRM_DONE, workoutId);
}
export async function popConfirmDone(): Promise<string | null> {
  const id = await AsyncStorage.getItem(KEY_CONFIRM_DONE);
  if (!id) return null;
  await AsyncStorage.removeItem(KEY_CONFIRM_DONE);
  return id;
}

export async function setCancelDone() {
  await AsyncStorage.setItem(KEY_CANCEL_DONE, "1");
}
export async function popCancelDone(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KEY_CANCEL_DONE);
  if (!v) return false;
  await AsyncStorage.removeItem(KEY_CANCEL_DONE);
  return true;
}
