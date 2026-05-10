// src/lib/units.ts
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

/** Ensures the user has a profiles row; returns the user id or null */
async function getUidEnsuringRow(): Promise<string | null> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id ?? null;
  if (!uid) return null;

  // If row missing, try to insert a skeleton row (RLS must allow this)
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", uid)
    .maybeSingle();

  if (!error && !data) {
    const { error: insErr } = await supabase
      .from("profiles")
      .insert({ id: uid, units_weight: "kg" });
    // If insert fails due to RLS, caller will still try UPDATE and we’ll surface error.
    if (insErr) {
      // no throw; we’ll try update later which will fail with a clear error
    }
  }
  return uid;
}

/** Returns {ok:true} or {ok:false,error} and caches locally on success */
export async function setWeightUnit(next: WeightUnit): Promise<{ ok: boolean; error?: string }> {
  const val = normalize(next);
  const uid = await getUidEnsuringRow();
  if (!uid) return { ok: false, error: "Not authenticated" };

  // Try UPDATE first (cleaner with RLS “update own row”)
  const { error: updErr } = await supabase
    .from("profiles")
    .update({ units_weight: val })
    .eq("id", uid);

  if (updErr) {
    // As a fallback, attempt UPSERT (in case row still doesn’t exist but insert is allowed)
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