"use client";
import Link from "next/link";
import { Header } from "@/components/Shell";
import { IconCheck, IconPlus } from "@/components/Icons";
import { useData } from "@/lib/store";
import { rankOpen, whenChip } from "@/lib/logic";
import { addDays, diffDays, fmtShort, today } from "@/lib/dates";

export default function Path() {
  const { settings, items } = useData();
  if (!settings) return null;
  const t = today();
  const end = settings.start_date > addDays(t, 6) ? settings.start_date : addDays(t, 14);
  const span = Math.max(1, diffDays(t, end));
  const pct = (d: string) => Math.min(100, Math.max(0, (diffDays(t, d) / span) * 100));
  const open = rankOpen(items).concat(items.filter((i) => i.status !== "done" && i.waiting_on));
  const done = items.filter((i) => i.status === "done").sort((a, b) => String(b.done_at).localeCompare(String(a.done_at)));
  const ticks = [7, 14, 21].map((n) => addDays(t, n)).filter((d) => d < end);

  return (
    <main className="wrap">
      <Header title="Path to Day 1">
        <Link className="icon-btn dark" href="/item/new" aria-label="Add a requirement"><IconPlus /></Link>
      </Header>

      <div className="tile" style={{ gap: 4 }}>
        <div style={{ position: "relative", height: 20, fontSize: 11, color: "var(--muted)" }}>
          <span style={{ position: "absolute", left: 0 }}>Today</span>
          {ticks.map((d) => <span key={d} style={{ position: "absolute", left: `${pct(d)}%`, transform: "translateX(-50%)" }}>{fmtShort(d)}</span>)}
          <span style={{ position: "absolute", right: 0, fontWeight: 700, color: "var(--ink)" }}>{end === settings.start_date ? `Day 1 · ${fmtShort(end)}` : fmtShort(end)}</span>
        </div>
        <div className="track">
          <div className="now" />
          {ticks.map((d) => <div key={d} className="tick" style={{ left: `${pct(d)}%` }} />)}
          {end === settings.start_date && <div className="end" />}
          {open.length === 0 && <span className="empty" style={{ paddingLeft: 10 }}>Nothing left before Day 1.</span>}
          {open.map((i) => {
            const c = whenChip(i);
            const s = i.start_by && i.start_by > t ? i.start_by : t;
            const e = i.due && i.due < end ? (i.due > s ? i.due : addDays(s, 1)) : end;
            const mine = i.waiting_on ? s : (i.start_by ? addDays(s, Math.min(3, Math.max(1, i.steps.length - i.step))) : e);
            const mineEnd = mine < e ? mine : e;
            return (
              <Link key={i.id} href={`/item/${i.id}`} style={{ display: "flex", flexDirection: "column", gap: 5, color: "inherit", textDecoration: "none", position: "relative" }}>
                <div className="between" style={{ fontSize: 13, paddingLeft: 8 }}>
                  <span style={{ fontWeight: i.priority > 0 || c.tone === "danger" ? 600 : 500, minWidth: 0, overflowWrap: "anywhere" }}>{i.title}</span>
                  <span style={{ color: c.tone === "danger" ? "var(--danger)" : "var(--muted)", fontWeight: c.tone === "danger" ? 600 : 400, whiteSpace: "nowrap" }}>{i.waiting_on ? `Waiting on ${i.waiting_on}` : c.text}</span>
                </div>
                <div className="bar">
                  {!i.waiting_on && i.start_by && <i style={{ left: `${pct(s)}%`, width: `${Math.max(3, pct(mineEnd) - pct(s))}%`, background: "var(--indigo)" }} />}
                  {!i.waiting_on && !i.start_by && <i style={{ left: `${pct(s)}%`, width: `${Math.max(3, pct(e) - pct(s))}%`, background: "var(--indigo-mid)" }} />}
                  {(i.waiting_on || (i.start_by && mineEnd < e)) && <i style={{ left: `${pct(i.waiting_on ? s : mineEnd)}%`, width: `${Math.max(3, pct(e) - pct(i.waiting_on ? s : mineEnd))}%`, background: "var(--indigo-wait)" }} />}
                </div>
              </Link>
            );
          })}
        </div>
        <div className="legend" style={{ paddingTop: 10 }}>
          <span><i style={{ background: "var(--indigo)" }} />Your part</span>
          <span><i style={{ background: "var(--indigo-wait)" }} />Waiting or processing</span>
          <span><i style={{ background: "var(--indigo-mid)" }} />Anytime before</span>
        </div>
      </div>

      {done.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="sec"><span style={{ color: "var(--muted)" }}>Done</span><span>{done.length}</span></div>
          <div className="tile flush">
            {done.map((i) => (
              <Link key={i.id} href={`/item/${i.id}`} className="lrow" style={{ minHeight: 52 }}>
                <span className="box lime"><IconCheck /></span>
                <span className="t"><b className="done-t">{i.title}</b></span>
                <span className="sub">{i.done_at ? fmtShort(i.done_at.slice(0, 10)) : ""}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
