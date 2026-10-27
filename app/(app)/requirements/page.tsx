"use client";
import Link from "next/link";
import { useState } from "react";
import { Header } from "@/components/Shell";
import { IconNext, IconPlus } from "@/components/Icons";
import { useData } from "@/lib/store";
import { chaseDue, chasesDue, currentAction, currentOwner, whenStart } from "@/lib/logic";
import { addDays, fmtLong, fmtShort, today } from "@/lib/dates";
import type { Item } from "@/lib/types";

const far = "9999-12-31";
type Line = { text: string; tone: string };

export default function Requirements() {
  const { settings, items } = useData();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  if (!settings) return null;
  const t = today();
  const open = items.filter((i) => i.status !== "done");
  const done = items.filter((i) => i.status === "done").sort((a, b) => String(b.done_at).localeCompare(String(a.done_at)));
  const by = (a: Item, b: Item) => (a.start_by ?? a.due ?? far).localeCompare(b.start_by ?? b.due ?? far) || b.priority - a.priority || a.sort - b.sort;
  const mine = open.filter((i) => currentOwner(i) === "you");
  const chase = chasesDue(open);

  const all: { name: string; list: Item[]; line: (i: Item) => Line }[] = [
    { name: "Start now", list: mine.filter((i) => i.start_by && i.start_by <= addDays(t, 1)).sort(by), line: (i) => { const w = whenStart(i.start_by!); return { text: w.text === "Today" ? "Start today" : w.text, tone: w.tone || "soon" }; } },
    { name: "Coming up", list: mine.filter((i) => i.start_by && i.start_by > addDays(t, 1)).sort(by), line: (i) => ({ text: `Start ${whenStart(i.start_by!).text}`, tone: "" }) },
    { name: "Claude is on it", list: open.filter((i) => currentOwner(i) === "claude").sort(by), line: (i) => ({ text: currentAction(i), tone: "claude" }) },
    { name: "Waiting on others", list: open.filter((i) => i.waiting_on && !chaseDue(i)).sort(by), line: (i) => ({ text: i.chase_on ? `${i.waiting_on} · chase ${fmtLong(i.chase_on)}` : `Waiting on ${i.waiting_on}`, tone: "wait" }) },
    { name: settings.start_date > t ? `Before Day 1, ${fmtShort(settings.start_date)}` : "Anytime", list: mine.filter((i) => !i.start_by).sort(by), line: (i) => ({ text: i.due && i.due !== settings.start_date ? `Due ${fmtShort(i.due)}` : "Anytime before", tone: "" }) },
    { name: "Done", list: done, line: (i) => ({ text: i.done_at ? fmtShort(i.done_at.slice(0, 10)) : "", tone: "done" }) },
  ];
  const groups = all.filter((g) => g.list.length);

  return (
    <main className="wrap">
      <Header title="Requirements">
        <Link className="icon-btn dark" href="/item/new" aria-label="Add a requirement"><IconPlus /></Link>
      </Header>

      {chase.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="sec"><span style={{ color: "var(--danger)" }}>Chase today</span><span /></div>
          <div className="tile flush">
            {chase.map(({ who }) => (
              <Link key={who} href={`/chase/${encodeURIComponent(who)}`} className="lrow" style={{ minHeight: 60 }}>
                <span aria-hidden="true" className="sd now" />
                <span className="t"><b style={{ fontSize: 16 }}>{who}</b></span>
                <span className="chev"><IconNext /></span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {groups.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {chase.length > 0 && <div className="sec"><span style={{ color: "var(--muted)" }}>Everything else</span><span /></div>}
          <div className="tile flush dim">
            {groups.map((g, k) => {
              const on = openGroup === g.name;
              return (
                <div key={g.name}>
                  <button type="button" className="lrow" aria-expanded={on} onClick={() => setOpenGroup(on ? null : g.name)} style={{ minHeight: 52, cursor: "pointer", borderTop: k ? "1px solid var(--line)" : "none" }}>
                    <span className="t"><span style={{ fontSize: 15, fontWeight: on ? 600 : 400 }}>{g.name}</span></span>
                    <span className="chev" style={{ transform: on ? "rotate(90deg)" : "none" }}><IconNext /></span>
                  </button>
                  {on && g.list.map((i, j) => {
                    const l = g.line(i);
                    return (
                      <Link key={i.id} href={`/item/${i.id}`} className="lrow row-in" style={{ paddingLeft: 8, animationDelay: `${Math.min(j * 30, 150)}ms` }}>
                        <span aria-hidden="true" className={`sd ${l.tone}`} />
                        <span className="t"><b className={l.tone === "done" ? "done-t" : ""}>{i.title}</b><small style={l.tone === "now" ? { color: "var(--danger)" } : l.tone === "soon" ? { color: "var(--amber-ink)" } : l.tone === "claude" ? { color: "#4B6A00" } : {}}>{l.text}</small></span>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
