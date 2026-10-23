import type { Day, Item, Settings, Task } from "./types";
import { addDays, diffDays, fmtDay, fmtShort, lastDay, nowHM, toMin, today } from "./dates";

export function currentAction(i: Item): string {
  return i.steps[i.step] ?? i.title;
}

export function stepLabel(i: Item): string {
  if (!i.steps.length || i.steps.length === 1) return i.title === currentAction(i) ? (i.note ?? "") : i.title;
  return `${i.title} · step ${Math.min(i.step + 1, i.steps.length)} of ${i.steps.length}`;
}

const far = "9999-12-31";

export function rankOpen(items: Item[]): Item[] {
  return items
    .filter((i) => i.status !== "done" && !i.waiting_on)
    .sort(
      (a, b) =>
        b.priority - a.priority ||
        (a.start_by ?? a.due ?? far).localeCompare(b.start_by ?? b.due ?? far) ||
        (a.due ?? far).localeCompare(b.due ?? far) ||
        a.sort - b.sort
    );
}

export type Chip = { text: string; tone: "danger" | "soft" | "plain" };

export function whenChip(i: { start_by?: string | null; due?: string | null }): Chip {
  const t = today();
  if (i.due && i.due < t) return { text: "Overdue", tone: "danger" };
  const s = i.start_by;
  if (s && s <= t) return { text: "Start today", tone: "danger" };
  if (s) {
    const n = diffDays(t, s);
    if (n <= 6) return { text: fmtDay(s), tone: "soft" };
    return { text: fmtShort(s), tone: "plain" };
  }
  if (i.due) {
    const n = diffDays(t, i.due);
    if (n <= 3) return { text: n === 0 ? "Due today" : `Due ${fmtDay(i.due)}`, tone: "danger" };
    if (n <= 7) return { text: "This week", tone: "plain" };
    return { text: `By ${fmtShort(i.due)}`, tone: "plain" };
  }
  return { text: "Anytime", tone: "plain" };
}

export function taskChip(k: Task): Chip {
  const t = today();
  if (k.due && k.due < t) return { text: "Overdue", tone: "danger" };
  if (k.due === t) {
    if (k.at_time) {
      const soon = (toMin(k.at_time) ?? 0) - (toMin(nowHM()) ?? 0) < 90;
      return { text: k.at_time.slice(0, 5), tone: soon ? "danger" : "plain" };
    }
    return { text: "Today", tone: "danger" };
  }
  if (k.due) return { text: fmtShort(k.due), tone: "plain" };
  return { text: "", tone: "plain" };
}

/* attendance */
export function breakMin(d: Day, endMin: number): number {
  let t = 0;
  for (const b of d.breaks || []) {
    const s = toMin(b.s);
    const e = b.e ? toMin(b.e) : endMin;
    if (s != null && e != null) t += Math.max(0, e - s);
  }
  return t;
}

export function netMin(d: Day | undefined, s: Settings): number {
  if (!d || !d.time_in) return 0;
  const isToday = d.day === today();
  const now = toMin(nowHM())!;
  const end = d.time_out ? toMin(d.time_out) : isToday ? now : null;
  if (end == null) return 0;
  let gross = end - toMin(d.time_in)!;
  if (gross < 0) gross += 1440;
  let brk = breakMin(d, isToday && !d.time_out ? now : end);
  if (!(d.breaks || []).length && d.time_out) brk = Math.min(s.break_min, gross);
  return Math.max(0, gross - brk);
}

export const isLate = (d: Day | undefined, s: Settings) => !!(d?.time_in && toMin(d.time_in.slice(0, 5))! > toMin(s.shift_start.slice(0, 5))!);
export function otMin(d: Day | undefined, s: Settings) {
  if (!d?.time_out) return 0;
  return Math.max(0, netMin(d, s) - (s.shift_hours * 60 - s.break_min));
}

export function cutoff(date: string) {
  const ym = date.slice(0, 7);
  const d = Number(date.slice(8, 10));
  if (d <= 15) return { id: `${ym}-a`, start: `${ym}-01`, end: `${ym}-15`, payday: `${ym}-15` };
  const ld = String(lastDay(ym)).padStart(2, "0");
  return { id: `${ym}-b`, start: `${ym}-16`, end: `${ym}-${ld}`, payday: `${ym}-${ld}` };
}

export function cutoffStats(c: ReturnType<typeof cutoff>, days: Record<string, Day>, s: Settings) {
  let worked = 0, lates = 0, ot = 0, mins = 0, leave = 0;
  for (let d = c.start; d <= c.end; d = addDays(d, 1)) {
    const r = days[d];
    if (!r) continue;
    if (r.kind === "leave") { leave++; continue; }
    if (r.time_in) { worked++; mins += netMin(r, s); if (isLate(r, s)) lates++; ot += otMin(r, s); }
  }
  return { worked, lates, ot, mins, leave };
}

export const isHoliday = (s: Settings, d: string) => s.holidays.find((h) => h.date === d);
