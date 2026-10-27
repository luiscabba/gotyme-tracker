"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SetPasscodeScreen, UnlockScreen } from "./Lock";
import { isFresh, wantsReset } from "@/lib/lock";
import { useData } from "@/lib/store";
import { today } from "@/lib/dates";
import { IconClock, IconDocs, IconFolder, IconGear, IconSpark, IconToday } from "./Icons";

const TABS = [
  { href: "/", label: "Today", Icon: IconToday },
  { href: "/requirements", label: "Requirements", Icon: IconDocs },
  { href: "/files", label: "Files", Icon: IconFolder },
  { href: "/claude", label: "Claude", Icon: IconSpark },
  { href: "/time", label: "Time and pay", Icon: IconClock },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { ready, session, settings, drafts } = useData();
  const [fresh, setFresh] = useState<boolean | null>(null);
  const [reset, setReset] = useState(false);
  const pending = drafts.filter((d) => d.status === "pending").length;
  const path = usePathname();
  const tabs = TABS.filter((t) => t.href !== "/time" || !settings || settings.start_date <= today());

  useEffect(() => { setFresh(isFresh()); setReset(wantsReset()); }, [session]);
  useEffect(() => { if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {}); }, []);

  if (ready && fresh !== null) {
    if (!session) return <UnlockScreen />;
    if (settings && (!settings.passcode_set || reset)) return <SetPasscodeScreen isNew={!settings.passcode_set} onDone={() => window.location.reload()} />;
    if (!fresh && settings?.passcode_set) return <UnlockScreen />;
  }
  if (!ready || !session || fresh === null) {
    return <div className="wrap"><div className="tile"><span className="sub">Loading your tracker</span></div></div>;
  }
  return (
    <>
      {children}
      <nav className="nav" aria-label="Sections" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0,1fr))`, width: `min(${tabs.length * 75}px, calc(100% - 32px))` }}>
        {tabs.map(({ href, label, Icon }) => {
          const on = href === "/" ? path === "/" : path.startsWith(href);
          return <Link key={href} href={href} aria-label={href === "/claude" && pending ? `${label}, ${pending} waiting` : label} aria-current={on ? "page" : undefined}><Icon />{href === "/claude" && pending > 0 && !on && <span className="badge" />}</Link>;
        })}
      </nav>
    </>
  );
}

export function Header({ title, lead, children }: { title: string; lead?: React.ReactNode; children?: React.ReactNode }) {
  const { settings, error, setError } = useData();
  return (
    <>
      <div className="top">
        <div className="row" style={{ gap: 10, minWidth: 0 }}>{lead}<h1>{title}</h1></div>
        <div className="row">
          {children}
          {settings?.drive_folder_url && (
            <a className="icon-btn" href={settings.drive_folder_url} target="_blank" rel="noopener" aria-label="Open GoTyme folder in Drive"><IconFolder /></a>
          )}
          <Link className="icon-btn" href="/settings" aria-label="Settings"><IconGear /></Link>
        </div>
      </div>
      {error && <button type="button" className="banner" style={{ border: "none", textAlign: "left" }} onClick={() => setError("")}>{error}</button>}
    </>
  );
}
