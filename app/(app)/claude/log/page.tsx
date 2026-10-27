"use client";
import { useRouter } from "next/navigation";
import { IconBack } from "@/components/Icons";
import { useData } from "@/lib/store";
import { addDays, fmtLong, today } from "@/lib/dates";
import type { Activity } from "@/lib/types";

const manilaDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));

export default function ClaudeLog() {
  const router = useRouter();
  const { activity, upsert } = useData();
  const t = today();
  const label = (d: string) => (d === t ? "Today" : d === addDays(t, -1) ? "Yesterday" : fmtLong(d));
  const canUndo = (a: Activity) => !!a.undo && !a.undone_at && Date.now() - new Date(a.at).getTime() < 7 * 864e5;
  const undo = async (a: Activity) => {
    if (!a.undo) return;
    if (await upsert(a.undo.table, a.undo.row)) await upsert("activity", { ...a, undone_at: new Date().toISOString() });
  };
  const days: [string, Activity[]][] = [];
  for (const a of activity.filter((x) => x.source === "agent").slice(0, 20)) {
    const d = manilaDay(a.at);
    const last = days[days.length - 1];
    if (last && last[0] === d) last[1].push(a); else days.push([d, [a]]);
  }

  return (
    <main className="wrap">
      <div className="row"><button type="button" className="icon-btn" onClick={() => router.back()} aria-label="Back"><IconBack /></button></div>
      <h1 style={{ margin: 0, padding: "0 6px", fontSize: 28, fontWeight: 700, letterSpacing: "-.6px" }}>What Claude did</h1>
      {days.length === 0 && <div className="tile"><span className="empty">When Claude files, renames or checks something, it shows here.</span></div>}
      {days.map(([d, list]) => (
        <section key={d} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="sec"><span style={{ color: "var(--muted)" }}>{label(d)}</span><span /></div>
          <div className="tile flush">
            {list.map((a) => (
              <div key={a.id} className="lrow" style={{ minHeight: 52 }}>
                <span className="t"><span style={{ fontSize: 15 }} className={a.undone_at ? "done-t" : ""}>{a.text}</span></span>
                {canUndo(a) && <button type="button" className="undo" onClick={() => undo(a)}>Undo</button>}
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
