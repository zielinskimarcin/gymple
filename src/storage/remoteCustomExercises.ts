import { supabase } from "../lib/supabase";
import { getUserId } from "../lib/db.user";

export type RemoteExercise = {
  id: string;
  name: string;
  muscleGroup: string;
  isCustom: true;
  createdAt: number;
};

// prosty generator id tekstowego (zgodny z Twoim stylem “c_...”)
function genId() {
  return "c_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function listCustomExercises(): Promise<RemoteExercise[]> {
  const { data, error } = await supabase
    .from("custom_exercises")
    .select("id,name,muscle_group,created_at")
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
  const { data, error } = await supabase
    .from("custom_exercises")
    .select("id,name,muscle_group,created_at")
    .eq("id", id)
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
    // 23505 = unique_violation (tu: (user_id, lower(name)))
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
  const upd: any = {};
  if (patch.name != null) upd.name = patch.name;
  if (patch.muscleGroup != null) upd.muscle_group = patch.muscleGroup;

  const { error } = await supabase.from("custom_exercises").update(upd).eq("id", id);
  if (error) {
    if ((error as any).code === "23505") throw new Error("DUPLICATE_NAME");
    throw error;
  }
}

export async function deleteCustomExerciseRemote(id: string) {
  const { error } = await supabase.from("custom_exercises").delete().eq("id", id);
  if (error) throw error;
}