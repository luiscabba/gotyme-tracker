"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { setPasscode, unlock } from "@/lib/lock";
import { relTime } from "@/lib/dates";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

function Keypad({ title, sub, tone, busy, onCode }: { title: string; sub: string; tone?: "error"; busy: boolean; onCode: (c: string) => void }) {
  const [code, setCode] = useState("");
  const [shake, setShake] = useState(false);
  const press = useCallback((k: string) => {
    if (busy) return;
    setCode((c) => {
      const next = k === "del" ? c.slice(0, -1) : c.length < 6 ? c + k : c;
      if (next.length === 6) setTimeout(() => { onCode(next); setCode(""); }, 120);
      return next;
    });
  }, [busy, onCode]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (/^\d$/.test(e.key)) press(e.key); else if (e.key === "Backspace") press("del"); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);
  useEffect(() => { if (tone === "error") { setShake(true); const t = setTimeout(() => setShake(false), 400); return () => clearTimeout(t); } }, [tone, sub]);

  return (
    <div className="lock">
      <span className="orb" aria-hidden="true" style={{ width: 52, height: 52 }} />
      <h1>{title}</h1>
      <span className={`sub ${tone === "error" ? "err" : ""}`} role="status" aria-live="polite">{sub}</span>
      <div className={`dots ${shake ? "shake" : ""}`} aria-label={`${code.length} of 6 digits entered`}>
        {Array.from({ length: 6 }).map((_, i) => <i key={i} className={i < code.length ? "on" : ""} />)}
      </div>
      <div className="pad">
        {KEYS.map((k, i) => k === "" ? <span key={i} /> : (
          <button key={i} type="button" className={k === "del" ? "del" : ""} onClick={() => press(k)} disabled={busy} aria-label={k === "del" ? "Delete" : k}>
            {k === "del" ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5h11v14H9l-6-7z" /><path d="M12.5 9.5l5 5M17.5 9.5l-5 5" /></svg> : k}
          </button>
        ))}
      </div>
    </div>
  );
}

export function UnlockScreen() {
  const [sub, setSub] = useState("Enter your passcode");
  const [tone, setTone] = useState<"error" | undefined>();
  const [busy, setBusy] = useState(false);
  const [noCode, setNoCode] = useState(false);
  const onCode = useCallback(async (c: string) => {
    setBusy(true);
    const r = await unlock(c);
    setBusy(false);
    if (r.ok) { window.location.reload(); return; }
    setTone("error");
    if (r.error === "wrong") setSub(r.left && r.left > 0 ? `Wrong passcode. ${r.left} ${r.left === 1 ? "try" : "tries"} before a lockout.` : "Wrong passcode.");
    else if (r.error === "locked") setSub(`Too many tries. Try again after ${r.until ? relTime(r.until) : "a while"}.`);
    else if (r.error === "not_set") { setNoCode(true); setSub("No passcode yet. Sign in with an email link once to set one."); }
    else if (r.error === "network") setSub("No connection. Try again.");
    else setSub("That didn't work. Try again.");
  }, []);
  return (
    <main className="lock-wrap">
      <Keypad title="GoTyme Tracker" sub={sub} tone={tone} busy={busy} onCode={onCode} />
      <Link href="/login" className="sub lock-alt" style={noCode ? { fontWeight: 600, color: "var(--ink)" } : {}}>Forgot passcode? Email me a link</Link>
    </main>
  );
}

export function SetPasscodeScreen({ onDone, isNew }: { onDone: () => void; isNew: boolean }) {
  const [first, setFirst] = useState<string | null>(null);
  const [sub, setSub] = useState("6 digits. You'll use it to open the app.");
  const [tone, setTone] = useState<"error" | undefined>();
  const [busy, setBusy] = useState(false);
  const onCode = useCallback(async (c: string) => {
    if (!first) { setFirst(c); setTone(undefined); setSub("Enter it again to confirm"); return; }
    if (c !== first) { setFirst(null); setTone("error"); setSub("They didn't match. Start again."); return; }
    setBusy(true);
    const ok = await setPasscode(c);
    setBusy(false);
    if (ok) onDone(); else { setFirst(null); setTone("error"); setSub("Couldn't save it. Check your connection and try again."); }
  }, [first, onDone]);
  return (
    <main className="lock-wrap">
      <Keypad title={first ? "Confirm passcode" : isNew ? "Set a passcode" : "New passcode"} sub={sub} tone={tone} busy={busy} onCode={onCode} />
    </main>
  );
}
