const TZ = "Asia/Manila";

export const pad = (n: number) => String(n).padStart(2, "0");

export function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function nowHM(): string {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const h = p.find((x) => x.type === "hour")!.value.replace("24", "00");
  const m = p.find((x) => x.type === "minute")!.value;
  return `${h}:${m}`;
}

export function parse(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

export function ymd(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function addDays(s: string, n: number): string {
  const d = parse(s);
  d.setUTCDate(d.getUTCDate() + n);
  return ymd(d);
}

export const diffDays = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / 864e5);
export const dow = (s: string) => parse(s).getUTCDay();
export const isWeekend = (s: string) => [0, 6].includes(dow(s));

const fmt = (s: string, o: Intl.DateTimeFormatOptions) => parse(s).toLocaleDateString("en-US", { timeZone: "UTC", ...o });
export const fmtShort = (s: string) => fmt(s, { month: "short", day: "numeric" });
export const fmtLong = (s: string) => fmt(s, { weekday: "short", month: "short", day: "numeric" });
export const fmtDay = (s: string) => fmt(s, { weekday: "short" });
export const monthName = (ym: string) => fmt(ym + "-01", { month: "long" });

export function toMin(hm: string | null | undefined): number | null {
  if (!hm) return null;
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function fmt12(hm: string | null | undefined): string {
  if (!hm) return "";
  let [h, m] = hm.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${pad(m)} ${ap}`;
}

export const fmtDur = (min: number) => {
  const m = Math.max(0, Math.round(min));
  return `${Math.floor(m / 60)}h ${pad(m % 60)}m`;
};

export const lastDay = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

export function relTime(iso: string): string {
  const d = new Date(iso);
  const dayStr = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  if (dayStr === today()) return d.toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString("en-US", { timeZone: TZ, month: "short", day: "numeric" });
}
