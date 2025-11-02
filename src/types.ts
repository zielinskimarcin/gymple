export type MuscleGroup = string; // pozwala na customowe grupy (np. "Glutes", "Calves")

export type Exercise = {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  isCustom?: boolean;
  createdAt?: number;
};
