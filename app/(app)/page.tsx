"use client";
import Link from "next/link";
import { Header } from "@/components/Shell";
import { TaskRow } from "@/components/TaskRow";
import { useData } from "@/lib/store";
import { useActions } from "@/lib/actions";
import { atRisk, costLine, currentAction, cutoff, cutoffStats, dayLoad, isLate, netMin, whenStart } from "@/lib/logic";
import { addDays, diffDays, dow, fmt12, fmtDur, fmtLong, isWeekend, today, toMin } from "@/lib/dates";

export default function Today() {
  const { settings, items, tasks, upsert } = useData();
  if (!settings) return null;
  const t = today();
  const toStart = diffDays(t, settings.start_date);
  const employed = toStart <= 0;
  const risk = atRisk(items, settings.start_date);
  const dueToday = tasks.filter((k) => k.due === t || (!k.done && k.due && k.due < t)).sort((a, b) => (a.at_time ?? "99").localeCompare(b.at_time ?? "99"));

  return (
    <main className="wrap">
      <Header title={fmtLong(t)}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--muted)" }}>{employed ? `Day ${1 - toStart}` : toStart === 1 ? "Day 1 is tomorrow" : `${toStart} days to Day 1`}</span>
      </Header>

      <HeatCalendar />

      {employed && <ClockTile />}

      {risk.length > 0 && (
        <section className="tile" aria-label="At risk" style={{ gap: 16 }}>
          <div className="between"><span style={{ fontSize: 13, fontWeight: 600 }}>At risk</span><span className="sub">start by</span></div>
          <div className="rail">
            {risk.map((i) => {
              const w = whenStart(i.start_by ?? i.due!);
              return (
                <Link key={i.id} href={`/item/${i.id}`}>
                  <span aria-hidden="true" className={`pin ${w.tone}`} />
                  <span className="tx">
                    <span className={`when ${w.tone}`}>{w.text}</span>
                    <span className="what">{currentAction(i)}</span>
                    {costLine(i, settings.start_date) && <span className="why">{costLine(i, settings.start_date)}</span>}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <ClaudeStrip />

      {employed && dueToday.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="sec"><span>Due today</span><Link href="/work" className="sub">All work</Link></div>
          <div className="tile flush">{dueToday.map((k) => <TaskRow key={k.id} k={k} onToggle={() => upsert("tasks", { ...k, done: !k.done, done_at: !k.done ? new Date().toISOString() : null })} />)}</div>
        </section>
      )}
    </main>
  );
}

function HeatCalendar() {
  const { settings, items, tasks } = useData();
  if (!settings) return null;
  const t = today();
  const monday = addDays(t, -((dow(t) + 6) % 7));
  const until = settings.start_date > t && diffDays(monday, settings.start_date) <= 27 ? settings.start_date : addDays(monday, 13);
  const cells: string[] = [];
  for (let d = monday; d <= until; d = addDays(d, 1)) cells.push(d);
  return (
    <div className="tile" style={{ padding: 14, gap: 8 }}>
      <div className="heat">
        {"MTWTFSS".split("").map((d, k) => <span key={k} className="h">{d}</span>)}
        {cells.map((d) => {
          const day = Number(d.slice(8));
          if (d === settings.start_date) return <div key={d} className="d day1" aria-label={`${fmtLong(d)}, Day 1`}><span>{day}</span><small>Day 1</small></div>;
          if (d < t) return <div key={d} className="d past">{day}</div>;
          const l = dayLoad(d, items, tasks);
          return (
            <div key={d} className={`d ${l.level ? `l${l.level}` : ""} ${d === t ? "today" : ""}`} aria-label={`${fmtLong(d)}${l.dues ? `, ${l.dues} due` : ""}${l.load ? `, ${l.load} to start` : ""}`}>
              {day}{l.urgent && <i />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClaudeStrip() {
  const { drafts, activity } = useData();
  const pending = drafts.filter((d) => d.status === "pending");
  const last = activity.find((a) => a.source === "agent");
  return (
    <Link href="/claude" className="tile" style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: "14px 14px 14px 16px", color: "inherit", textDecoration: "none" }}>
      <span className="orb" aria-hidden="true" />
      <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{pending.length ? `${pending.length} draft${pending.length > 1 ? "s" : ""} need${pending.length > 1 ? "" : "s"} you` : "Claude is on it"}</span>
        <span className="sub" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{last?.text ?? "Watching your email and calendar"}</span>
      </span>
      {pending.length > 0 && <span className="btn" style={{ height: 40, padding: "0 16px", fontSize: 14 }}>Review</span>}
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
