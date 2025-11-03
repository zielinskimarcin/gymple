import type { Template } from "../types";

export const DEFAULT_TEMPLATES: Template[] = [
  {
    id: "tpl_push",
    name: "Push",
    icon: "flash",
    exerciseIds: ["bench", "incline_db", "ohp", "pushdown"],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "tpl_pull",
    name: "Pull",
    icon: "body",
    exerciseIds: ["row", "pullup", "curl", "plank"],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "tpl_legs",
    name: "Legs",
    icon: "barbell",
    exerciseIds: ["squat", "rdl"],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];