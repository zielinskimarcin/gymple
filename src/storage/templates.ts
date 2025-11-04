// src/storage/templates.ts
import { supabase } from "../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type TemplateRecord = {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  exercise_ids: string[];
  created_at?: string;
  updated_at?: string;
};

// ten typ masz już w appce – trzymam zgodność pól z Twoim usage w UI
export type Template = {
  id: string;
  name: string;
  icon: string;          // klucz z TEMPLATE_ICON_MAP
  exerciseIds: string[]; // w DB: exercise_ids
};

// ========== SELECTED TEMPLATE (lokalnie) ==========
const KEY_SELECTED = "selected_template_id";

export async function getSelectedTemplateId(): Promise<string | null> {
  try {
    return (await AsyncStorage.getItem(KEY_SELECTED)) || null;
  } catch {
    return null;
  }
}

export async function setSelectedTemplateId(id: string | null) {
  try {
    if (id) await AsyncStorage.setItem(KEY_SELECTED, id);
    else await AsyncStorage.removeItem(KEY_SELECTED);
  } catch {}
}

// ========== CRUD: templates ==========
function mapRowToTemplate(r: TemplateRecord): Template {
  return {
    id: r.id,
    name: r.name,
    icon: r.icon,
    exerciseIds: r.exercise_ids || [],
  };
}

export async function loadTemplates(): Promise<Template[]> {
  const { data, error } = await supabase
    .from("templates")
    .select("id,user_id,name,icon,exercise_ids,created_at,updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    console.warn("[loadTemplates] error:", error.message);
    return [];
  }
  return (data || []).map(mapRowToTemplate);
}

export async function saveTemplate(t: Template): Promise<{ ok: boolean; error?: string }> {
  // wstaw nowy rekord – user_id z auth
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return { ok: false, error: "Not authenticated" };

  const row = {
    id: t.id,
    user_id: userId,
    name: t.name,
    icon: t.icon,
    exercise_ids: t.exerciseIds,
    updated_at: new Date().toISOString(),
  };

  // upsert = jak istnieje (po id + user_id przez RLS) to nadpisze
  const { error } = await supabase.from("templates").upsert(row, { onConflict: "id" });

  if (error) {
    console.warn("[saveTemplate] error:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function updateTemplate(
  id: string,
  patch: Partial<Pick<Template, "name" | "icon" | "exerciseIds">>
): Promise<{ ok: boolean; error?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return { ok: false, error: "Not authenticated" };

  const upd: Partial<TemplateRecord> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.name != null) upd.name = patch.name;
  if (patch.icon != null) upd.icon = patch.icon;
  if (patch.exerciseIds != null) upd.exercise_ids = patch.exerciseIds;

  const { error } = await supabase
    .from("templates")
    .update(upd)
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.warn("[updateTemplate] error:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function deleteTemplate(id: string): Promise<{ ok: boolean; error?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase.from("templates").delete().eq("id", id).eq("user_id", userId);
  if (error) {
    console.warn("[deleteTemplate] error:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}