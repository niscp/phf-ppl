"use client";

import { useMemo, useState } from "react";
import playersJson from "./season5-players.json";
import { auctionExcludedPlayerIds } from "./season5-teams";

type Discipline = {
  innings?: number | null;
  runs?: number | null;
  average?: number | string | null;
  strikeRate?: number | string | null;
  matches?: number | null;
  wickets?: number | null;
  economy?: number | string | null;
  best?: string | null;
};

type Player = {
  id: string;
  name: string;
  role: string;
  photo: string | null;
  cricheroesUrl: string | null;
  stats: { batting?: Discipline; bowling?: Discipline } | null;
  statsSource?: string;
  statsChecked?: string;
  statsProfileName?: string;
};

const players = (playersJson as Player[]).filter((player) => !auctionExcludedPlayerIds.has(player.id)).sort((a, b) => a.name.localeCompare(b.name));
const pageSize = 12;
const roleOptions = ["All players", "All-rounder", "Batter", "Bowler"];

function getAssetUrl(path: string) {
  const base = typeof window !== "undefined" && window.location.pathname.startsWith("/phf-ppl/") ? "/phf-ppl" : "";
  return `${base}${path}`;
}

function StatBlock({ title, data, kind }: { title: string; data?: Discipline; kind: "batting" | "bowling" }) {
  const fields = kind === "batting"
    ? [["Innings", data?.innings], ["Runs", data?.runs], ["Average", data?.average], ["Strike rate", data?.strikeRate]]
    : [["Matches", data?.matches], ["Wickets", data?.wickets], ["Economy", data?.economy], ["Best", data?.best]];
  const hasValues = fields.some(([, value]) => value !== null && value !== undefined);

  return <div className={`roster-stat-block ${kind}`}>
    <h3>{title}</h3>
    {hasValues ? <dl>{fields.map(([label, value]) => <div key={String(label)}><dt>{label}</dt><dd>{value ?? "—"}</dd></div>)}</dl>
      : <p>Verified stats not available yet</p>}
  </div>;
}

export default function PlayersPage() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("All players");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Player | null>(null);

  const filtered = useMemo(() => players.filter((player) => {
    const matchesName = player.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
    return matchesName && (role === "All players" || role === player.role);
  }), [query, role]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const profileCount = players.filter((player) => player.cricheroesUrl).length;
  const verifiedCount = players.filter((player) => player.statsSource).length;
  const homeUrl = typeof window !== "undefined" && window.location.pathname.startsWith("/phf-ppl/") ? "/phf-ppl/" : "/";

  function changePage(nextPage: number) {
    setPage(nextPage);
    window.requestAnimationFrame(() => document.getElementById("player-directory")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return <main className="roster-page">
    <header className="roster-header">
      <a className="roster-logo" href={homeUrl} aria-label="PHF Premier League home"><b>PHF</b><span>Premier League</span></a>
      <nav aria-label="Roster navigation"><a href={homeUrl}>Home</a><a href={`${homeUrl}teams.html`}>Teams</a><span>Season 5 player pool</span></nav>
    </header>

    <section className="roster-hero">
      <div className="roster-hero-copy">
        <p className="roster-eyebrow">PHF Premier League / 2026</p>
        <h1>The player<br/><em>pool.</em></h1>
        <p>The Season 5 auction pool. Playing captains are shown with their teams instead of here.</p>
      </div>
      <div className="roster-hero-portraits" aria-hidden="true">
        {players.filter((player) => player.photo).slice(0, 4).map((player) => <img key={player.id} src={getAssetUrl(player.photo!)} alt="" />)}
      </div>
      <div className="roster-hero-count"><b>{players.length}</b><span>auction players</span></div>
    </section>

    <section className="roster-directory" id="player-directory" aria-label="Registered players">
      <div className="roster-intro"><div><p className="roster-eyebrow">The roster</p><h2>Meet the players.</h2></div><p>{verifiedCount} of {profileCount} submitted CricHeroes profiles have career stats. {players.length - profileCount} registrations did not include a profile link. These are career totals, not PHF-only figures.</p></div>
      <div className="roster-controls">
        <label className="roster-search">Find a player<input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search by name" /></label>
        <label className="roster-role">Playing role<select value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }}>{roleOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
        <span className="roster-result-count" aria-live="polite">{filtered.length} {filtered.length === 1 ? "player" : "players"}</span>
      </div>

      {visible.length ? <div className="roster-grid">{visible.map((player) => <article className="roster-card" key={player.id} tabIndex={0} role="button" onClick={() => setSelected(player)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelected(player); } }} aria-label={`Open ${player.name} profile`}>
        <div className="roster-photo">
          {player.photo ? <img src={getAssetUrl(player.photo)} alt={`${player.name}, Season 5 registered player`} loading="lazy" /> : <div className="roster-photo-fallback" aria-label="Photo not submitted">{player.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("")}</div>}
          <span className="roster-role-tag">{player.role}</span>
        </div>
        <div className="roster-card-body">
          <h3>{player.name}</h3>
          {player.statsProfileName && <p className="roster-alias-note">CricHeroes profile: {player.statsProfileName}</p>}
          <div className="roster-stat-pair"><StatBlock title="Batting" data={player.stats?.batting} kind="batting" /><StatBlock title="Bowling" data={player.stats?.bowling} kind="bowling" /></div>
          <button type="button" className="roster-open-profile" onClick={(event) => { event.stopPropagation(); setSelected(player); }}>View player card <span aria-hidden="true">↗</span></button>
        </div>
      </article>)}</div> : <div className="roster-empty">No players match that search.</div>}

      {pageCount > 1 && <div className="roster-pages" aria-label="Player pages"><button type="button" onClick={() => changePage(Math.max(1, page - 1))} disabled={page === 1}>Previous</button><span>Page {page} of {pageCount}</span><button type="button" onClick={() => changePage(Math.min(pageCount, page + 1))} disabled={page === pageCount}>Next</button></div>}
      <p className="roster-source-note">Player names, submitted photos and roles come from the Season 5 registration form. Playing captains are excluded from this auction pool and appear on the Teams page. Career stats come from each player-submitted CricHeroes link; profile nicknames are shown when they differ. These are not Season 5 or PHF-only totals. An unavailable message never means zero runs or wickets. No contact or payment details are published.</p>
    </section>
    {selected && <div className="player-drawer-shell" role="dialog" aria-modal="true" aria-label={`${selected.name} player profile`} onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
      <article className="player-drawer">
        <button className="player-drawer-close" type="button" onClick={() => setSelected(null)} aria-label="Close player profile">×</button>
        <div className="player-drawer-photo">{selected.photo ? <img src={getAssetUrl(selected.photo)} alt={selected.name}/> : <div className="roster-photo-fallback">{selected.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("")}</div>}<span>{selected.role}</span></div>
        <div className="player-drawer-body"><p className="roster-eyebrow">Season 5 auction player</p><h2>{selected.name}</h2>{selected.statsProfileName && <p className="roster-alias-note">CricHeroes profile: {selected.statsProfileName}</p>}<div className="roster-stat-pair"><StatBlock title="Batting career" data={selected.stats?.batting} kind="batting"/><StatBlock title="Bowling career" data={selected.stats?.bowling} kind="bowling"/></div>{selected.cricheroesUrl ? <a className="player-drawer-link" href={selected.statsSource ?? selected.cricheroesUrl} target="_blank" rel="noopener noreferrer">Open verified CricHeroes profile ↗</a> : <p className="roster-no-profile">CricHeroes profile not supplied</p>}<small>Career totals shown where a submitted profile could be verified. Season 5 auction and tournament results will update separately.</small></div>
      </article>
    </div>}
    <footer className="roster-footer"><a href={homeUrl}>PHF Premier League</a><span>Season 5 · 2026</span></footer>
  </main>;
}
