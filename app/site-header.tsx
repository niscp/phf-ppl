"use client";

import { useState, type ReactNode } from "react";

type PageKey = "home" | "fixtures" | "teams" | "players" | "auction" | "history" | "results" | "sponsors";

const links: Array<{ key: PageKey; label: string; href: string }> = [
  { key: "home", label: "Home", href: "" },
  { key: "fixtures", label: "Fixtures", href: "fixtures.html" },
  { key: "teams", label: "Teams", href: "teams.html" },
  { key: "players", label: "Players", href: "players.html" },
  { key: "auction", label: "Auction", href: "auction.html" },
  { key: "history", label: "Bid history", href: "bid-history.html" },
  { key: "results", label: "Results", href: "highlights.html" },
  { key: "sponsors", label: "Sponsors", href: "index.html#sponsors" },
];

function pageLink(path: string) {
  const base = typeof window !== "undefined" && window.location.pathname.startsWith("/phf-ppl/") ? "/phf-ppl/" : "/";
  return `${base}${path}`;
}

export default function SiteHeader({ active, overlay = false, action }: { active: PageKey; overlay?: boolean; action?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <header className={`phf-site-header${overlay ? " phf-site-header-overlay" : ""}`}>
    <a className="phf-site-brand" href={pageLink("")} aria-label="PHF Premier League home"><b>PHF</b><span>Premier League</span></a>
    <button className="phf-site-menu-button" type="button" aria-expanded={open} aria-controls="phf-primary-nav" aria-label={open ? "Close navigation" : "Open navigation"} onClick={() => setOpen((value) => !value)}><i/><i/></button>
    <nav id="phf-primary-nav" className={open ? "phf-primary-nav is-open" : "phf-primary-nav"} aria-label="Main navigation">
      {links.map((item) => <a key={item.key} className={active === item.key ? "is-active" : ""} href={pageLink(item.href)} aria-current={active === item.key ? "page" : undefined} onClick={() => setOpen(false)}>{item.label}</a>)}
      {action && <span className="phf-nav-action">{action}</span>}
    </nav>
  </header>;
}
