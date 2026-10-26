"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Activity, Day, Draft, Item, Payslip, Settings, Task } from "./types";

type Data = {
  ready: boolean;
  session: Session | null;
  settings: Settings | null;
  items: Item[];
  tasks: Task[];
  days: Record<string, Day>;
  pay: Record<string, Payslip>;
  activity: Activity[];
  drafts: Draft[];
  error: string;
  setError: (m: string) => void;
  upsert: (table: "items" | "tasks" | "attendance" | "payslips" | "settings" | "drafts" | "activity", row: Record<string, unknown>) => Promise<boolean>;
  remove: (table: "items" | "tasks" | "attendance", key: string, value: string) => Promise<boolean>;
  log: (text: string) => void;
};

const Ctx = createContext<Data | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const sb = supabase();
  const [session, setSession] = useState<Session | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [days, setDays] = useState<Record<string, Day>>({});
  const [pay, setPay] = useState<Record<string, Payslip>>({});
  const [activity, setActivity] = useState<Activity[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => { setSession(data.session); setAuthChecked(true); });
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, [sb]);

  const load = useCallback(async (which?: string) => {
    const want = (t: string) => !which || which === t;
    const jobs: PromiseLike<unknown>[] = [];
    if (want("settings")) jobs.push(sb.from("settings").select("*").eq("id", 1).maybeSingle().then(({ data }) => data && setSettings(data as Settings)));
    if (want("items")) jobs.push(sb.from("items").select("*").then(({ data }) => data && setItems(data as Item[])));
    if (want("tasks")) jobs.push(sb.from("tasks").select("*").then(({ data }) => data && setTasks(data as Task[])));
    if (want("attendance")) jobs.push(sb.from("attendance").select("*").then(({ data }) => {
      if (!data) return;
      const m: Record<string, Day> = {};
      (data as Day[]).forEach((d) => { m[d.day] = { ...d, time_in: d.time_in?.slice(0, 5) ?? null, time_out: d.time_out?.slice(0, 5) ?? null }; });
      setDays(m);
    }));
    if (want("payslips")) jobs.push(sb.from("payslips").select("*").then(({ data }) => {
      if (!data) return;
      const m: Record<string, Payslip> = {};
      (data as Payslip[]).forEach((p) => { m[p.period] = p; });
      setPay(m);
    }));
    if (want("activity")) jobs.push(sb.from("activity").select("*").order("at", { ascending: false }).limit(40).then(({ data }) => data && setActivity(data as Activity[])));
    if (want("drafts")) jobs.push(sb.from("drafts").select("*").order("created_at", { ascending: false }).limit(40).then(({ data }) => data && setDrafts(data as Draft[])));
    await Promise.all(jobs);
  }, [sb]);

  useEffect(() => {
    if (!session) return;
    load().then(() => setLoaded(true));
    const ch = sb.channel("all");
    ["settings", "items", "tasks", "attendance", "payslips", "activity", "drafts"].forEach((t) =>
      ch.on("postgres_changes", { event: "*", schema: "public", table: t }, () => load(t))
    );
    ch.subscribe();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { sb.removeChannel(ch); window.removeEventListener("focus", onFocus); };
  }, [session, sb, load]);

  const upsert = useCallback<Data["upsert"]>(async (table, row) => {
    const { error } = await sb.from(table).upsert(row);
    if (error) { setError("That change did not save. Check your connection and try again."); return false; }
    await load(table);
    return true;
  }, [sb, load]);

  const remove = useCallback<Data["remove"]>(async (table, key, value) => {
    const { error } = await sb.from(table).delete().eq(key, value);
    if (error) { setError("That did not delete. Try again."); return false; }
    await load(table);
    return true;
  }, [sb, load]);

  const log = useCallback((text: string) => { sb.from("activity").insert({ text, source: "app" }).then(() => load("activity")); }, [sb, load]);

  const value = useMemo<Data>(() => ({
    ready: authChecked && (!session || loaded), session, settings, items, tasks, days, pay, activity, drafts, error, setError, upsert, remove, log,
  }), [authChecked, session, loaded, settings, items, tasks, days, pay, activity, drafts, error, upsert, remove, log]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useData outside provider");
  return v;
}
