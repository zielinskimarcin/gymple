import { supabase } from "../lib/supabase";
import { getUserId } from "../lib/db.user";

export type RemoteExercise = {
  id: string;
  name: string;
  muscleGroup: string;
  isCustom: true;
  createdAt: number;
};

function genId() {
  return "c_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

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

export async function listCustomExercises(): Promise<RemoteExercise[]> {
  const uid = await getUserId();
  const { data, error } = await supabase
    .from("custom_exercises")
    .select("id,name,muscle_group,created_at")
    .eq("user_id", uid)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    muscleGroup: r.muscle_group,
    isCustom: true,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
  }));
}

export async function getCustomExerciseById(id: string): Promise<RemoteExercise | null> {
  const uid = await getUserId();
  const { data, error } = await supabase
    .from("custom_exercises")
    .select("id,name,muscle_group,created_at")
    .eq("id", id)
    .eq("user_id", uid)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    muscleGroup: data.muscle_group,
    isCustom: true,
    createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
  };
}

export async function createCustomExercise(name: string, muscleGroup: string): Promise<RemoteExercise> {
  const uid = await getUserId();
  if (await customExerciseNameExists(uid, name)) {
    throw new Error("DUPLICATE_NAME");
  }

  const id = genId();

  const { data, error } = await supabase
    .from("custom_exercises")
    .insert({
      id,
      user_id: uid,
      name,
      muscle_group: muscleGroup,
    })
    .select("id,name,muscle_group,created_at")
    .single();

  if (error) {
    if ((error as any).code === "23505") {
      throw new Error("DUPLICATE_NAME");
    }
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    muscleGroup: data.muscle_group,
    isCustom: true,
    createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
  };
}

export async function updateCustomExerciseRemote(id: string, patch: { name?: string; muscleGroup?: string }) {
  const uid = await getUserId();
  if (patch.name != null && await customExerciseNameExists(uid, patch.name, id)) {
    throw new Error("DUPLICATE_NAME");
  }

  const upd: any = {};
  if (patch.name != null) upd.name = patch.name;
  if (patch.muscleGroup != null) upd.muscle_group = patch.muscleGroup;

  const { error } = await supabase.from("custom_exercises").update(upd).eq("id", id).eq("user_id", uid);
  if (error) {
    if ((error as any).code === "23505") throw new Error("DUPLICATE_NAME");
    throw error;
  }
}

export async function deleteCustomExerciseRemote(id: string) {
  const uid = await getUserId();
  const { error } = await supabase.from("custom_exercises").delete().eq("id", id).eq("user_id", uid);
  if (error) throw error;
}
