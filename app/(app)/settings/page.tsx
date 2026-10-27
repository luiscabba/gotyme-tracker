"use client";
import { useEffect, useState } from "react";
import { Header } from "@/components/Shell";
import { useData } from "@/lib/store";
import { askReset, lockNow } from "@/lib/lock";
import { scriptableWidget } from "@/lib/widgetScript";
import { disablePush, enablePush, pushState, sendTest, type PushState } from "@/lib/push";
import type { Settings } from "@/lib/types";

export default function SettingsPage() {
  const { settings, upsert } = useData();
  const [f, setF] = useState<Settings | null>(settings);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState("");
  const [origin, setOrigin] = useState("");
  useEffect(() => { setF(settings); }, [settings]);
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const [push, setPush] = useState<PushState | null>(null);
  const [pushMsg, setPushMsg] = useState("");
  const [pushBusy, setPushBusy] = useState(false);
  useEffect(() => { pushState().then(setPush).catch(() => setPush("unsupported")); }, []);
  async function togglePush(on: boolean) {
    setPushBusy(true);
    setPushMsg("");
    try {
      if (on) setPush(await enablePush()); else { await disablePush(); setPush("off"); }
    } catch (e) { setPushMsg(e instanceof Error ? e.message : "That didn't work. Try again."); }
    setPushBusy(false);
  }
  async function test() {
    setPushBusy(true);
    const r = await sendTest();
    setPushMsg("error" in r ? r.error : r.sent > 0 ? "Sent. It should arrive in a few seconds." : "Nothing was sent. Turn reminders off and on again.");
    setPushBusy(false);
  }
  if (!f) return null;
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => { setSaved(false); setF({ ...f, [k]: v }); };
  const num = (v: string) => (v === "" ? null : Number(v));
  const feed = `${origin}/api/widget?t=${f.widget_token}`;
  const script = scriptableWidget(feed, origin);

  async function copy(text: string, what: string) {
    try { await navigator.clipboard.writeText(text); setCopied(what); } catch { setCopied("Select the text and copy it manually"); }
  }

  return (
    <main className="wrap">
      <Header title="Settings" />
      <form className="tile" onSubmit={async (e) => { e.preventDefault(); const { widget_token, ...rest } = f; void widget_token; if (await upsert("settings", rest)) setSaved(true); }}>
        <div className="pair">
          <div className="field"><label htmlFor="s-start">Start date</label><input id="s-start" type="date" value={f.start_date} onChange={(e) => set("start_date", e.target.value)} /></div>
          <div className="field"><label htmlFor="s-shift">Shift starts</label><input id="s-shift" type="time" value={f.shift_start.slice(0, 5)} onChange={(e) => set("shift_start", e.target.value)} /></div>
        </div>
        <div className="pair">
          <div className="field"><label htmlFor="s-hours">Shift length, hours</label><input id="s-hours" type="number" min={1} max={16} step={0.5} value={f.shift_hours} onChange={(e) => set("shift_hours", Number(e.target.value))} /></div>
          <div className="field"><label htmlFor="s-break">Break, minutes</label><input id="s-break" type="number" min={0} max={180} step={5} value={f.break_min} onChange={(e) => set("break_min", Number(e.target.value))} /></div>
        </div>
        <div className="pair">
          <div className="field"><label htmlFor="s-vl">Vacation leave left</label><input id="s-vl" type="number" min={0} step={0.5} value={f.vl ?? ""} onChange={(e) => set("vl", num(e.target.value))} /></div>
          <div className="field"><label htmlFor="s-sl">Sick leave left</label><input id="s-sl" type="number" min={0} step={0.5} value={f.sl ?? ""} onChange={(e) => set("sl", num(e.target.value))} /></div>
        </div>
        <button type="submit" className="btn">{saved ? "Saved" : "Save settings"}</button>
      </form>

      <section className="tile">
        <span style={{ fontSize: 17, fontWeight: 600 }}>Reminders</span>
        <span className="sub" style={{ fontSize: 14, lineHeight: 1.4 }}>A nudge at 8:00 and 18:00 Manila time, only when something needs you: steps past their start date, drafts waiting, or someone you should chase. Nothing is sent when you are up to date.</span>
        {push === "needs-install" && <span className="note">On iPhone, open this in Safari, tap Share, then Add to Home Screen. Open it from the home screen to turn reminders on.</span>}
        {push === "unsupported" && <span className="note">This browser can't receive reminders.</span>}
        {push === "blocked" && <span className="note">Notifications are blocked for this app. Allow them in your device settings, then come back.</span>}
        {push === "off" && <button type="button" className="btn" disabled={pushBusy} onClick={() => togglePush(true)}>{pushBusy ? "Turning on" : "Turn on reminders"}</button>}
        {push === "on" && (
          <div className="btns">
            <button type="button" className="btn" disabled={pushBusy} onClick={test}>Send a test</button>
            <button type="button" className="btn ghost" disabled={pushBusy} onClick={() => togglePush(false)}>Turn off</button>
          </div>
        )}
        {pushMsg && <span className="sub" role="status">{pushMsg}</span>}
      </section>

      <section className="tile">
        <span style={{ fontSize: 17, fontWeight: 600 }}>Home screen widget</span>
        <span className="sub" style={{ fontSize: 14, lineHeight: 1.4 }}>On iPhone, install Scriptable, make a new script, paste this in, then add a Scriptable widget to your home screen and pick the script. On Android, use the feed link with KWGT or a similar widget app.</span>
        <div className="code">{script}</div>
        <div className="btns">
          <button type="button" className="btn" onClick={() => copy(script, "Script copied")}>Copy script</button>
          <button type="button" className="btn ghost" onClick={() => copy(feed, "Feed link copied")}>Copy feed link</button>
        </div>
        {copied && <span className="sub">{copied}</span>}
        <span className="sub">The feed link works without signing in, so keep it private. It shows only your next step and counts.</span>
      </section>

      <div className="btns">
        <button type="button" className="btn ghost" onClick={() => { askReset(true); window.location.reload(); }}>Change passcode</button>
        <button type="button" className="btn ghost" onClick={() => { lockNow(); window.location.reload(); }}>Lock now</button>
      </div>
    </main>
  );
}
