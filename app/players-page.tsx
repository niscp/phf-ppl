"use client";

import { useMemo, useState } from "react";
import playersJson from "./season5-players.json";

type Discipline = {
  innings?: number | null;
  runs?: number | null;
  average?: number | null;
  strikeRate?: number | null;
  overs?: number | null;
  wickets?: number | null;
  economy?: number | null;
  best?: string | null;
};

type Player = {
  id: string;
  name: string;
  role: string;
  photo: string | null;
  cricheroesUrl: string | null;
  stats: { batting?: Discipline; bowling?: Discipline } | null;
};

const players = (playersJson as Player[]).slice().sort((a, b) => a.name.localeCompare(b.name));
const pageSize = 12;
const roleOptions = ["All players", "All-rounder", "Batter", "Bowler"];

function getAssetUrl(path: string) {
  const base = typeof window !== "undefined" && window.location.pathname.startsWith("/phf-ppl/") ? "/phf-ppl" : "";
  return `${base}${path}`;
}

function StatBlock({ title, data, kind }: { title: string; data?: Discipline; kind: "batting" | "bowling" }) {
  const fields = kind === "batting"
    ? [["Innings", data?.innings], ["Runs", data?.runs], ["Average", data?.average], ["Strike rate", data?.strikeRate]]
    : [["Overs", data?.overs], ["Wickets", data?.wickets], ["Economy", data?.economy], ["Best", data?.best]];
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

  const filtered = useMemo(() => players.filter((player) => {
    const matchesName = player.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
    return matchesName && (role === "All players" || role === player.role);
  }), [query, role]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const profileCount = players.filter((player) => player.cricheroesUrl).length;
  const homeUrl = typeof window !== "undefined" && window.location.pathname.startsWith("/phf-ppl/") ? "/phf-ppl/" : "/";

  return <main className="roster-page">
    <header className="roster-header">
      <a className="roster-logo" href={homeUrl} aria-label="PHF Premier League home"><b>PHF</b><span>Premier League</span></a>
      <nav aria-label="Roster navigation"><a href={homeUrl}>Back to home</a><span>Season 5 player pool</span></nav>
    </header>

    <section className="roster-hero">
      <div className="roster-hero-copy">
        <p className="roster-eyebrow">PHF Premier League / 2026</p>
        <h1>The player<br/><em>pool.</em></h1>
        <p>Every player who entered the Season 5 registration form. Real faces, real names, and the roles they chose.</p>
      </div>
      <div className="roster-hero-portraits" aria-hidden="true">
        {players.filter((player) => player.photo).slice(0, 4).map((player) => <img key={player.id} src={getAssetUrl(player.photo!)} alt="" />)}
      </div>
      <div className="roster-hero-count"><b>{players.length}</b><span>player registrations</span></div>
    </section>

    <section className="roster-directory" aria-label="Registered players">
      <div className="roster-intro"><div><p className="roster-eyebrow">The roster</p><h2>Meet the players.</h2></div><p>{profileCount} players supplied a CricHeroes profile. Batting and bowling figures will appear only when their full records can be verified.</p></div>
      <div className="roster-controls">
        <label className="roster-search">Find a player<input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search by name" /></label>
        <label className="roster-role">Playing role<select value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }}>{roleOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
        <span className="roster-result-count" aria-live="polite">{filtered.length} {filtered.length === 1 ? "player" : "players"}</span>
      </div>

      {visible.length ? <div className="roster-grid">{visible.map((player) => <article className="roster-card" key={player.id}>
        <div className="roster-photo">
          {player.photo ? <img src={getAssetUrl(player.photo)} alt={`${player.name}, Season 5 registered player`} loading="lazy" /> : <div className="roster-photo-fallback" aria-label="Photo not submitted">{player.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("")}</div>}
          <span className="roster-role-tag">{player.role}</span>
        </div>
        <div className="roster-card-body">
          <h3>{player.name}</h3>
          <div className="roster-stat-pair"><StatBlock title="Batting" data={player.stats?.batting} kind="batting" /><StatBlock title="Bowling" data={player.stats?.bowling} kind="bowling" /></div>
          {player.cricheroesUrl ? <a className="roster-profile-link" href={player.cricheroesUrl} target="_blank" rel="noopener noreferrer">Open CricHeroes profile <span aria-hidden="true">↗</span></a> : <span className="roster-no-profile">CricHeroes profile not supplied</span>}
        </div>
      </article>)}</div> : <div className="roster-empty">No players match that search.</div>}

      {pageCount > 1 && <div className="roster-pages" aria-label="Player pages"><button type="button" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>Previous</button><span>Page {page} of {pageCount}</span><button type="button" onClick={() => setPage(Math.min(pageCount, page + 1))} disabled={page === pageCount}>Next</button></div>}
      <p className="roster-source-note">Player names, submitted photos and playing roles come from the Season 5 registration form. A dash or unavailable message never means zero runs or wickets. No contact or payment details are published.</p>
    </section>
    <footer className="roster-footer"><a href={homeUrl}>PHF Premier League</a><span>Season 5 · 2026</span></footer>
  </main>;
}
