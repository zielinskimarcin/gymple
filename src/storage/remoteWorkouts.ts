import { supabase } from "../lib/supabase";
import { getUserId } from "../lib/db.user";

export type SetRow = { id?: string; weight?: number; reps?: number; timeMin?: number; distance?: number };
export type ExRow  = { id: string; name: string; muscleGroup: string; sets: SetRow[] };

export type WorkoutDTO = {
  id: string;
  name: string;
  startedAt: number;
  endedAt?: number;
  durationSec: number;
  status: "finished" | "in_progress" | "canceled";
  exercises: ExRow[];
};

function genId(prefix = "w_") {
  return prefix + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function saveWorkoutRemote(input: Omit<WorkoutDTO, "id">): Promise<string> {
  const uid = await getUserId();
  const id = genId();

  const payload = {
    exercises: input.exercises ?? [],
    endedAt: input.endedAt ?? null,
  };

  const { error } = await supabase.from("workouts").insert({
    id,
    user_id: uid,
    name: input.name,
    started_at: new Date(input.startedAt).toISOString(),
    duration_sec: input.durationSec,
    status: input.status,
    payload,
  });

  if (error) throw error;
  return id;
}

export async function updateWorkoutNameRemote(id: string, name: string) {
  const { error } = await supabase.from("workouts").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function deleteWorkoutRemote(id: string) {
  const { error } = await supabase.from("workouts").delete().eq("id", id);
  if (error) throw error;
}

export async function getWorkoutRemote(id: string): Promise<WorkoutDTO | null> {
  const { data, error } = await supabase
    .from("workouts")
    .select("id,name,started_at,duration_sec,status,payload,created_at,updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const p = (data as any).payload || {};
  return {
    id: data.id,
    name: data.name,
    startedAt: new Date(data.started_at).getTime(),
    endedAt: p.endedAt ? new Date(p.endedAt).getTime() : undefined,
    durationSec: data.duration_sec,
    status: data.status,
    exercises: (p.exercises ?? []) as ExRow[],
  };
}

export async function listWorkoutsRemote(): Promise<WorkoutDTO[]> {
  const { data, error } = await supabase
    .from("workouts")
    .select("id,name,started_at,duration_sec,status,payload")
    .order("started_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => {
    const p = row.payload || {};
    return {
      id: row.id,
      name: row.name,
      startedAt: new Date(row.started_at).getTime(),
      endedAt: p.endedAt ? new Date(p.endedAt).getTime() : undefined,
      durationSec: row.duration_sec,
      status: row.status,
      exercises: (p.exercises ?? []) as ExRow[],
    } as WorkoutDTO;
  });
}