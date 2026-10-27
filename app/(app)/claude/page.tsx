"use client";
import Link from "next/link";
import { useState } from "react";
import { Header } from "@/components/Shell";
import { IconCheck } from "@/components/Icons";
import { useData } from "@/lib/store";
import type { Draft } from "@/lib/types";

export default function ClaudePage() {
  const { drafts } = useData();
  const open = drafts.filter((d) => d.status === "pending" || d.status === "approved");
  const d = open[0];

  return (
    <main className="wrap">
      <Header title="Claude" lead={<span className="orb" aria-hidden="true" style={{ width: 28, height: 28 }} />} />
      {d ? <DraftCard key={d.id} d={d} left={open.length - 1} /> : (
        <div className="tile" style={{ alignItems: "center", textAlign: "center", padding: "28px 20px", gap: 8 }}>
          <span className="box lime" aria-hidden="true" style={{ width: 44, height: 44 }}><IconCheck size={20} /></span>
          <span style={{ fontSize: 20, fontWeight: 700 }}>Nothing needs you</span>
          <span className="sub" style={{ fontSize: 14 }}>Claude is watching your email.</span>
        </div>
      )}
      <Link href="/claude/log" className="sub" style={{ alignSelf: "center", padding: 12, fontSize: 14 }}>See what Claude did</Link>
    </main>
  );
}

function DraftCard({ d, left }: { d: Draft; left: number }) {
  const { upsert, log } = useData();
  const [copied, setCopied] = useState(false);
  const close = async (status: "sent" | "dismissed") => {
    if (await upsert("drafts", { ...d, status, done_at: new Date().toISOString() })) log(status === "sent" ? `Sent: ${d.title}` : `Dismissed draft: ${d.title}`);
  };
  const approve = async () => { if (await upsert("drafts", { ...d, status: "approved" })) log(`Approved: ${d.title}`); };
  const email = d.kind === "email";

  return (
    <section className="tile" style={{ padding: 20, gap: 14 }} aria-label={d.title}>
      <span className="sub" style={{ fontSize: 13 }}>Needs you{left > 0 ? ` · ${left} more after this` : ""}</span>
      <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.4px", lineHeight: 1.2, overflowWrap: "anywhere" }}>{d.title}</span>
      {d.status === "approved" ? <span className="note">Approved. Claude does it on its next run.</span> : (
        <>
          <span className="sub" style={{ fontSize: 15 }}>{email ? (d.link ? "The email is written. Send it from Gmail." : "The email is written. Copy it and send it.") : d.kind === "calendar" ? "Approve it and Claude adds it to your calendar." : "Approve it and Claude fills in the form."}</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 6 }}>
            {email ? (
              <>
                {d.link ? <a className="btn" href={d.link} target="_blank" rel="noopener" style={{ height: 52, fontSize: 16 }}>Open in Gmail</a>
                  : <button type="button" className="btn" style={{ height: 52, fontSize: 16 }} onClick={() => navigator.clipboard?.writeText(d.body).then(() => setCopied(true))}>{copied ? "Copied" : "Copy the email"}</button>}
                <button type="button" className="btn ghost" style={{ height: 52, fontSize: 16 }} onClick={() => close("sent")}>I sent it</button>
              </>
            ) : (
              <>
                <button type="button" className="btn" style={{ height: 52, fontSize: 16 }} onClick={approve}>Approve</button>
                {d.link && <a className="btn ghost" href={d.link} target="_blank" rel="noopener" style={{ height: 52, fontSize: 16 }}>Open</a>}
              </>
            )}
          </div>
          <button type="button" className="sub" style={{ background: "none", border: "none", padding: 0, alignSelf: "center" }} onClick={() => close("dismissed")}>Not needed</button>
        </>
      )}
    </section>
  );
}
