"use client";
import { useState } from "react";
import { Header } from "@/components/Shell";
import { useData } from "@/lib/store";
import { relTime } from "@/lib/dates";
import type { Activity, Draft } from "@/lib/types";

export default function ClaudePage() {
  const { drafts, activity, upsert } = useData();
  const pending = drafts.filter((d) => d.status === "pending" || d.status === "approved");
  const undo = async (a: Activity) => {
    if (!a.undo) return;
    if (await upsert(a.undo.table, a.undo.row)) await upsert("activity", { ...a, undone_at: new Date().toISOString() });
  };
  const canUndo = (a: Activity) => !!a.undo && !a.undone_at && Date.now() - new Date(a.at).getTime() < 7 * 864e5;
  const log = activity.filter((a) => a.source === "agent").slice(0, 12);

  return (
    <main className="wrap">
      <Header title="Claude" lead={<span className="orb" aria-hidden="true" style={{ width: 28, height: 28 }} />} />

      <div className="sec"><span>Needs you{pending.length ? ` · ${pending.length}` : ""}</span><span /></div>
      {pending.length === 0 && <div className="tile"><span className="empty">Nothing to approve. When Claude drafts an email for you, it waits here until you send it.</span></div>}
      {pending.map((d) => <DraftCard key={d.id} d={d} />)}

      <div className="sec"><span>Done for you</span><span /></div>
      <div className="tile dim">
        {log.length ? (
          <div className="log">{log.map((a) => (
            <div key={a.id}>
              <span style={{ minWidth: 0, overflowWrap: "anywhere" }} className={a.undone_at ? "done-t" : ""}>{a.text}{canUndo(a) && <button type="button" className="undo" onClick={() => undo(a)}>Undo</button>}</span>
              <time>{relTime(a.at)}</time>
            </div>
          ))}</div>
        ) : <span className="empty">When Claude files, renames or checks something, it shows here.</span>}
      </div>
    </main>
  );
}

function DraftCard({ d }: { d: Draft }) {
  const { upsert, log } = useData();
  const [copied, setCopied] = useState(false);
  const close = async (status: "sent" | "dismissed") => {
    if (await upsert("drafts", { ...d, status, done_at: new Date().toISOString() })) log(status === "sent" ? `Sent: ${d.title}` : `Dismissed draft: ${d.title}`);
  };
  return (
    <section className="tile" style={{ padding: 14, gap: 10 }} aria-label={d.title}>
      <div className="between" style={{ alignItems: "baseline" }}>
        <span style={{ fontSize: 15, fontWeight: 600, minWidth: 0, overflowWrap: "anywhere" }}>{d.title}</span>
        <span className="sub" style={{ flex: "none" }}>{d.kind === "calendar" ? "Calendar hold" : d.kind === "form" ? "Form answers" : d.to_name || d.to_addr ? `to ${d.to_name ?? d.to_addr}` : "Email"}</span>
      </div>
      {d.body && <p className="quote">{d.body}</p>}
      {d.status === "approved" ? <span className="note">Approved. Claude does it on its next run.</span> : d.kind === "email" ? (
        <div className="btns">
          {d.link ? <a className="btn" href={d.link} target="_blank" rel="noopener">Open in Gmail</a>
            : <button type="button" className="btn" onClick={() => navigator.clipboard?.writeText(d.body).then(() => setCopied(true))}>{copied ? "Copied" : "Copy text"}</button>}
          <button type="button" className="btn ghost" onClick={() => close("sent")}>Mark sent</button>
        </div>
      ) : (
        <div className="btns">
          <button type="button" className="btn" onClick={async () => { if (await upsert("drafts", { ...d, status: "approved" })) log(`Approved: ${d.title}`); }}>Approve</button>
          {d.link ? <a className="btn ghost" href={d.link} target="_blank" rel="noopener">Open</a> : <button type="button" className="btn ghost" onClick={() => close("dismissed")}>Not needed</button>}
        </div>
      )}
      {d.status === "pending" && (d.kind === "email" || d.link) && <button type="button" className="sub" style={{ background: "none", border: "none", padding: 0, alignSelf: "flex-start" }} onClick={() => close("dismissed")}>Not needed</button>}
    </section>
  );
}
