"use client";
import { useState } from "react";
import { Header } from "@/components/Shell";
import { useData } from "@/lib/store";
import { relTime } from "@/lib/dates";
import type { Draft } from "@/lib/types";

export default function ClaudePage() {
  const { drafts, activity } = useData();
  const pending = drafts.filter((d) => d.status === "pending");
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
          <div className="log">{log.map((a) => <div key={a.id}><span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{a.text}</span><time>{relTime(a.at)}</time></div>)}</div>
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
        {(d.to_name || d.to_addr) && <span className="sub" style={{ flex: "none" }}>to {d.to_name ?? d.to_addr}</span>}
      </div>
      {d.body && <p className="quote">{d.body}</p>}
      <div className="btns">
        {d.link ? <a className="btn" href={d.link} target="_blank" rel="noopener">Open in Gmail</a>
          : <button type="button" className="btn" onClick={() => navigator.clipboard?.writeText(d.body).then(() => setCopied(true))}>{copied ? "Copied" : "Copy text"}</button>}
        <button type="button" className="btn ghost" onClick={() => close("sent")}>Mark sent</button>
      </div>
      <button type="button" className="sub" style={{ background: "none", border: "none", padding: 0, alignSelf: "flex-start" }} onClick={() => close("dismissed")}>Not needed</button>
    </section>
  );
}
