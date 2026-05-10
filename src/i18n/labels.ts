const MUSCLE_GROUP_KEYS = new Set([
  "Chest",
  "Back",
  "Legs",
  "Shoulders",
  "Arms",
  "Core",
  "Full Body",
  "Cardio",
  "Other",
]);

export function formatMuscleGroup(t: (key: string) => string, group?: string | null) {
  const value = group || "Other";
  if (!MUSCLE_GROUP_KEYS.has(value)) return value;
  return t(`muscle_groups.${value}`);
}
