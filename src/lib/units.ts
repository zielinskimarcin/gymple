import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

const KEY = "units_weight";
export type WeightUnit = "kg" | "lbs";

function normalize(v: any): WeightUnit {
  const t = String(v ?? "").toLowerCase().trim();
  if (t === "kg") return "kg";
  if (t === "lb" || t === "lbs") return "lbs";
  return "kg";
}

export async function getWeightUnit(): Promise<WeightUnit> {
  try {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (uid) {
      const { data, error } = await supabase
        .from("profiles")
        .select("units_weight")
        .eq("id", uid)
        .maybeSingle<{ units_weight: string | null }>();
      if (!error) {
        const val = normalize(data?.units_weight);
        try { await AsyncStorage.setItem(KEY, val); } catch {}
        return val;
      }
    }
  } catch {}
  try {
    const local = await AsyncStorage.getItem(KEY);
    return normalize(local);
  } catch {}
  return "kg";
}

async function getUidEnsuringRow(): Promise<string | null> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id ?? null;
  if (!uid) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", uid)
    .maybeSingle();

  if (!error && !data) {
    await supabase
      .from("profiles")
      .insert({ id: uid, units_weight: "kg" });
  }
  return uid;
}

export async function setWeightUnit(next: WeightUnit): Promise<{ ok: boolean; error?: string }> {
  const val = normalize(next);
  const uid = await getUidEnsuringRow();
  if (!uid) return { ok: false, error: "Not authenticated" };

  const { error: updErr } = await supabase
    .from("profiles")
    .update({ units_weight: val })
    .eq("id", uid);

  if (updErr) {
    const { error: upsertErr } = await supabase
      .from("profiles")
      .upsert({ id: uid, units_weight: val }, { onConflict: "id" });

    if (upsertErr) {
      return { ok: false, error: upsertErr.message || updErr.message || "Update failed" };
    }
  }

  try { await AsyncStorage.setItem(KEY, val); } catch {}
  return { ok: true };
}
