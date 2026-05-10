export type MuscleGroup =
  | "Chest" | "Back" | "Legs" | "Shoulders" | "Arms" | "Core" | "Full Body" | "Cardio" | string;

export type Exercise = {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  isCustom?: boolean;
  createdAt?: number;
};

export type TemplateIconKey =
  | "barbell"
  | "flash"
  | "body"
  | "walk"
  | "star"
  | "add";

export type Template = {
  id: string;
  name: string;
  icon: TemplateIconKey;
  exerciseIds: string[];
  createdAt: number;
  updatedAt: number;
};
