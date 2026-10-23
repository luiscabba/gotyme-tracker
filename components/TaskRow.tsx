"use client";
import Link from "next/link";
import { IconCheck } from "./Icons";
import { taskChip } from "@/lib/logic";
import { fmt12 } from "@/lib/dates";
import type { Task } from "@/lib/types";

export function TaskRow({ k, onToggle }: { k: Task; onToggle: () => void }) {
  const c = taskChip(k);
  return (
    <div className="lrow">
      <button type="button" className={`box ${k.done ? "on" : ""}`} onClick={onToggle} aria-label={`${k.done ? "Mark not done" : "Mark done"}: ${k.title}`}>{k.done && <IconCheck />}</button>
      <Link href={`/work?edit=${k.id}`} className="t" style={{ color: "inherit", textDecoration: "none" }}><b className={k.done ? "done-t" : ""}>{k.title}</b>{k.note && <small>{k.note}</small>}</Link>
      {!k.done && c.text && <span className={`chip ${c.tone}`}>{c.tone === "plain" || !k.at_time ? c.text : fmt12(k.at_time)}</span>}
    </div>
  );
}

