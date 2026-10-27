import { supabase } from "./supabase";

const FN = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/nudge`;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export type PushState = "unsupported" | "needs-install" | "blocked" | "off" | "on";

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const standalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

function keyBytes(b64: string) {
  const raw = atob(b64.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(b64.length / 4) * 4, "="));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function call(body: object, token?: string) {
  const r = await fetch(FN, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: KEY, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return r.json().catch(() => ({}));
}

export async function pushState(): Promise<PushState> {
  if (isIos() && !standalone()) return "needs-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

export async function enablePush(): Promise<PushState> {
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return perm === "denied" ? "blocked" : "off";
  const reg = await navigator.serviceWorker.ready;
  const { key } = await call({ action: "key" });
  if (!key) throw new Error("Could not get the reminder key");
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }));
  const j = sub.toJSON();
  const { error } = await supabase().from("push_subs").upsert({ endpoint: sub.endpoint, p256dh: j.keys!.p256dh, auth: j.keys!.auth, ua: navigator.userAgent.slice(0, 200) });
  if (error) throw new Error(error.message);
  return "on";
}

export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await supabase().from("push_subs").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}

export async function sendTest(): Promise<{ sent: number; total: number } | { error: string }> {
  const { data: { session } } = await supabase().auth.getSession();
  if (!session) return { error: "Not signed in" };
  return call({ action: "test" }, session.access_token);
}
