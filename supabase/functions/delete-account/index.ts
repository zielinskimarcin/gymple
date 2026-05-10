import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type Json = Record<string, unknown>;
type DeleteTarget = { table: string; column: string };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("ADMIN_KEY") ?? "";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase Edge Function environment variables");
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DELETE_TARGETS: DeleteTarget[] = [
  { table: "template_favourites", column: "user_id" },
  { table: "workouts", column: "user_id" },
  { table: "templates", column: "user_id" },
  { table: "custom_exercises", column: "user_id" },
  { table: "profiles", column: "id" },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const auth = req.headers.get("authorization") ?? req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized: no bearer token" }, 401);
    }
    const accessToken = auth.replace("Bearer ", "").trim();

    const server = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: userRes, error: userErr } = await server.auth.getUser(accessToken);
    if (userErr || !userRes?.user) {
      return json({ error: "Unauthorized: invalid token" }, 401);
    }
    const user = userRes.user;

    for (const target of DELETE_TARGETS) {
      const { error } = await server.from(target.table).delete().eq(target.column, user.id);
      if (error) {
        return json(
          { error: "Could not delete account data", table: target.table, detail: error.message },
          500
        );
      }
    }

    const { error: delErr } = await server.auth.admin.deleteUser(user.id);
    if (delErr) {
      return json({ error: delErr.message ?? "Delete user failed" }, 500);
    }

    return json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return json({ error: message }, 500);
  }
});

function json(body: Json, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
