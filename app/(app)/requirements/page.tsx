"use client";
import Link from "next/link";
import { useState } from "react";
import { Header } from "@/components/Shell";
import { IconCheck, IconNext, IconPlus } from "@/components/Icons";
import { useData } from "@/lib/store";
import { whenStart } from "@/lib/logic";
import { addDays, fmtShort, today } from "@/lib/dates";
import type { Item } from "@/lib/types";

const far = "9999-12-31";

export default function Requirements() {
  const { settings, items } = useData();
  const [showDone, setShowDone] = useState(false);
  if (!settings) return null;
  const t = today();
  const open = items.filter((i) => i.status !== "done");
  const done = items.filter((i) => i.status === "done").sort((a, b) => String(b.done_at).localeCompare(String(a.done_at)));
  const by = (a: Item, b: Item) => (a.start_by ?? a.due ?? far).localeCompare(b.start_by ?? b.due ?? far) || b.priority - a.priority || a.sort - b.sort;
  const mine = open.filter((i) => !i.waiting_on);
  const now = mine.filter((i) => i.start_by && i.start_by <= addDays(t, 1)).sort(by);
  const soon = mine.filter((i) => i.start_by && i.start_by > addDays(t, 1)).sort(by);
  const anytime = mine.filter((i) => !i.start_by).sort(by);
  const waiting = open.filter((i) => i.waiting_on).sort(by);
  const before = settings.start_date > t ? `Before Day 1, ${fmtShort(settings.start_date)}` : "Anytime";

  return (
    <main className="wrap">
      <Header title="Requirements">
        <Link className="icon-btn dark" href="/item/new" aria-label="Add a requirement"><IconPlus /></Link>
      </Header>

      {items.length > 0 && (
        <div className="tile" style={{ padding: 12, borderRadius: 22, gap: 8 }}>
          <div className="prog" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))` }} aria-hidden="true">
            {items.map((i, k) => <i key={i.id} className={k < done.length ? "on" : ""} />)}
          </div>
          <span className="sub" style={{ paddingLeft: 2 }}>{done.length} of {items.length} done</span>
        </div>
      )}

      <Group name="Start now" list={now} line={(i) => { const w = whenStart(i.start_by!); return { text: w.text === "Today" ? "Start today" : w.text, tone: w.tone || "soon" }; }} />
      <Group name="Coming up" list={soon} line={(i) => ({ text: `Start ${whenStart(i.start_by!).text}`, tone: whenStart(i.start_by!).tone === "soon" ? "soon" : "" })} />
      <Group name="Waiting on others" list={waiting} line={(i) => ({ text: `Waiting on ${i.waiting_on}`, tone: "wait" })} />
      <Group name={before} list={anytime} line={(i) => ({ text: i.due && i.due !== settings.start_date ? `Due ${fmtShort(i.due)}` : "Anytime before", tone: "" })} />

      {done.length > 0 && (
        <>
          <button type="button" className="pillrow" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone}>
            <span className="box lime" aria-hidden="true"><IconCheck /></span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{done.map((i) => i.title).join(", ")}</span>
            <span className="sub">{showDone ? "Hide" : "Done"}</span>
          </button>
          {showDone && (
            <div className="tile flush dim">
              {done.map((i) => (
                <Link key={i.id} href={`/item/${i.id}`} className="lrow" style={{ minHeight: 50 }}>
                  <span className="t"><b className="done-t">{i.title}</b></span>
                  <span className="sub">{i.done_at ? fmtShort(i.done_at.slice(0, 10)) : ""}</span>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}

function Group({ name, list, line }: { name: string; list: Item[]; line: (i: Item) => { text: string; tone: string } }) {
  if (!list.length) return null;
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div className="sec"><span>{name}</span><span>{list.length}</span></div>
      <div className="tile flush">
        {list.map((i) => {
          const l = line(i);
          return (
            <Link key={i.id} href={`/item/${i.id}`} className="lrow">
              <span aria-hidden="true" className={`sd ${l.tone}`} />
              <span className="t"><b>{i.title}</b><small style={l.tone === "now" ? { color: "var(--danger)" } : l.tone === "soon" ? { color: "var(--amber-ink)" } : {}}>{l.text}</small></span>
              <span className="chev"><IconNext /></span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
