import { supabase } from "../lib/supabase";

export type Exercise = {
  id: string;
  name: string;
  muscleGroup: string;
  isCustom?: boolean;
  createdAt?: number;
};

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

async function customExerciseNameExists(userId: string, name: string, exceptId?: string) {
  const normalized = normalizeName(name);
  if (!normalized) return false;

  const { data, error } = await supabase
    .from("custom_exercises")
    .select("id,name")
    .eq("user_id", userId);

  if (error) return false;
  return (data ?? []).some((row) => row.id !== exceptId && normalizeName(row.name) === normalized);
}

export async function fetchCustomExercises(): Promise<Exercise[]> {
  const { data: u } = await supabase.auth.getUser();
  const userId = u?.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from("custom_exercises")
    .select("id,name,muscle_group,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data || []).map((r) => ({
    id: r.id,
    name: r.name,
    muscleGroup: r.muscle_group,
    isCustom: true,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : undefined,
  }));
}

export async function createCustomExercise(name: string, muscleGroup: string) {
  const { data: u } = await supabase.auth.getUser();
  const userId = u?.user?.id;
  if (!userId) return { ok: false, error: "Not authenticated" };

  if (await customExerciseNameExists(userId, name)) {
    return { ok: false, error: "This exercise already exists." };
  }

  const id = "c_" + Date.now();
  const row = { id, user_id: userId, name, muscle_group: muscleGroup };

  const { error } = await supabase.from("custom_exercises").insert(row);
  if (error) {
    if ((error as any).code === "23505") return { ok: false, error: "This exercise already exists." };
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    ex: <Exercise>{ id, name, muscleGroup, isCustom: true, createdAt: Date.now() },
  };
}

export async function updateCustomExercise(id: string, patch: Partial<Pick<Exercise, "name" | "muscleGroup">>) {
  const { data: u } = await supabase.auth.getUser();
  const userId = u?.user?.id;
  if (!userId) return { ok: false, error: "Not authenticated" };

  if (patch.name != null && await customExerciseNameExists(userId, patch.name, id)) {
    return { ok: false, error: "This exercise already exists." };
  }

  const upd: any = {};
  if (patch.name != null) upd.name = patch.name;
  if (patch.muscleGroup != null) upd.muscle_group = patch.muscleGroup;

  const { error } = await supabase.from("custom_exercises").update(upd).eq("id", id).eq("user_id", userId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteCustomExercise(id: string) {
  const { data: u } = await supabase.auth.getUser();
  const userId = u?.user?.id;
  if (!userId) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase.from("custom_exercises").delete().eq("id", id).eq("user_id", userId);
  return error ? { ok: false, error: error.message } : { ok: true };
}
