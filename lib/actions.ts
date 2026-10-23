"use client";
import type { Item } from "./types";
import { useData } from "./store";
import { currentAction } from "./logic";
import { nowHM, today } from "./dates";

export function useActions() {
  const { upsert, log, days } = useData();

  async function advance(i: Item) {
    const n = Math.max(1, i.steps.length);
    const step = Math.min(n, i.step + 1);
    const done = step >= n;
    const label = currentAction(i);
    const ok = await upsert("items", { ...i, step, status: done ? "done" : "doing", done_at: done ? new Date().toISOString() : null });
    if (ok) log(done ? `Finished ${i.title}` : `Done: ${label}`);
  }

  async function undo(i: Item) {
    const step = Math.max(0, i.step - 1);
    await upsert("items", { ...i, step, status: step === 0 ? "todo" : "doing", done_at: null });
  }

  async function clock(kind: "in" | "break" | "out") {
    const d = today();
    const cur = days[d];
    const now = nowHM();
    if (kind === "in") return upsert("attendance", { day: d, kind: "work", time_in: now, time_out: null, breaks: [] });
    if (!cur) return;
    const breaks = (cur.breaks || []).map((b) => ({ ...b }));
    const last = breaks[breaks.length - 1];
    if (kind === "break") {
      if (last && !last.e) last.e = now; else breaks.push({ s: now });
      return upsert("attendance", { ...cur, breaks });
    }
    if (last && !last.e) last.e = now;
    return upsert("attendance", { ...cur, breaks, time_out: now });
  }

  return { advance, undo, clock };
}
