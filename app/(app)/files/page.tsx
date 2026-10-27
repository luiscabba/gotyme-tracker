"use client";
import Link from "next/link";
import { useState } from "react";
import { Header } from "@/components/Shell";
import { IconNext, IconPlus } from "@/components/Icons";
import { useData } from "@/lib/store";
import { docState } from "@/lib/logic";
import { fmtShort } from "@/lib/dates";
import { DOC_CATEGORIES, type Doc } from "@/lib/types";

const note = (d: Doc) => {
  const s = docState(d);
  if (s === "expired") return { text: "Expired", color: "var(--danger)" };
  if (s === "renew") return { text: "Renew", color: "var(--amber-ink)" };
  if (s === "missing") return { text: "Add it", color: "var(--muted)" };
  return { text: d.expires_on ? `Until ${fmtShort(d.expires_on)}` : "Added", color: "var(--muted)" };
};

export default function Files() {
  const { docs } = useData();
  const attention = docs.filter((d) => ["expired", "renew"].includes(docState(d))).sort((a, b) => String(a.expires_on).localeCompare(String(b.expires_on)));
  const cats = [...DOC_CATEGORIES.filter((c) => docs.some((d) => d.category === c)), ...[...new Set(docs.map((d) => d.category))].filter((c) => !DOC_CATEGORIES.includes(c))];
  const [open, setOpen] = useState<string | null>(null);

  return (
    <main className="wrap">
      <Header title="Files">
        <Link className="icon-btn dark" href="/files/new" aria-label="Add a document"><IconPlus /></Link>
      </Header>

      {attention.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="sec"><span style={{ color: "var(--amber-ink)" }}>Needs attention</span><span /></div>
          <div className="tile flush">
            {attention.map((d) => (
              <Link key={d.id} href={`/files/${d.id}`} className="lrow" style={{ minHeight: 64 }}>
                <span className="t"><b style={{ fontSize: 16 }}>{d.name}</b><small style={{ color: note(d).color }}>{d.expires_on ? `${docState(d) === "expired" ? "Expired" : "Expires"} ${fmtShort(d.expires_on)} · time to renew` : "Time to renew"}</small></span>
                <span className="chev"><IconNext /></span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {docs.length === 0 && <div className="tile"><span className="empty">Add your passport, IDs and other important papers. Tap + to start.</span></div>}

      {cats.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="sec"><span style={{ color: "var(--muted)" }}>Everything</span><span /></div>
          <div className="tile flush dim">
            {cats.map((c, k) => {
              const list = docs.filter((d) => d.category === c).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
              const added = list.filter((d) => d.files.length).length;
              const on = open === c;
              return (
                <div key={c}>
                  <button type="button" className="lrow" aria-expanded={on} onClick={() => setOpen(on ? null : c)} style={{ minHeight: 58, cursor: "pointer", borderTop: k ? "1px solid var(--line)" : "none" }}>
                    <span className="t"><b>{c}</b><small>{added === list.length ? "All added" : `${added} of ${list.length} added`}</small></span>
                    <span className="chev" style={{ transform: on ? "rotate(90deg)" : "none" }}><IconNext /></span>
                  </button>
                  {on && list.map((d, j) => {
                    const n = note(d);
                    const s = docState(d);
                    return (
                      <Link key={d.id} href={`/files/${d.id}`} className="lrow row-in" style={{ minHeight: 48, paddingLeft: 8, animationDelay: `${Math.min(j * 30, 150)}ms` }}>
                        <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 99, flex: "none", boxSizing: "border-box", ...(s === "missing" ? { border: "2px solid rgba(20,21,26,.3)" } : { background: s === "ok" ? "var(--lime-deep)" : s === "renew" ? "var(--amber)" : "var(--red)" }) }} />
                        <span className="t"><span style={{ fontSize: 14 }}>{d.name}</span></span>
                        <span style={{ fontSize: 12, color: n.color }}>{n.text}</span>
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
