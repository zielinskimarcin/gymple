import { supabase } from "../lib/supabase";

export type WorkoutPayload = {
  exercises: Array<{
    id: string;
    name: string;
    muscleGroup: string;
    sets: Array<{ id: string; weight?: number; reps?: number; timeMin?: number; distance?: number }>;
  }>;
};

export type DbWorkout = {
  id: string;
  user_id: string;
  name: string;
  started_at: string;
  duration_sec: number;
  status: "finished" | "in_progress" | "canceled";
  payload: WorkoutPayload;
  created_at?: string;
  updated_at?: string;
};

export async function listWorkouts(userId: string): Promise<DbWorkout[]> {
  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DbWorkout[];
}

export async function getWorkoutById(id: string, userId: string): Promise<DbWorkout | null> {
  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data as DbWorkout) || null;
}

export async function insertWorkout(w: Omit<DbWorkout, "user_id">, userId: string) {
  const { error } = await supabase.from("workouts").insert([{ ...w, user_id: userId }]);
  if (error) throw error;
}

export async function updateWorkoutDb(id: string, patch: Partial<DbWorkout>, userId: string) {
  const { error } = await supabase.from("workouts").update(patch).eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function deleteWorkoutDb(id: string, userId: string) {
  const { error } = await supabase.from("workouts").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}
