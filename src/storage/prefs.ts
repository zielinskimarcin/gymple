// src/storage/prefs.ts
import { supabase } from "../lib/supabase";

export type AppPrefs = {
  firstName: string | null;
  avatarColor: string | null;
  uiTheme: "system" | "light" | "dark";
  uiLanguage: string;         // "en" | "pl" | ...
  unitsWeight: "kg" | "lb";
  marketingOptIn: boolean;
  crashReporting: boolean;
};

const DEFAULTS: AppPrefs = {
  firstName: null,
  avatarColor: null,
  uiTheme: "system",
  uiLanguage: "en",
  unitsWeight: "kg",
  marketingOptIn: false,
  crashReporting: true,
};

export async function fetchPrefs(): Promise<AppPrefs> {
  const { data: u } = await supabase.auth.getUser();
  const id = u.user?.id;
  if (!id) return DEFAULTS;

  const { data, error } = await supabase
    .from("profiles")
    .select("first_name, avatar_color, ui_theme, ui_language, units_weight, marketing_opt_in, crash_reporting")
    .eq("id", id)
    .single();

  if (error || !data) return DEFAULTS;

  return {
    firstName: data.first_name ?? DEFAULTS.firstName,
    avatarColor: data.avatar_color ?? DEFAULTS.avatarColor,
    uiTheme: (data.ui_theme ?? DEFAULTS.uiTheme) as AppPrefs["uiTheme"],
    uiLanguage: data.ui_language ?? DEFAULTS.uiLanguage,
    unitsWeight: (data.units_weight ?? DEFAULTS.unitsWeight) as AppPrefs["unitsWeight"],
    marketingOptIn: !!data.marketing_opt_in,
    crashReporting: data.crash_reporting ?? true,
  };
}