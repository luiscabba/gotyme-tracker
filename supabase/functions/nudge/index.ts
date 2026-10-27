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

type Item = { title: string; steps: string[]; step: number; owners: string[] | null; waiting_on: string | null; chase_on: string | null; start_by: string | null; due: string | null; priority: number };

// One thing per reminder: chase someone, else start your next step, else send a ready email.
async function digest() {
  const t = manilaToday();
  const { data: items } = await admin.from("items").select("title,steps,step,owners,waiting_on,chase_on,start_by,due,priority").neq("status", "done");
  const { data: drafts } = await admin.from("drafts").select("id").eq("status", "pending");
  const open = (items ?? []) as Item[];
  const key = (i: Item) => i.start_by ?? i.due ?? "9999-12-31";

  const chase = open.filter((i) => i.waiting_on && i.chase_on && i.chase_on <= t).sort((a, b) => a.chase_on!.localeCompare(b.chase_on!));
  if (chase.length) return { title: `Chase ${chase[0].waiting_on} today`, body: "", url: `/chase/${encodeURIComponent(chase[0].waiting_on!)}` };

  const late = open.filter((i) => !i.waiting_on && (i.owners?.[i.step] ?? "you") === "you" && key(i) <= t).sort((a, b) => key(a).localeCompare(key(b)) || b.priority - a.priority);
  if (late.length) return { title: `Today: ${late[0].steps?.[late[0].step] ?? late[0].title}`, body: "", url: "/" };

  const n = drafts?.length ?? 0;
  if (n) return { title: n === 1 ? "An email is ready to send" : `${n} emails are ready to send`, body: "", url: "/claude" };
  return null;
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
    return json(await pushAll({ title: "Reminders are on", body: "", url: "/" }));
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
