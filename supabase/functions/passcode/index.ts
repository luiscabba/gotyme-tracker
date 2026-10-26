// Passcode unlock for GoTyme Tracker.
// POST { action: "set", code }    with the owner's session token: stores a new 6-digit passcode.
// POST { action: "unlock", code } with no session: checks the passcode and returns a one-time
//   token_hash the app exchanges for a session with supabase.auth.verifyOtp.
// Wrong tries are counted on the server. After 5 in a row the lock lasts 1 minute, doubling
// with each further miss, up to 24 hours. The owner email never ships in app code.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const unhex = (s: string) => new Uint8Array(s.match(/../g)!.map((h) => parseInt(h, 16)));

async function derive(code: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(code), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 210000 }, key, 256);
  return hex(bits);
}

function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

async function ownerEmail() {
  const { data } = await admin.from("app_private").select("value").eq("key", "owner_email").single();
  return data!.value as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let body: { action?: string; code?: string };
  try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400); }
  const code = String(body.code ?? "");
  if (!/^\d{6}$/.test(code)) return json({ error: "bad_code" }, 400);
  const owner = await ownerEmail();

  if (body.action === "set") {
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data } = await admin.auth.getUser(jwt);
    if (!data.user || data.user.email !== owner) return json({ error: "not_owner" }, 401);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await derive(code, salt);
    const { error } = await admin.from("passcode").upsert({ id: 1, salt: hex(salt), hash, fails: 0, locked_until: null, updated_at: new Date().toISOString() });
    if (error) return json({ error: "save_failed" }, 500);
    await admin.from("settings").update({ passcode_set: true }).eq("id", 1);
    await admin.from("activity").insert({ text: "Passcode set", source: "app" });
    return json({ ok: true });
  }

  if (body.action === "unlock") {
    const { data: row } = await admin.from("passcode").select("*").eq("id", 1).maybeSingle();
    if (!row) return json({ error: "not_set" }, 409);
    const now = Date.now();
    if (row.locked_until && new Date(row.locked_until).getTime() > now) return json({ error: "locked", until: row.locked_until }, 429);
    const ok = same(await derive(code, unhex(row.salt)), row.hash);
    if (!ok) {
      const fails = row.fails + 1;
      const lockMin = fails >= 5 ? Math.min(2 ** (fails - 5), 1440) : 0;
      const until = lockMin ? new Date(now + lockMin * 60000).toISOString() : null;
      await admin.from("passcode").update({ fails, locked_until: until }).eq("id", 1);
      return json(until ? { error: "locked", until } : { error: "wrong", left: 5 - fails }, until ? 429 : 401);
    }
    await admin.from("passcode").update({ fails: 0, locked_until: null }).eq("id", 1);
    const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: owner });
    if (error || !data.properties?.hashed_token) return json({ error: "session_failed" }, 500);
    return json({ token_hash: data.properties.hashed_token });
  }

  return json({ error: "bad_action" }, 400);
});
