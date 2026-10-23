"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { FileRef } from "@/lib/types";
import { IconClip, IconMail } from "./Icons";

export function FileLink({ f }: { f: FileRef }) {
  const [href, setHref] = useState(f.kind === "upload" ? "" : f.url);
  useEffect(() => {
    if (f.kind !== "upload" || !f.path) return;
    supabase().storage.from("files").createSignedUrl(f.path, 3600).then(({ data }) => data && setHref(data.signedUrl));
  }, [f]);
  return (
    <a className="file" href={href || undefined} target="_blank" rel="noopener" aria-disabled={!href}>
      {f.kind === "email" ? <IconMail /> : <IconClip />}<span>{f.name}</span>
    </a>
  );
}

export function FilesEditor({ owner, files, onChange }: { owner: string; files: FileRef[]; onChange: (f: FileRef[]) => void }) {
  const [busy, setBusy] = useState("");
  const [lname, setLname] = useState("");
  const [lurl, setLurl] = useState("");

  async function upload(file: File) {
    setBusy(`Uploading ${file.name}`);
    const path = `${owner}/${Date.now()}-${file.name.replace(/[^\w.\- ]+/g, "_")}`;
    const { error } = await supabase().storage.from("files").upload(path, file);
    setBusy(error ? "Upload failed. Try a smaller file." : "");
    if (!error) onChange([...files, { name: file.name, url: "", path, kind: "upload", at: new Date().toISOString() }]);
  }

  function addLink() {
    if (!/^https:\/\//i.test(lurl.trim())) return;
    onChange([...files, { name: lname.trim() || "Link", url: lurl.trim(), kind: lurl.includes("drive.google.com") ? "drive" : "link", at: new Date().toISOString() }]);
    setLname(""); setLurl("");
  }

  return (
    <div className="field">
      <label>Files</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {files.map((f, k) => (
          <div key={k} className="row">
            <div style={{ flex: 1, minWidth: 0 }}><FileLink f={f} /></div>
            <button type="button" className="btn ghost" style={{ height: 44 }} onClick={() => onChange(files.filter((_, j) => j !== k))} aria-label={`Remove ${f.name}`}>Remove</button>
          </div>
        ))}
        <label className="upload" htmlFor={`up-${owner}`}>{busy || "Upload a file"}<input id={`up-${owner}`} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} /></label>
        <div className="pair">
          <input aria-label="Link name" placeholder="Link name" value={lname} onChange={(e) => setLname(e.target.value)} style={{ height: 44, borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", padding: "0 12px", minWidth: 0 }} />
          <input aria-label="Link address" type="url" placeholder="Paste a Drive link" value={lurl} onChange={(e) => setLurl(e.target.value)} onBlur={addLink} style={{ height: 44, borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", padding: "0 12px", minWidth: 0 }} />
        </div>
      </div>
    </div>
  );
}
