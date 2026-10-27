"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IconBack } from "@/components/Icons";
import { useData } from "@/lib/store";
import { useActions } from "@/lib/actions";
import { fmtLong, fmtShort, today, workdaysBetween } from "@/lib/dates";

export default function ChasePage() {
  const { who: raw } = useParams<{ who: string }>();
  const who = decodeURIComponent(raw);
  const router = useRouter();
  const { items, drafts, settings, upsert } = useData();
  const { arrived, chased } = useActions();
  const [copied, setCopied] = useState(false);
  const owed = items.filter((i) => i.status !== "done" && i.waiting_on === who).sort((a, b) => String(a.waiting_since).localeCompare(String(b.waiting_since)) || a.sort - b.sort);

  useEffect(() => { if (items.length && !owed.length) router.replace("/requirements"); }, [items.length, owed.length, router]);
  if (!owed.length || !settings) return null;

  const t = today();
  const first = owed[0];
  const days = first.waiting_since ? workdaysBetween(first.waiting_since, t) : 0;
  const due = owed.some((i) => i.chase_on && i.chase_on <= t);
  const draft = drafts.find((d) => d.status === "pending" && d.kind === "email" && d.item_id && owed.some((i) => i.id === d.item_id));
  const what = owed.length > 1 ? `${first.title} and ${owed.length - 1} more` : first.title;
  const subject = `Following up: ${first.title}`;
  const body = draft?.body ?? `Hi,\n\nI'm following up on my ${what} for my GoTyme onboarding. Could you send it when you get a chance? I start on ${fmtShort(settings.start_date)}.\n\nThank you!`;
  const gmail = draft?.link ?? `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const sent = async () => {
    await chased(owed);
    if (draft) await upsert("drafts", { ...draft, status: "sent", done_at: new Date().toISOString() });
  };

  return (
    <main className="wrap">
      <div className="row"><button type="button" className="icon-btn" onClick={() => router.back()} aria-label="Back"><IconBack /></button></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "8px 6px 0" }}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, letterSpacing: "-.7px" }}>Chase {who}</h1>
        <span className="sub" style={{ fontSize: 15 }}>
          {days > 0 ? `Waiting ${days} workday${days === 1 ? "" : "s"} on ${what}.` : `Waiting on ${what}.`}
          {!due && first.chase_on ? ` Chase on ${fmtLong(first.chase_on)}.` : ""}
        </span>
      </div>
      <div className="tile" style={{ padding: 18, gap: 10 }}>
        <span className="sub" style={{ fontSize: 13 }}>{draft ? "Claude's draft" : `Draft to ${who}`}</span>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{body}</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
        <a className="btn" href={gmail} target="_blank" rel="noopener" style={{ height: 52, fontSize: 16 }} onClick={() => { void sent(); }}>Open in Gmail</a>
        <button type="button" className="btn ghost" style={{ height: 52, fontSize: 16 }} onClick={async () => { if (await arrived(owed)) router.replace("/requirements"); }}>It arrived</button>
        <button type="button" className="sub" style={{ background: "none", border: "none", padding: 8, alignSelf: "center" }} onClick={() => navigator.clipboard?.writeText(body).then(() => { setCopied(true); void sent(); })}>{copied ? "Copied" : "Copy the email instead"}</button>
      </div>
    </main>
  );
}
