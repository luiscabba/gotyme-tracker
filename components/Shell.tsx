"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useData } from "@/lib/store";
import { IconClock, IconDocs, IconFolder, IconGear, IconSpark, IconToday } from "./Icons";

const TABS = [
  { href: "/", label: "Today", Icon: IconToday },
  { href: "/requirements", label: "Requirements", Icon: IconDocs },
  { href: "/claude", label: "Claude", Icon: IconSpark },
  { href: "/time", label: "Time and pay", Icon: IconClock },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { ready, session, drafts } = useData();
  const pending = drafts.filter((d) => d.status === "pending").length;
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
