import { supabase } from "./supabase";

const FN = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/passcode`;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const STAMP = "gt_unlocked_at";
const RESET = "gt_reset_passcode";
const DAYS_30 = 30 * 864e5;

const get = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const put = (k: string, v: string | null) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* storage off */ } };

/** This device was unlocked within the last 30 days. */
export const isFresh = () => { const v = Number(get(STAMP)); return v > 0 && Date.now() - v < DAYS_30; };
export const markUnlocked = () => put(STAMP, String(Date.now()));
export const lockNow = () => put(STAMP, null);
export const wantsReset = () => get(RESET) === "1";
export const askReset = (on: boolean) => put(RESET, on ? "1" : null);

type Fail = { ok: false; error: "wrong" | "locked" | "not_set" | "network" | "other"; left?: number; until?: string };

async function call(body: object, token?: string) {
  const r = await fetch(FN, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: KEY, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return { status: r.status, data: await r.json().catch(() => ({})) };
}

export async function unlock(code: string): Promise<{ ok: true } | Fail> {
  try {
    const { data } = await call({ action: "unlock", code });
    if (data.token_hash) {
      const { error } = await supabase().auth.verifyOtp({ token_hash: data.token_hash, type: "magiclink" });
      if (error) return { ok: false, error: "other" };
      markUnlocked();
      return { ok: true };
    }
    if (data.error === "wrong") return { ok: false, error: "wrong", left: data.left };
    if (data.error === "locked") return { ok: false, error: "locked", until: data.until };
    if (data.error === "not_set") return { ok: false, error: "not_set" };
    return { ok: false, error: "other" };
  } catch {
    return { ok: false, error: "network" };
  }
}

export async function setPasscode(code: string): Promise<boolean> {
  try {
    const { data: { session } } = await supabase().auth.getSession();
    if (!session) return false;
    const { data } = await call({ action: "set", code }, session.access_token);
    if (!data.ok) return false;
    markUnlocked();
    askReset(false);
    return true;
  } catch {
    return false;
  }
}
