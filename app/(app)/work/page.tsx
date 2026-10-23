"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/Shell";
import { IconPlus } from "@/components/Icons";
import { FilesEditor } from "@/components/Files";
import { Sheet } from "@/components/Sheet";
import { TaskRow } from "@/components/TaskRow";
import { useData } from "@/lib/store";
import { today } from "@/lib/dates";
import type { Task } from "@/lib/types";

function Work() {
  const { tasks, settings, upsert, remove } = useData();
  const params = useSearchParams();
  const router = useRouter();
  const editId = params.get("edit");
  const [adding, setAdding] = useState(false);
  const t = today();
  const toggle = (k: Task) => upsert("tasks", { ...k, done: !k.done, done_at: !k.done ? new Date().toISOString() : null });
  const by = (a: Task, b: Task) => (a.due ?? "9999").localeCompare(b.due ?? "9999") || (a.at_time ?? "99").localeCompare(b.at_time ?? "99");
  const open = tasks.filter((k) => !k.done);
  const groups: [string, Task[]][] = [
    ["Overdue", open.filter((k) => k.due && k.due < t).sort(by)],
    ["Today", open.filter((k) => k.due === t).sort(by)],
    ["Upcoming", open.filter((k) => !k.due || k.due > t).sort(by)],
    ["Done recently", tasks.filter((k) => k.done).sort((a, b) => String(b.done_at).localeCompare(String(a.done_at))).slice(0, 8)],
  ];
  const editing = editId ? tasks.find((k) => k.id === editId) : adding ? null : undefined;

  return (
    <main className="wrap">
      <Header title="Work"><button type="button" className="icon-btn dark" aria-label="Add work item" onClick={() => setAdding(true)}><IconPlus /></button></Header>
      {groups.every(([, l]) => !l.length) && <div className="tile"><span className="empty">No work items yet. Tap + to add a deliverable or meeting with its due date.</span></div>}
      {groups.map(([name, list]) => list.length > 0 && (
        <section key={name} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="sec"><span style={name === "Done recently" ? { color: "var(--muted)" } : {}}>{name}</span><span>{list.length}</span></div>
          <div className="tile flush">{list.map((k) => <TaskRow key={k.id} k={k} onToggle={() => toggle(k)} />)}</div>
        </section>
      ))}
      {editing !== undefined && settings && (
        <TaskEditor
          k={editing}
          defaultDue={t < settings.start_date ? settings.start_date : t}
          onClose={() => { setAdding(false); if (editId) router.replace("/work"); }}
          onSave={async (row) => { if (await upsert("tasks", row)) { setAdding(false); if (editId) router.replace("/work"); } }}
          onDelete={async () => { if (editing && (await remove("tasks", "id", editing.id))) router.replace("/work"); }}
        />
      )}
    </main>
  );
}

function TaskEditor({ k, defaultDue, onClose, onSave, onDelete }: { k: Task | null; defaultDue: string; onClose: () => void; onSave: (r: Partial<Task>) => void; onDelete: () => void }) {
  const [title, setTitle] = useState(k?.title ?? "");
  const [due, setDue] = useState(k?.due ?? defaultDue);
  const [time, setTime] = useState(k?.at_time?.slice(0, 5) ?? "");
  const [note, setNote] = useState(k?.note ?? "");
  const [files, setFiles] = useState(k?.files ?? []);
  const [armed, setArmed] = useState(false);
  return (
    <Sheet title={k ? "Edit work item" : "New work item"} onClose={onClose} onSubmit={() => {
      if (!title.trim()) return;
      onSave({ ...(k ?? {}), title: title.trim(), due: due || null, at_time: time || null, note: note || null, files });
    }}>
      <div className="field"><label htmlFor="w-title">What is due</label><input id="w-title" required value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div className="pair">
        <div className="field"><label htmlFor="w-due">Due date</label><input id="w-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
        <div className="field"><label htmlFor="w-time">Time</label><input id="w-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
      </div>
      <div className="field"><label htmlFor="w-note">Notes</label><textarea id="w-note" value={note} onChange={(e) => setNote(e.target.value)} /></div>
      <FilesEditor owner={k?.id ?? "task"} files={files} onChange={setFiles} />
      {k ? <div className="btns"><button type="button" className="btn danger" onClick={() => (armed ? onDelete() : setArmed(true))}>{armed ? "Tap again to delete" : "Delete"}</button><button type="submit" className="btn">Save</button></div>
        : <button type="submit" className="btn">Add work item</button>}
    </Sheet>
  );
}

export default function Page() {
  return <Suspense><Work /></Suspense>;
}
