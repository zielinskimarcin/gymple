import type { Exercise, MuscleGroup } from "../types";

export const MUSCLE_GROUPS: MuscleGroup[] = [
  "Chest",
  "Back",
  "Legs",
  "Shoulders",
  "Arms",
  "Core",
  "Full Body",
  "Cardio",
  "Other",
];

export const DEFAULT_EXERCISES: Exercise[] = [
  { id: "bench",       name: "Bench Press",        muscleGroup: "Chest" },
  { id: "incline_db",  name: "Incline DB Press",   muscleGroup: "Chest" },

  { id: "row",         name: "Barbell Row",        muscleGroup: "Back" },
  { id: "deadlift",    name: "Deadlift",           muscleGroup: "Back" },
  { id: "pullup",      name: "Pull-Up",            muscleGroup: "Back" },

  { id: "squat",       name: "Back Squat",         muscleGroup: "Legs" },
  { id: "rdl",         name: "Romanian Deadlift",  muscleGroup: "Legs" },

  { id: "ohp",         name: "Overhead Press",     muscleGroup: "Shoulders" },

  { id: "curl",        name: "Barbell Curl",       muscleGroup: "Arms" },
  { id: "pushdown",    name: "Triceps Pushdown",   muscleGroup: "Arms" },

  { id: "plank",       name: "Plank",              muscleGroup: "Core" },

  { id: "burpee",      name: "Burpees",            muscleGroup: "Full Body" },

  { id: "treadmill",   name: "Treadmill Run",      muscleGroup: "Cardio" },
];

export type SortMode = "group" | "alpha";

export const sortByGroup = (a: Exercise, b: Exercise) => {
  const gi = MUSCLE_GROUPS.indexOf(a.muscleGroup);
  const gj = MUSCLE_GROUPS.indexOf(b.muscleGroup);
  if (gi !== gj) return gi - gj;
  return a.name.localeCompare(b.name);
};

export const sortByAlpha = (a: Exercise, b: Exercise) =>
  a.name.localeCompare(b.name);

export const normalizeName = (s: string) =>
  s.trim().toLowerCase().replace(/\s+/g, " ");
