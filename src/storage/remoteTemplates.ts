import { supabase } from "../lib/supabase";
import { getUserId } from "../lib/db.user";

export type TemplateRow = {
  id: string;
  name: string;
  icon: string;
  exerciseIds: string[];
  createdAt?: string;
  updatedAt?: string;
};

function genId(prefix = "t_") {
  return prefix + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Public defaults (read-only) */
export async function listDefaultTemplates(): Promise<TemplateRow[]> {
  const { data, error } = await supabase
    .from("default_templates")
    .select("id,name,icon,exercise_ids")
    .order("id", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    icon: r.icon,
    exerciseIds: r.exercise_ids ?? [],
  }));
}

/** User templates (CRUD) */
export async function listUserTemplates(): Promise<TemplateRow[]> {
  const { data, error } = await supabase
    .from("templates")
    .select("id,name,icon,exercise_ids,created_at,updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    icon: r.icon,
    exerciseIds: r.exercise_ids ?? [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function getUserTemplateById(id: string): Promise<TemplateRow | null> {
  const { data, error } = await supabase
    .from("templates")
    .select("id,name,icon,exercise_ids,created_at,updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    icon: data.icon,
    exerciseIds: data.exercise_ids ?? [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/** Create / Update (upsert by id) */
export async function upsertUserTemplate(input: {
  id?: string;
  name: string;
  icon: string;
  exerciseIds: string[];
}): Promise<string> {
  const uid = await getUserId();
  const id = input.id ?? genId();

  const { error } = await supabase.from("templates").upsert(
    {
      id,
      user_id: uid,
      name: input.name,
      icon: input.icon,
      exercise_ids: input.exerciseIds,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  if (error) {
    // UNIQUE (user_id, lower(name)) -> 23505
    if ((error as any).code === "23505") throw new Error("DUPLICATE_NAME");
    throw error;
  }
  return id;
}

export async function deleteUserTemplate(id: string) {
  const { error } = await supabase.from("templates").delete().eq("id", id);
  if (error) throw error;
}