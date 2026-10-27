"use client";
import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { Header } from "@/components/Shell";
import { IconNext } from "@/components/Icons";
import { useData } from "@/lib/store";
import { useActions } from "@/lib/actions";
import { chasesDue, currentAction, currentOwner, cutoff, cutoffStats, dayLoad, isLate, netMin } from "@/lib/logic";
import { addDays, diffDays, dow, fmt12, fmtDur, fmtLong, fmtShort, isWeekend, today, toMin } from "@/lib/dates";

type Row = { key: string; title: string; line: string; tone: "late" | "due" | "you" | "claude" | "wait"; href: string };

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export default function Today() {
  const { settings } = useData();
  const t = today();
  const [picked, setPicked] = useState(t);
  if (!settings) return null;
  const toStart = diffDays(t, settings.start_date);
  const employed = toStart <= 0;

  return (
    <main className="wrap">
      <Header title={fmtLong(t)}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--muted)" }}>{employed ? `Day ${1 - toStart}` : toStart === 1 ? "Day 1 is tomorrow" : `${toStart} days to Day 1`}</span>
      </Header>
      <HeatCalendar picked={picked} onPick={setPicked} />
      <DayCard key={picked} d={picked} onBack={() => setPicked(t)} />
      {employed && picked === t && <ClockTile />}
      <ClaudeStrip />
    </main>
  );
}

function useDayRows(d: string): Row[] {
  const { items, tasks, docs } = useData();
  const t = today();
  const open = items.filter((i) => i.status !== "done");
  const rows: Row[] = [];
  const seen = new Set<string>();
  const add = (r: Row) => { if (!seen.has(r.key)) { seen.add(r.key); rows.push(r); } };

  for (const i of open.filter((x) => x.due === d)) add({ key: i.id, title: i.title, line: d === t ? "Due today" : "Due", tone: "due", href: `/item/${i.id}` });
  if (d === t) {
    for (const c of chasesDue(open)) add({ key: `chase-${c.who}`, title: `Chase ${c.who}`, line: `${c.items.map((i) => i.title).join(", ")}${c.items[0].waiting_since ? ` · waiting since ${fmtShort(c.items[0].waiting_since)}` : ""}`, tone: "wait", href: `/chase/${encodeURIComponent(c.who)}` });
    for (const i of open.filter((x) => currentOwner(x) === "you" && x.start_by && x.start_by <= t)) add({ key: i.id, title: i.title, line: lateLine(i), tone: i.start_by! < t ? "late" : "you", href: `/item/${i.id}` });
  } else {
    const byWho = new Map<string, string[]>();
    for (const i of open.filter((x) => x.waiting_on && x.chase_on === d)) byWho.set(i.waiting_on!, [...(byWho.get(i.waiting_on!) ?? []), i.title]);
    for (const [who, titles] of byWho) add({ key: `chase-${who}`, title: `Chase ${who}`, line: titles.join(", "), tone: "wait", href: `/chase/${encodeURIComponent(who)}` });
    for (const i of open.filter((x) => x.start_by === d && !x.waiting_on)) {
      const own = currentOwner(i);
      add({ key: i.id, title: i.title, line: own === "claude" ? `Claude: ${lower(currentAction(i))}` : `Start: ${lower(currentAction(i))}`, tone: own === "claude" ? "claude" : "you", href: `/item/${i.id}` });
    }
  }
  for (const k of tasks.filter((x) => !x.done && x.due && (x.due === d || (d === t && x.due < t)))) add({ key: `task-${k.id}`, title: k.title, line: k.due! < t ? "Overdue" : k.at_time ? fmt12(k.at_time.slice(0, 5)) : "Due", tone: k.due! < t ? "late" : "due", href: `/work?edit=${k.id}` });
  for (const doc of docs.filter((x) => x.expires_on === d)) add({ key: `doc-${doc.id}`, title: doc.name, line: "Expires", tone: "due", href: `/files/${doc.id}` });
  return rows;

  function lateLine(i: (typeof open)[number]) {
    const a = currentAction(i);
    return i.start_by! < t ? `${a} · late since ${fmtShort(i.start_by!)}` : `Start today: ${lower(a)}`;
  }
}

function DayCard({ d, onBack }: { d: string; onBack: () => void }) {
  const { settings } = useData();
  const t = today();
  const rows = useDayRows(d);
  const heading = d === t ? "Today" : `${fmtLong(d)}${settings && d === settings.start_date ? " · Day 1" : ""}`;
  const dot: Record<Row["tone"], React.CSSProperties> = {
    late: { background: "var(--red)" },
    due: { background: "var(--red)" },
    you: { border: "3px solid rgba(20,21,26,.35)" },
    claude: { background: "var(--lime)", border: "1px solid var(--lime-deep)" },
    wait: { border: "3px solid var(--indigo)" },
  };
  const ink: Record<Row["tone"], string> = { late: "var(--danger)", due: "var(--amber-ink)", you: "var(--muted)", claude: "#4B6A00", wait: "var(--indigo-ink)" };

  return (
    <section className="tile flush fade-in" aria-label={heading} style={{ paddingTop: 6, paddingBottom: 8 }}>
      <div className="between" style={{ alignItems: "baseline", padding: "10px 0 4px" }}>
        <span style={{ fontSize: 17, fontWeight: 700 }}>{heading}</span>
        {d !== t && <button type="button" className="sub" style={{ background: "none", border: "none", padding: "4px 0", fontSize: 13 }} onClick={onBack}>Back to today</button>}
      </div>
      {rows.length === 0 && <span className="sub" style={{ fontSize: 14, padding: "10px 0 12px" }}>{d === t ? "Nothing needs you today." : "Nothing on this day."}</span>}
      {rows.map((r) => (
        <Link key={r.key} href={r.href} className="lrow" style={{ minHeight: 56 }}>
          <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 99, flex: "none", boxSizing: "border-box", ...dot[r.tone] }} />
          <span className="t"><b>{r.title}</b><small style={{ color: ink[r.tone] }}>{r.line}</small></span>
          <span className="chev"><IconNext /></span>
        </Link>
      ))}
    </section>
  );
}

function HeatCalendar({ picked, onPick }: { picked: string; onPick: (d: string) => void }) {
  const { settings, items, tasks } = useData();
  const grid = useRef<HTMLDivElement>(null);
  const [ring, setRing] = useState<{ x: number; y: number; w: number; h: number; ready: boolean } | null>(null);
  useLayoutEffect(() => {
    const el = grid.current?.querySelector<HTMLElement>(`[data-day="${picked}"]`);
    if (el) setRing((r) => ({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight, ready: !!r }));
  }, [picked, settings?.start_date]);
  if (!settings) return null;
  const t = today();
  const monday = addDays(t, -((dow(t) + 6) % 7));
  const until = settings.start_date > t && diffDays(monday, settings.start_date) <= 27 ? settings.start_date : addDays(monday, 13);
  const cells: string[] = [];
  for (let d = monday; d <= until; d = addDays(d, 1)) cells.push(d);
  const chaseDays = new Set(items.filter((i) => i.status !== "done" && i.waiting_on && i.chase_on).map((i) => i.chase_on!));
  return (
    <div className="tile" style={{ padding: 14, gap: 8 }}>
      <div className="heat" ref={grid}>
        {ring && <span aria-hidden="true" className={`day-ring ${ring.ready ? "ready" : ""}`} style={{ width: ring.w, height: ring.h, transform: `translate(${ring.x}px, ${ring.y}px)` }} />}
        {"MTWTFSS".split("").map((d, k) => <span key={k} className="h">{d}</span>)}
        {cells.map((d) => {
          const day = Number(d.slice(8));
          const sel = d === picked ? "sel" : "";
          if (d === settings.start_date) return <button type="button" key={d} data-day={d} className={`d day1 ${sel}`} aria-label={`${fmtLong(d)}, Day 1`} aria-pressed={d === picked} onClick={() => onPick(d)}><span>{day}</span><small>Day 1</small></button>;
          const l = dayLoad(d, items, tasks);
          const level = Math.max(l.level, chaseDays.has(d) ? 1 : 0);
          return (
            <button type="button" key={d} data-day={d} className={`d ${d < t ? "past" : level ? `l${level}` : ""} ${d === t ? "today" : ""} ${sel}`} aria-pressed={d === picked} onClick={() => onPick(d)} aria-label={`${fmtLong(d)}${l.dues ? `, ${l.dues} due` : ""}${l.load ? `, ${l.load} to start` : ""}`}>
              {day}{l.urgent && d >= t && <i />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ClaudeStrip() {
  const { drafts } = useData();
  const pending = drafts.filter((d) => d.status === "pending");
  if (!pending.length) return null;
  const emails = pending.every((d) => d.kind === "email");
  const n = pending.length;
  return (
    <Link href="/claude" className="tile" style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: "14px 14px 14px 16px", color: "inherit", textDecoration: "none" }}>
      <span className="orb" aria-hidden="true" style={{ width: 32, height: 32 }} />
      <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{emails ? `${n} email${n > 1 ? "s" : ""} ready to send` : `${n} thing${n > 1 ? "s" : ""} need${n > 1 ? "" : "s"} you`}</span>
      <span className="chev"><IconNext /></span>
    </Link>
  );
}

function ClockTile() {
  const { settings, days } = useData();
  const { clock } = useActions();
  const t = today();
  const r = days[t];
  if (!settings) return null;
  if (!r?.time_in) {
    return (
      <div className="tile lime">
        <div className="between"><span className="sub">{isWeekend(t) ? "Rest day" : "Not clocked in"}</span><span className="sub">Shift {fmt12(settings.shift_start.slice(0, 5))}</span></div>
        <button type="button" className="btn ink" onClick={() => clock("in")}>Clock in</button>
      </div>
    );
  }
  const net = netMin(r, settings);
  const need = settings.shift_hours * 60 - settings.break_min;
  const onBreak = (r.breaks || []).some((b) => !b.e) && !r.time_out;
  const outBy = (() => { const m = (toMin(r.time_in) ?? 0) + settings.shift_hours * 60; return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; })();
  const cs = cutoffStats(cutoff(t), days, settings);
  return (
    <div className="tile lime">
      <div className="between">
        <span className="sub">{r.time_out ? `Out at ${fmt12(r.time_out)}` : onBreak ? "On break" : `In since ${fmt12(r.time_in)}`}{isLate(r, settings) ? " · late" : ""}</span>
        <span className="sub">{r.time_out ? `${(cs.mins / 60).toFixed(1)}h this cutoff` : `Out by ${fmt12(outBy)}`}</span>
      </div>
      <span className="big">{fmtDur(net)}</span>
      <div style={{ height: 8, borderRadius: 99, background: "rgba(20,21,26,.12)", overflow: "hidden" }}><div style={{ width: `${Math.min(100, Math.round((net / need) * 100))}%`, height: 8, background: "var(--on-lime)", borderRadius: 99 }} /></div>
      {!r.time_out && <div className="btns"><button type="button" className="btn white" onClick={() => clock("break")}>{onBreak ? "End break" : "Break"}</button><button type="button" className="btn ink" onClick={() => clock("out")}>Clock out</button></div>}
    </div>
  );
}
