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
  | "barbell"    // klasyk siłowy
  | "flash"      // szybkie / intensywne
  | "body"       // sylwetka
  | "walk"       // kardio
  | "star"       // uniwersalna gwiazdka
  | "add";       // plus do „Custom template”

export type Template = {
  id: string;
  name: string;
  icon: TemplateIconKey;
  exerciseIds: string[]; // ID ćwiczeń (może zawierać customy)
  createdAt: number;
  updatedAt: number;
};