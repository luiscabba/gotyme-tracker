"use client";
import Link from "next/link";
import { Header } from "@/components/Shell";
import { TaskRow } from "@/components/TaskRow";
import { useData } from "@/lib/store";
import { useActions } from "@/lib/actions";
import { currentAction, cutoff, cutoffStats, isLate, netMin, rankOpen, stepLabel, whenChip } from "@/lib/logic";
import { diffDays, fmt12, fmtDur, fmtLong, fmtShort, isWeekend, relTime, today, toMin } from "@/lib/dates";
import type { Item } from "@/lib/types";

export default function Today() {
  const { settings, items, tasks, days, activity, upsert } = useData();
  const { advance, clock } = useActions();
  if (!settings) return null;
  const t = today();
  const toStart = diffDays(t, settings.start_date);
  const done = items.filter((i) => i.status === "done").length;
  const ranked = rankOpen(items);
  const next = ranked[0];
  const needs = ranked.slice(1, 6);
  const waiting = items.filter((i) => i.status !== "done" && i.waiting_on);
  const employed = toStart <= 0;
  const dueToday = tasks.filter((k) => k.due === t || (!k.done && k.due && k.due < t)).sort((a, b) => (a.at_time ?? "99").localeCompare(b.at_time ?? "99"));

  return (
    <main className="wrap">
      <Header title={fmtLong(t)}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{employed ? `Day ${1 - toStart}` : `${toStart} days to Day 1`}</span>
      </Header>

      {items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 4px" }}>
          <div className="segs" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))` }}>
            {[...items].sort((a, b) => Number(b.status === "done") - Number(a.status === "done")).map((i) => <i key={i.id} className={i.status === "done" ? "on" : ""} />)}
          </div>
          <span className="sub">{done} of {items.length} ready{employed ? "" : ` for ${fmtShort(settings.start_date)}`}</span>
        </div>
      )}

      {employed && <ClockTile />}

      {next ? <NextUp item={next} onDone={() => advance(next)} /> : (
        <div className="tile lime"><span className="eyebrow">All set</span><span className="h-next">Nothing needs you right now</span></div>
      )}

      {employed && dueToday.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="sec"><span>Due today</span><span>{dueToday.filter((k) => k.done).length} of {dueToday.length}</span></div>
          <div className="tile flush">{dueToday.map((k) => <TaskRow key={k.id} k={k} onToggle={() => upsert("tasks", { ...k, done: !k.done, done_at: !k.done ? new Date().toISOString() : null })} />)}</div>
        </section>
      )}

      {needs.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="sec"><span>Needs you</span><span>{ranked.length - 1}</span></div>
          <div className="tile flush">{needs.map((i) => <ItemRow key={i.id} i={i} />)}</div>
          {ranked.length > 6 && <Link href="/path" className="sub" style={{ padding: "0 4px" }}>See all {ranked.length - 1} on Path to Day 1</Link>}
        </section>
      )}

      {waiting.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="sec"><span style={{ color: "var(--muted)" }}>Waiting on others</span><span>{waiting.length}</span></div>
          <div className="tile flush dim">
            {waiting.map((i) => (
              <Link key={i.id} href={`/item/${i.id}`} className="lrow" style={{ minHeight: 52 }}>
                <span className="box wait" />
                <span className="t"><b>{i.title}</b></span>
                <span className="sub">{i.waiting_on}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {activity.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="sec"><span style={{ color: "var(--muted)" }}>Updates from Claude</span><span /></div>
          <div className="tile log">
            {activity.filter((a) => a.source === "agent").slice(0, 4).map((a) => <div key={a.id}><time>{relTime(a.at)}</time><span>{a.text}</span></div>)}
            {!activity.some((a) => a.source === "agent") && <span className="empty">When Claude finds something in your email or calendar, it shows here.</span>}
          </div>
        </section>
      )}
    </main>
  );
}

function NextUp({ item, onDone }: { item: Item; onDone: () => void }) {
  const n = item.steps.length;
  return (
    <section className="tile lime" aria-label="Next up">
      <div className="between"><span className="eyebrow">Next up</span><Link href={`/item/${item.id}`} className="sub" style={{ color: "var(--on-lime)" }}>{item.title}</Link></div>
      <span className="h-next">{currentAction(item)}</span>
      {item.note && <span style={{ fontSize: 14, lineHeight: 1.35 }}>{item.note}</span>}
      {n > 1 && <div className="steps" style={{ gridTemplateColumns: `repeat(${n}, minmax(0,1fr))` }}>{item.steps.map((s, k) => <i key={s + k} className={k < item.step ? "on" : ""} />)}</div>}
      <div className={item.link ? "btns" : ""} style={item.link ? {} : { display: "flex", flexDirection: "column" }}>
        {item.link && <a className="btn ink" href={item.link} target="_blank" rel="noopener">Open email</a>}
        <button type="button" className={item.link ? "btn white" : "btn ink"} onClick={onDone}>Done</button>
      </div>
    </section>
  );
}

function ItemRow({ i }: { i: Item }) {
  const c = whenChip(i);
  return (
    <Link href={`/item/${i.id}`} className="lrow">
      <span className="box" />
      <span className="t"><b>{currentAction(i)}</b>{stepLabel(i) && <small>{stepLabel(i)}</small>}</span>
      <span className={`chip ${c.tone}`}>{c.text}</span>
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
