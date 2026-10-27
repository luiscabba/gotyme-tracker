// Reminders for GoTyme Tracker, sent as web push to the owner's devices.
// POST { action: "key" }  no auth: returns the public VAPID key (created on first use).
// POST { action: "test" } with the owner's session token: sends a test notification.
// POST { action: "send" } with header x-nudge-secret (pg_cron): sends the digest if something needs the owner.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-nudge-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const priv = async (key: string) => {
  const { data } = await admin.from("app_private").select("value").eq("key", key).maybeSingle();
  return data?.value as string | undefined;
};

async function vapid() {
  let pub = await priv("vapid_public");
  let sec = await priv("vapid_private");
  if (!pub || !sec) {
    const k = webpush.generateVAPIDKeys();
    pub = k.publicKey;
    sec = k.privateKey;
    await admin.from("app_private").upsert([{ key: "vapid_public", value: pub }, { key: "vapid_private", value: sec }]);
  }
  return { pub, sec };
}

const manilaToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const dayDiff = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

type Item = { title: string; steps: string[]; step: number; owners: string[] | null; waiting_on: string | null; start_by: string | null; due: string | null; updated_at: string; priority: number };

async function digest() {
  const t = manilaToday();
  const { data: s } = await admin.from("settings").select("start_date").eq("id", 1).single();
  const { data: items } = await admin.from("items").select("title,steps,step,owners,waiting_on,start_by,due,updated_at,priority").neq("status", "done");
  const { data: drafts } = await admin.from("drafts").select("id").eq("status", "pending");
  const open = (items ?? []) as Item[];
  const mine = open.filter((i) => !i.waiting_on && (i.owners?.[i.step] ?? "you") === "you");
  const key = (i: Item) => i.start_by ?? i.due ?? "9999-12-31";
  const late = mine.filter((i) => key(i) <= t).sort((a, b) => key(a).localeCompare(key(b)) || b.priority - a.priority);
  const chase = open.filter((i) => i.waiting_on && Date.now() - new Date(i.updated_at).getTime() > 4 * 864e5);
  const nDrafts = drafts?.length ?? 0;
  if (!late.length && !nDrafts && !chase.length) return null;

  const toStart = s ? dayDiff(t, s.start_date) : 0;
  const head = toStart > 0 ? `Day 1 in ${toStart} day${toStart === 1 ? "" : "s"}` : "GoTyme";
  const title = late.length ? `${head} · ${late.length} to start now` : nDrafts ? `${head} · ${nDrafts} draft${nDrafts === 1 ? "" : "s"} need you` : `${head} · time to chase`;
  const parts: string[] = [];
  if (late.length) {
    const i = late[0];
    const action = i.steps?.[i.step] ?? i.title;
    parts.push(`Next: ${action}${action !== i.title ? ` (${i.title})` : ""}`);
  }
  if (nDrafts && late.length) parts.push(`${nDrafts} draft${nDrafts === 1 ? "" : "s"} waiting for you`);
  if (chase.length) parts.push(`Chase ${[...new Set(chase.map((i) => i.waiting_on))].join(", ")}`);
  return { title, body: parts.join(". "), url: "/" };
}

async function pushAll(payload: { title: string; body: string; url: string }) {
  const { pub, sec } = await vapid();
  const owner = await priv("owner_email");
  webpush.setVapidDetails(`mailto:${owner}`, pub, sec);
  const { data: subs } = await admin.from("push_subs").select("*");
  let sent = 0;
  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), { TTL: 6 * 3600 });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await admin.from("push_subs").delete().eq("endpoint", sub.endpoint);
    }
  }
  return { sent, total: subs?.length ?? 0 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let body: { action?: string };
  try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400); }

  if (body.action === "key") return json({ key: (await vapid()).pub });

  if (body.action === "test") {
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data } = await admin.auth.getUser(jwt);
    if (!data.user || data.user.email !== (await priv("owner_email"))) return json({ error: "not_owner" }, 401);
    return json(await pushAll({ title: "Reminders are on", body: "You will get a nudge here when something needs you.", url: "/" }));
  }

  if (body.action === "send") {
    const secret = await priv("nudge_secret");
    if (!secret || req.headers.get("x-nudge-secret") !== secret) return json({ error: "forbidden" }, 403);
    const d = await digest();
    if (!d) return json({ sent: 0, skipped: "nothing needs you" });
    return json(await pushAll(d));
  }

  return json({ error: "bad_action" }, 400);
});
