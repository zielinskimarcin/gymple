import type { TemplateIconKey } from "../types";

export const TEMPLATE_ICON_MAP: Record<TemplateIconKey, keyof import("@expo/vector-icons").Ionicons.glyphMap> = {
  barbell: "barbell-outline",
  flash:   "flash-outline",
  body:    "accessibility-outline",
  walk:    "walk-outline",
  star:    "star-outline",
  add:     "add",
};