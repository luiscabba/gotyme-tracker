"use client";
import Link from "next/link";
import { useState } from "react";
import { Header } from "@/components/Shell";
import { IconBack, IconNext } from "@/components/Icons";
import { Seg, Sheet } from "@/components/Sheet";
import { useData } from "@/lib/store";
import { cutoff, cutoffStats, isHoliday, isLate } from "@/lib/logic";
import { addDays, fmtLong, fmtShort, isWeekend, lastDay, monthName, pad, parse, today } from "@/lib/dates";
import type { Day } from "@/lib/types";

export default function Time() {
  const { settings, days, pay, items, upsert, remove } = useData();
  const t = today();
  const base = settings && t < settings.start_date ? settings.start_date : t;
  const [ym, setYm] = useState(base.slice(0, 7));
  const [edit, setEdit] = useState<string | null>(null);
  if (!settings) return null;

  const first = parse(`${ym}-01`).getUTCDay();
  const lead = (first + 6) % 7;
  const n = lastDay(ym);
  const c = cutoff(base);
  const cs = cutoffStats(c, days, settings);
  const p = pay[c.id];
  const status = p?.status ?? "waiting";

  return (
    <main className="wrap">
      <Header title={monthName(ym)}>
        <button type="button" className="icon-btn" aria-label="Previous month" onClick={() => setYm(addDays(`${ym}-01`, -1).slice(0, 7))}><IconBack /></button>
        <button type="button" className="icon-btn" aria-label="Next month" onClick={() => setYm(addDays(`${ym}-${pad(n)}`, 1).slice(0, 7))}><IconNext /></button>
      </Header>

      <div className="tile" style={{ gap: 8 }}>
        <div className="cal">
          {"MTWTFSS".split("").map((d, k) => <span key={k} className="h">{d}</span>)}
          {Array.from({ length: lead }).map((_, k) => <span key={`b${k}`} />)}
          {Array.from({ length: n }).map((_, k) => {
            const d = `${ym}-${pad(k + 1)}`;
            const r = days[d];
            const h = isHoliday(settings, d);
            const isPay = d >= settings.start_date && (k + 1 === 15 || k + 1 === n);
            const due = d < settings.start_date && d >= t && items.some((i) => i.status !== "done" && i.due === d);
            const cls = [
              r?.kind === "leave" ? "leave" : r?.kind === "absent" ? "absent" : r?.time_in ? "work"
                : d === settings.start_date ? "day1" : h ? "hol" : due ? "due" : isPay ? "pay"
                : d < settings.start_date || d < t ? "faint" : isWeekend(d) ? "" : "wk",
              d === t ? "today" : "",
              r?.time_in && isLate(r, settings) ? "late" : "",
            ].join(" ");
            return <button key={d} type="button" className={cls} onClick={() => setEdit(d)} aria-label={`${fmtLong(d)}${h ? `, ${h.name}` : ""}`}>{k + 1}</button>;
          })}
        </div>
        <div className="legend" style={{ paddingTop: 6 }}>
          <span><i style={{ background: "var(--ink)" }} />Day 1</span>
          <span><i style={{ background: "rgba(255,255,255,.9)", border: "1px solid rgba(20,21,26,.15)" }} />Workday</span>
          <span><i style={{ background: "var(--indigo)" }} />Worked</span>
          <span><i style={{ background: "var(--lime)" }} />Payday</span>
          <span><i style={{ background: "rgba(124,118,242,.5)" }} />Holiday</span>
          <span><i style={{ background: "var(--heat)" }} />Docs due</span>
        </div>
      </div>

      <div className="pair">
        <Link href="/settings" className="tile" style={{ gap: 2, textDecoration: "none", color: "inherit" }}><span style={{ fontSize: settings.vl == null ? 17 : 24, fontWeight: 700 }}>{settings.vl ?? "Not set yet"}</span><span className="sub">vacation leave left</span></Link>
        <Link href="/settings" className="tile" style={{ gap: 2, textDecoration: "none", color: "inherit" }}><span style={{ fontSize: settings.sl == null ? 17 : 24, fontWeight: 700 }}>{settings.sl ?? "Not set yet"}</span><span className="sub">sick leave left</span></Link>
      </div>

      <div className="tile dark">
        <div className="between"><span style={{ fontSize: 15, fontWeight: 600 }}>{fmtShort(c.payday)} payslip check</span><span className={`chip ${status === "matched" ? "ok" : status === "mismatch" ? "danger" : ""}`} style={status === "waiting" ? { background: "rgba(255,255,255,.14)", color: "#E4E6EC" } : {}}>{status === "matched" ? "Matches" : status === "mismatch" ? "Something is off" : "Waiting"}</span></div>
        <span className="sub">Cutoff {fmtShort(c.start)} to {fmtShort(c.end)}</span>
        <div className="trio">
          <div><div className="num" style={{ fontSize: 22, fontWeight: 700, color: "var(--lime)" }}>{cs.worked}d</div><span className="sub">worked</span></div>
          <div><div className="num" style={{ fontSize: 22, fontWeight: 700, color: "var(--lime)" }}>{cs.lates}</div><span className="sub">lates</span></div>
          <div><div className="num" style={{ fontSize: 22, fontWeight: 700, color: "var(--lime)" }}>{(cs.ot / 60).toFixed(1)}h</div><span className="sub">over shift</span></div>
        </div>
        {cs.leave > 0 && <span className="sub">{cs.leave} leave day{cs.leave > 1 ? "s" : ""} this cutoff</span>}
        <div className="btns">
          <button type="button" className="btn white" onClick={() => upsert("payslips", { period: c.id, payday: c.payday, status: "matched" })}>Payslip matches</button>
          <button type="button" className="btn danger" onClick={() => upsert("payslips", { period: c.id, payday: c.payday, status: "mismatch" })}>Something is off</button>
        </div>
      </div>

      {edit && <DayEditor d={edit} r={days[edit]} holiday={isHoliday(settings, edit)?.name} onClose={() => setEdit(null)} onSave={async (row) => { if (row) await upsert("attendance", row); else await remove("attendance", "day", edit); setEdit(null); }} />}
    </main>
  );
}

function DayEditor({ d, r, holiday, onClose, onSave }: { d: string; r?: Day; holiday?: string; onClose: () => void; onSave: (row: Partial<Day> | null) => void }) {
  const [kind, setKind] = useState<"work" | "leave" | "absent" | "none">(r?.kind ?? "none");
  const [tin, setTin] = useState(r?.time_in ?? "");
  const [tout, setTout] = useState(r?.time_out ?? "");
  const [lk, setLk] = useState(r?.leave_kind ?? "VL");
  const [note, setNote] = useState(r?.note ?? "");
  return (
    <Sheet title={fmtLong(d)} onClose={onClose} onSubmit={() => {
      if (kind === "none") return onSave(null);
      onSave({ day: d, kind, time_in: kind === "work" ? tin || null : null, time_out: kind === "work" ? tout || null : null, breaks: kind === "work" ? (r?.breaks ?? []).filter((b) => b.e) : [], leave_kind: kind === "leave" ? lk : null, note: note || null });
    }}>
      {holiday && <span className="chip soft" style={{ alignSelf: "flex-start" }}>{holiday}</span>}
      <div className="field"><label>Day</label><Seg label="Day" value={kind} onChange={setKind} options={[["work", "Worked"], ["leave", "Leave"], ["absent", "Absent"], ["none", "Clear"]]} /></div>
      {kind === "work" && <div className="pair">
        <div className="field"><label htmlFor="d-in">Time in</label><input id="d-in" type="time" value={tin} onChange={(e) => setTin(e.target.value)} /></div>
        <div className="field"><label htmlFor="d-out">Time out</label><input id="d-out" type="time" value={tout} onChange={(e) => setTout(e.target.value)} /></div>
      </div>}
      {kind === "leave" && <div className="field"><label htmlFor="d-lk">Leave type</label><select id="d-lk" value={lk} onChange={(e) => setLk(e.target.value)}><option value="VL">Vacation leave</option><option value="SL">Sick leave</option><option value="Other">Other</option></select></div>}
      <div className="field"><label htmlFor="d-note">Notes</label><input id="d-note" value={note} onChange={(e) => setNote(e.target.value)} /></div>
      <button type="submit" className="btn">Save day</button>
    </Sheet>
  );
}
