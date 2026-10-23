"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useData } from "@/lib/store";
import { IconClock, IconFolder, IconGear, IconPath, IconToday, IconWork } from "./Icons";

const TABS = [
  { href: "/", label: "Today", Icon: IconToday },
  { href: "/path", label: "Path to Day 1", Icon: IconPath },
  { href: "/time", label: "Time and pay", Icon: IconClock },
  { href: "/work", label: "Work", Icon: IconWork },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { ready, session } = useData();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => { if (ready && !session) router.replace("/login"); }, [ready, session, router]);
  useEffect(() => { if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {}); }, []);

  if (!ready || !session) {
    return <div className="wrap"><div className="tile"><span className="sub">Loading your tracker</span></div></div>;
  }
  return (
    <>
      {children}
      <nav className="nav" aria-label="Sections">
        {TABS.map(({ href, label, Icon }) => {
          const on = href === "/" ? path === "/" : path.startsWith(href);
          return <Link key={href} href={href} aria-label={label} aria-current={on ? "page" : undefined}><Icon /></Link>;
        })}
      </nav>
    </>
  );
}

export function Header({ title, children }: { title: string; children?: React.ReactNode }) {
  const { settings, error, setError } = useData();
  return (
    <>
      <div className="top">
        <h1>{title}</h1>
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
