"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IconBack, IconEdit } from "@/components/Icons";
import { FileLink, FilesEditor } from "@/components/Files";
import { Sheet } from "@/components/Sheet";
import { useData } from "@/lib/store";
import { docState } from "@/lib/logic";
import { addDays, fmtLong, today } from "@/lib/dates";
import { DOC_CATEGORIES, type Doc, type Item } from "@/lib/types";

const blank = (): Doc => ({ id: "", name: "", category: "IDs", number: null, expires_on: null, remind_days: 60, files: [], note: null, sort: 99 });
const remindLabel = (n: number) => (n % 30 === 0 ? `${n / 30} month${n === 30 ? "" : "s"} before` : `${n} days before`);

export default function DocPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { docs, upsert, remove, log } = useData();
  const isNew = id === "new";
  const doc = isNew ? null : docs.find((d) => d.id === id);
  const [editing, setEditing] = useState(isNew);
  const [reveal, setReveal] = useState(false);

  useEffect(() => { if (!isNew && docs.length && !doc) router.replace("/files"); }, [isNew, docs, doc, router]);
  if (!isNew && !doc) return null;
  const d = doc ?? blank();
  const s = docState(d);
  const chip = s === "expired" ? ["danger", "Expired"] : s === "renew" ? ["warn", "Renew soon"] : s === "missing" ? ["plain", "Not added yet"] : ["ok", "Up to date"];

  async function startRenewal() {
    const t = today();
    const start = d.expires_on ? addDays(d.expires_on, -d.remind_days) : t;
    const item: Item = {
      id: `renew-${d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}-${Date.now().toString(36)}`,
      title: `Renew your ${d.name}`, grp: "Other", due: d.expires_on, start_by: start < t ? t : start, status: "todo",
      steps: [`Book your ${d.name} renewal`, "Go to the appointment", `Add the new ${d.name} to Files`], owners: ["you", "you", "you"], step: 0,
      waiting_on: null, waiting_since: null, chase_on: null, chase_count: 0, priority: 0, note: null, link: null, files: [], sort: 99, source: "app", done_at: null,
    };
    if (await upsert("items", item)) { log(`Started renewing ${d.name}`); router.push(`/item/${item.id}`); }
  }

  return (
    <main className="wrap">
      <div className="row">
        <button type="button" className="icon-btn" onClick={() => router.back()} aria-label="Back"><IconBack /></button>
        {!isNew && <span className={`chip ${chip[0] === "warn" ? "" : chip[0]}`} style={{ marginLeft: "auto", ...(chip[0] === "warn" ? { color: "var(--amber-ink)", background: "rgba(232,89,12,.14)" } : {}) }}>{chip[1]}</span>}
        {!isNew && <button type="button" className="icon-btn" onClick={() => setEditing(true)} aria-label="Edit"><IconEdit /></button>}
      </div>

      {!isNew && (
        <>
          <h1 style={{ margin: 0, padding: "4px 6px 0", fontSize: 30, fontWeight: 700, letterSpacing: "-.7px" }}>{d.name}</h1>

          {d.files.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{d.files.map((f, k) => <FileLink key={k} f={f} />)}</div>
          ) : (
            <button type="button" className="upload" onClick={() => setEditing(true)} style={{ background: "none", minHeight: 96 }}>Add a photo or scan</button>
          )}

          <div className="tile flush">
            <div className="lrow" style={{ minHeight: 50 }}><span className="t"><span className="sub" style={{ fontSize: 14 }}>Expires</span></span><span style={{ fontSize: 15, fontWeight: 600, color: s === "renew" ? "var(--amber-ink)" : s === "expired" ? "var(--danger)" : "inherit" }}>{d.expires_on ? fmtLong(d.expires_on) : "No date"}</span></div>
            <div className="lrow" style={{ minHeight: 50 }}><span className="t"><span className="sub" style={{ fontSize: 14 }}>Number</span></span>
              {d.number ? <button type="button" onClick={() => setReveal((v) => !v)} aria-label={reveal ? "Hide number" : "Show number"} style={{ background: "none", border: "none", padding: 0, fontSize: 15, fontWeight: 600, fontFamily: "inherit", color: "inherit" }}>{reveal ? d.number : `•••• ${d.number.slice(-4)}`}</button> : <span className="sub" style={{ fontSize: 15 }}>None</span>}
            </div>
            {d.expires_on && <div className="lrow" style={{ minHeight: 50 }}><span className="t"><span className="sub" style={{ fontSize: 14 }}>Remind me</span></span><span style={{ fontSize: 15, fontWeight: 600 }}>{remindLabel(d.remind_days)}</span></div>}
          </div>
          {d.note && <span className="sub" style={{ padding: "0 6px", fontSize: 13 }}>{d.note}</span>}

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            {(s === "renew" || s === "expired") && <button type="button" className="btn" style={{ height: 52, fontSize: 16 }} onClick={startRenewal}>Start renewal</button>}
            <button type="button" className={s === "renew" || s === "expired" ? "btn ghost" : "btn"} style={{ height: 52, fontSize: 16 }} onClick={() => setEditing(true)}>{d.files.length ? "Replace the file" : "Add the file"}</button>
          </div>
        </>
      )}

      {editing && (
        <DocEditor
          doc={d}
          isNew={isNew}
          onClose={() => (isNew ? router.back() : setEditing(false))}
          onSave={async (next) => {
            const { id: _drop, ...rest } = next;
            const row = isNew ? rest : next;
            if (await upsert("documents", { ...row, updated_at: new Date().toISOString() })) { setEditing(false); if (isNew) router.replace("/files"); }
          }}
          onDelete={async () => { if (await remove("documents", "id", d.id)) router.replace("/files"); }}
        />
      )}
    </main>
  );
}

function DocEditor({ doc, isNew, onClose, onSave, onDelete }: { doc: Doc; isNew: boolean; onClose: () => void; onSave: (d: Doc) => void; onDelete: () => void }) {
  const [f, setF] = useState<Doc>(doc);
  const [armed, setArmed] = useState(false);
  const set = <K extends keyof Doc>(k: K, v: Doc[K]) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Sheet title={isNew ? "New document" : `Edit ${doc.name}`} onClose={onClose} onSubmit={() => { if (f.name.trim()) onSave({ ...f, name: f.name.trim() }); }}>
      <div className="field"><label htmlFor="d-name">Name</label><input id="d-name" required value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Passport" /></div>
      <div className="pair">
        <div className="field"><label htmlFor="d-cat">Group</label><select id="d-cat" value={f.category} onChange={(e) => set("category", e.target.value)}>{DOC_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div className="field"><label htmlFor="d-exp">Expires</label><input id="d-exp" type="date" value={f.expires_on ?? ""} onChange={(e) => set("expires_on", e.target.value || null)} /></div>
      </div>
      <div className="pair">
        <div className="field"><label htmlFor="d-num">Number</label><input id="d-num" value={f.number ?? ""} onChange={(e) => set("number", e.target.value || null)} autoComplete="off" /></div>
        <div className="field"><label htmlFor="d-rem">Remind me</label><select id="d-rem" value={f.remind_days} onChange={(e) => set("remind_days", Number(e.target.value))}>{[30, 60, 90, 180].map((n) => <option key={n} value={n}>{remindLabel(n)}</option>)}</select></div>
      </div>
      <FilesEditor owner={`docs/${doc.id || "new"}`} files={f.files} onChange={(files) => set("files", files)} />
      <div className="field"><label htmlFor="d-note">Notes</label><textarea id="d-note" value={f.note ?? ""} onChange={(e) => set("note", e.target.value || null)} /></div>
      {isNew ? <button type="submit" className="btn">Add document</button> : (
        <div className="btns">
          <button type="button" className="btn danger" onClick={() => (armed ? onDelete() : setArmed(true))}>{armed ? "Tap again to delete" : "Delete"}</button>
          <button type="submit" className="btn">Save</button>
        </div>
      )}
    </Sheet>
  );
}
