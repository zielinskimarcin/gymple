import { supabase } from "./supabase";

export async function getUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("No user");
  return data.user.id;
}