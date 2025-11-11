import { supabase } from "../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

/** ====== DB row (jak w Twojej tabeli) ====== */
export type TemplateRecord = {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  exercise_ids: string[];
  created_at?: string;
  updated_at?: string;
};

/** ====== Typ używany w UI ====== */
export type Template = {
  id: string;
  name: string;
  icon: string;          // klucz z TEMPLATE_ICON_MAP
  exerciseIds: string[]; // w DB: exercise_ids

  // pochodne (scalone z tabeli favourites użytkownika)
  favorite?: boolean;
  favoriteAt?: string;   // ISO z template_favourites.created_at
};

/** ====== SELECTED TEMPLATE (lokalnie) ====== */
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

/** ====== Helpers ====== */
function mapRowToTemplate(r: TemplateRecord): Template {
  return {
    id: r.id,
    name: r.name,
    icon: r.icon,
    exerciseIds: r.exercise_ids || [],
  };
}

/** ====== CRUD: templates (DB) + merge z tabelą template_favourites ====== */
export async function loadTemplates(): Promise<Template[]> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return [];

  // 1) Szablony użytkownika
  const { data: trows, error: terr } = await supabase
    .from("templates")
    .select("id,user_id,name,icon,exercise_ids,created_at,updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (terr) {
    console.warn("[loadTemplates] templates error:", terr.message);
  }
  const templates = (trows || []).map(mapRowToTemplate);

  // 2) Favourites użytkownika
  const { data: favs, error: ferr } = await supabase
    .from("template_favourites")
    .select("template_id,created_at")
    .eq("user_id", userId);

  if (ferr) {
    console.warn("[loadTemplates] favourites error:", ferr.message);
  }

  const favMap = new Map<string, string>();
  (favs || []).forEach((f: any) => favMap.set(f.template_id, f.created_at));

  // 3) Merge flag
  const merged = templates.map((t) =>
    favMap.has(t.id)
      ? { ...t, favorite: true, favoriteAt: favMap.get(t.id)! }
      : t
  );

  return merged;
}

/** Insert / upsert do DB */
export async function saveTemplate(t: Template): Promise<{ ok: boolean; error?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return { ok: false, error: "Not authenticated" };

  const row: TemplateRecord = {
    id: t.id,
    user_id: userId,
    name: t.name,
    icon: t.icon,
    exercise_ids: t.exerciseIds,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("templates").upsert(row, { onConflict: "id" });
  if (error) {
    console.warn("[saveTemplate] error:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Update pól w DB */
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

  if (Object.keys(upd).length > 1) {
    const { error } = await supabase
      .from("templates")
      .update(upd)
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.warn("[updateTemplate] error:", error.message);
      return { ok: false, error: error.message };
    }
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

  // porządek: usuń ewentualny favourite
  await supabase.from("template_favourites").delete().eq("template_id", id).eq("user_id", userId);

  return { ok: true };
}

/** ====== FAVOURITES (DB) ====== */
export async function setFavourite(templateId: string, fav: boolean): Promise<{ ok: boolean; error?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return { ok: false, error: "Not authenticated" };

  if (fav) {
    const { error } = await supabase
      .from("template_favourites")
      .upsert({ user_id: userId, template_id: templateId }, { onConflict: "user_id,template_id" });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } else {
    const { error } = await supabase
      .from("template_favourites")
      .delete()
      .eq("user_id", userId)
      .eq("template_id", templateId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
}