export type FileRef = { name: string; url: string; kind: "email" | "drive" | "upload" | "link"; path?: string; at?: string };

export type Item = {
  id: string;
  title: string;
  grp: "Offer and hiring" | "Medical" | "Clearances and school" | "Government numbers and IDs" | "Other";
  due: string | null;
  start_by: string | null;
  status: "todo" | "doing" | "done";
  steps: string[];
  step: number;
  waiting_on: string | null;
  priority: number;
  note: string | null;
  link: string | null;
  files: FileRef[];
  sort: number;
  source: string;
  done_at: string | null;
};

export type Task = {
  id: string;
  title: string;
  due: string | null;
  at_time: string | null;
  note: string | null;
  done: boolean;
  done_at: string | null;
  link: string | null;
  files: FileRef[];
  source: string;
};

export type Day = {
  day: string;
  kind: "work" | "leave" | "absent";
  time_in: string | null;
  time_out: string | null;
  breaks: { s: string; e?: string }[];
  leave_kind: string | null;
  note: string | null;
};

export type Payslip = { period: string; payday: string | null; status: "waiting" | "matched" | "mismatch"; note: string | null };

export type Settings = {
  id: number;
  start_date: string;
  shift_start: string;
  shift_hours: number;
  break_min: number;
  vl: number | null;
  sl: number | null;
  drive_folder_url: string | null;
  holidays: { date: string; name: string }[];
  widget_token: string;
};

export type Activity = { id: number; at: string; text: string; source: string };

export const GROUPS: Item["grp"][] = ["Offer and hiring", "Medical", "Clearances and school", "Government numbers and IDs", "Other"];
