"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IconBack, IconEdit } from "@/components/Icons";
import { FileLink, FilesEditor } from "@/components/Files";
import { Seg, Sheet } from "@/components/Sheet";
import { useData } from "@/lib/store";
import { useActions } from "@/lib/actions";
import { ownerLabel, ownerOf, whenChip } from "@/lib/logic";
import { fmtShort } from "@/lib/dates";
import { GROUPS, type Item } from "@/lib/types";

const blank = (): Item => ({ id: "", title: "", grp: "Other", due: null, start_by: null, status: "todo", steps: [], owners: [], step: 0, waiting_on: null, priority: 0, note: null, link: null, files: [], sort: 99, source: "app", done_at: null });

export default function ItemPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { items, upsert, remove } = useData();
  const { advance, undo } = useActions();
  const isNew = id === "new";
  const item = isNew ? null : items.find((i) => i.id === id);
  const [editing, setEditing] = useState(isNew);

  useEffect(() => { if (!isNew && items.length && !item) router.replace("/requirements"); }, [isNew, items, item, router]);

  if (!isNew && !item) return null;
  const i = item ?? blank();
  const c = whenChip(i);
  const steps = i.steps.length ? i.steps : [i.title];

  return (
    <main className="wrap">
      <div className="row">
        <button type="button" className="icon-btn" onClick={() => router.back()} aria-label="Back"><IconBack /></button>
        <span style={{ marginLeft: "auto" }} className={`chip ${i.status === "done" ? "ok" : i.waiting_on ? "soft" : ownerOf(i, i.step) === "claude" ? "ok" : c.tone}`}>{i.status === "done" ? "Done" : i.waiting_on ? `Waiting on ${i.waiting_on}` : ownerOf(i, i.step) === "claude" ? "Claude is on it" : c.text}</span>
        {!isNew && <button type="button" className="icon-btn" onClick={() => setEditing(true)} aria-label="Edit"><IconEdit /></button>}
      </div>

      {!isNew && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "0 6px" }}>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: "-.7px" }}>{i.title}</h1>
            <span className="sub" style={{ fontSize: 14 }}>
              {[i.due ? `Due ${fmtShort(i.due)}` : null, i.start_by ? `start by ${fmtShort(i.start_by)}` : null, steps.length > 1 && i.status !== "done" ? `step ${Math.min(i.step + 1, steps.length)} of ${steps.length}` : null].filter(Boolean).join(" · ")}
            </span>
          </div>

          <div className="tile" style={{ padding: "18px 16px" }}>
            <div className="rail" style={{ gap: 22 }}>
              {steps.map((s, k) => {
                const cur = k === i.step && i.status !== "done";
                const own = cur && i.waiting_on ? "them" : ownerOf(i, k);
                const state = k < i.step || i.status === "done" ? "done" : cur ? (i.waiting_on ? "wait" : own === "claude" ? "claude" : "now") : "";
                const pin = state || (own === "you" ? "" : own);
                return (
                  <div key={s + k}>
                    <span aria-hidden="true" className={`pin ${pin}`} />
                    <div className="tx" style={{ gap: 10 }}>
                      <span className="between" style={{ alignItems: "flex-start" }}>
                        <span style={{ fontSize: state === "now" || state === "claude" ? 16 : 15, fontWeight: 600 }} className={state === "done" ? "done-t" : ""}>{s}</span>
                        {state !== "done" && <span className={`own ${own}`}>{ownerLabel(i, own)}</span>}
                      </span>
                      {state === "claude" && <><span className="note">Claude is doing this step. It moves on when it is done.</span><button type="button" className="sub" style={{ background: "none", border: "none", padding: 0, alignSelf: "flex-start" }} onClick={() => advance(i)}>I did it myself</button></>}
                      {(state === "now" || state === "wait") && (
                        <>
                          {i.note && <span className="sub" style={{ fontSize: 13, lineHeight: 1.4, marginTop: -6 }}>{i.note}</span>}
                          {state === "wait" ? <span className="note">Waiting on {i.waiting_on}. Claude will update this when it arrives.</span> : (
                            <div className={i.link ? "btns" : ""} style={i.link ? {} : { display: "flex", flexDirection: "column" }}>
                              {i.link && <a className="btn" href={i.link} target="_blank" rel="noopener">Open email</a>}
                              <button type="button" className={i.link ? "btn ghost" : "btn"} onClick={() => advance(i)}>Mark done</button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {i.step > 0 && <button type="button" className="sub" style={{ background: "none", border: "none", alignSelf: "flex-start", padding: "0 4px" }} onClick={() => undo(i)}>Undo last step</button>}

          <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div className="sec"><span>Files</span><span>{i.files.length || ""}</span></div>
            {i.files.map((f, k) => <FileLink key={k} f={f} />)}
            <button type="button" className="upload" onClick={() => setEditing(true)} style={{ background: "none" }}>{i.files.length ? "Add another file" : "Add a file or Drive link"}</button>
          </section>
        </>
      )}

      {editing && (
        <ItemEditor
          item={i}
          isNew={isNew}
          onClose={() => (isNew ? router.back() : setEditing(false))}
          onSave={async (next) => {
            const row = isNew ? { ...next, id: `${next.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}-${Date.now().toString(36)}` } : next;
            if (await upsert("items", row)) { setEditing(false); if (isNew) router.replace(`/item/${row.id}`); }
          }}
          onDelete={async () => { if (await remove("items", "id", i.id)) router.replace("/requirements"); }}
        />
      )}
    </main>
  );
}

function ItemEditor({ item, isNew, onClose, onSave, onDelete }: { item: Item; isNew: boolean; onClose: () => void; onSave: (i: Item) => void; onDelete: () => void }) {
  const [f, setF] = useState<Item>(item);
  const [stepsText, setStepsText] = useState(item.steps.join("\n"));
  const [armed, setArmed] = useState(false);
  const set = <K extends keyof Item>(k: K, v: Item[K]) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Sheet title={isNew ? "New requirement" : "Edit requirement"} onClose={onClose} onSubmit={() => {
      if (!f.title.trim()) return;
      const steps = stepsText.split("\n").map((s) => s.trim()).filter(Boolean);
      const step = Math.min(f.step, steps.length || 1);
      onSave({ ...f, title: f.title.trim(), steps, step, done_at: f.status === "done" ? f.done_at ?? new Date().toISOString() : null });
    }}>
      <div className="field"><label htmlFor="it-title">Name</label><input id="it-title" required value={f.title} onChange={(e) => set("title", e.target.value)} /></div>
      <div className="field"><label htmlFor="it-steps">Steps, one per line, written as actions</label><textarea id="it-steps" value={stepsText} onChange={(e) => setStepsText(e.target.value)} placeholder={"Register on the portal\nBook a slot and pay"} /></div>
      <div className="pair">
        <div className="field"><label htmlFor="it-start">Start by</label><input id="it-start" type="date" value={f.start_by ?? ""} onChange={(e) => set("start_by", e.target.value || null)} /></div>
        <div className="field"><label htmlFor="it-due">Due</label><input id="it-due" type="date" value={f.due ?? ""} onChange={(e) => set("due", e.target.value || null)} /></div>
      </div>
      <div className="field"><label>Status</label><Seg label="Status" value={f.status} onChange={(v) => setF((x) => ({ ...x, status: v, step: v === "todo" ? 0 : v === "done" ? Math.max(1, x.steps.length) : x.step }))} options={[["todo", "To do"], ["doing", "In progress"], ["done", "Done"]]} /></div>
      <div className="pair">
        <div className="field"><label htmlFor="it-grp">Group</label><select id="it-grp" value={f.grp} onChange={(e) => set("grp", e.target.value as Item["grp"])}>{GROUPS.map((g) => <option key={g}>{g}</option>)}</select></div>
        <div className="field"><label htmlFor="it-wait">Waiting on</label><input id="it-wait" placeholder="Nobody" value={f.waiting_on ?? ""} onChange={(e) => set("waiting_on", e.target.value.trim() ? e.target.value : null)} /></div>
      </div>
      <div className="field"><label htmlFor="it-note">Notes</label><textarea id="it-note" value={f.note ?? ""} onChange={(e) => set("note", e.target.value || null)} /></div>
      <div className="field"><label htmlFor="it-link">Email or page link</label><input id="it-link" type="url" value={f.link ?? ""} onChange={(e) => set("link", e.target.value || null)} /></div>
      <FilesEditor owner={item.id || "new"} files={f.files} onChange={(files) => set("files", files)} />
      {isNew ? <button type="submit" className="btn">Add requirement</button> : (
        <div className="btns">
          <button type="button" className="btn danger" onClick={() => (armed ? onDelete() : setArmed(true))}>{armed ? "Tap again to delete" : "Delete"}</button>
          <button type="submit" className="btn">Save</button>
        </div>
      )}
    </Sheet>
  );
}
