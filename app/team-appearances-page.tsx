"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import SiteHeader from "./site-header";
import { getTournamentSnapshot, type TournamentMatch } from "./auction-client";
import appearanceData from "./season5-appearances.json";
import "./team-appearances.css";

type PlayerRow = { name: string; appearances: Record<string, boolean> };
type Squad = { name: string; color: string; fixtures: number[]; players: PlayerRow[] };
const squads = (appearanceData as { teams: Squad[] }).teams;

function normalized(value: string) {
  return value.toLowerCase().replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function playersInScorecard(match: TournamentMatch, teamName: string): string[] {
  const card = match.cricheroes_live_score?.full_scorecard;
  if (!card) return [];
  const teamKey = normalized(teamName).replace(/\b(phf|the|prestige)\b/g, "").trim();
  const aKey = normalized(card.team_a?.name ?? "").replace(/\b(phf|the|prestige)\b/g, "").trim();
  const side = teamKey === aKey ? "team_a" : "team_b";
  const own = card[side];
  const opposing = card[side === "team_a" ? "team_b" : "team_a"];
  return [
    ...(own?.scorecard ?? []).flatMap((inning) => inning.batting.map((player) => player.name)),
    ...(opposing?.scorecard ?? []).flatMap((inning) => inning.bowling.map((player) => player.name)),
  ];
}

function isScheduled(match: TournamentMatch | undefined) {
  return match?.status !== "completed" && match?.cricheroes_status !== "completed";
}

export default function TeamAppearancesPage() {
  const [selectedName, setSelectedName] = useState(squads[0].name);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const selected = squads.find((team) => team.name === selectedName) ?? squads[0];

  useEffect(() => {
    let active = true;
    const sync = async () => {
      try {
        const snapshot = await getTournamentSnapshot();
        if (active) { setMatches(snapshot.matches); setLastSynced(new Date()); }
      } catch { /* Keep the workbook snapshot available when the live API is unreachable. */ }
    };
    void sync();
    const timer = window.setInterval(() => void sync(), 60_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const matchesByNumber = useMemo(() => new Map(matches.map((match) => [match.match_number, match])), [matches]);
  const rows = useMemo(() => selected.players.map((player) => {
    const played = new Set<number>(Object.entries(player.appearances).filter(([, didPlay]) => didPlay).map(([number]) => Number(number)));
    const syncMarks = new Set<number>();
    for (const number of selected.fixtures) {
      if (player.appearances[String(number)] !== undefined) continue;
      const fixture = matchesByNumber.get(number);
      if (!fixture || isScheduled(fixture)) continue;
      const names = playersInScorecard(fixture, selected.name).map(normalized);
      const playerKey = normalized(player.name);
      // Match full names exactly; also accept an unambiguous, short workbook alias.
      const exact = names.includes(playerKey);
      const alias = playerKey.split(" ").length === 1 && playerKey.length >= 4
        && selected.players.filter((candidate) => normalized(candidate.name).startsWith(playerKey)).length === 1
        && names.some((name) => name.startsWith(playerKey));
      if (exact || alias) { played.add(number); syncMarks.add(number); }
    }
    return { ...player, played, syncMarks };
  }).sort((a, b) => b.played.size - a.played.size || a.name.localeCompare(b.name)), [selected, matchesByNumber]);

  const total = rows.reduce((sum, player) => sum + player.played.size, 0);
  const playedThisTeam = selected.fixtures.filter((number) => !isScheduled(matchesByNumber.get(number)) || selected.players.some((p) => p.appearances[String(number)] !== undefined));
  const homeUrl = typeof window !== "undefined" && window.location.pathname.startsWith("/phf-ppl/") ? "/phf-ppl/" : "/";

  return <main className="appearance-page">
    <SiteHeader active="team-appearances" />
    <section className="appearance-hero">
      <div className="appearance-hero-copy">
        <p className="appearance-eyebrow">PHF Premier League · Season 5</p>
        <h1>Squad<br/><em>appearances.</em></h1>
        <p>Every team’s full squad, with each player’s match-by-match appearances.</p>
      </div>
      <div className="appearance-hero-mark" aria-hidden="true">XI</div>
      <div className="appearance-hero-facts"><div><b>{squads.length}</b><span>teams</span></div><div><b>{squads.reduce((count, team) => count + team.players.length, 0)}</b><span>players tracked</span></div></div>
    </section>

    <section className="appearance-content">
      <div className="appearance-heading"><div><span>Team squads</span><h2>Who played?</h2></div><p>Sorted by total matches played</p></div>
      <div className="appearance-tabs" role="tablist" aria-label="Choose a team">
        {squads.map((team) => <button type="button" role="tab" aria-selected={team.name === selected.name} className={team.name === selected.name ? "active" : ""} key={team.name} onClick={() => setSelectedName(team.name)} style={{ "--team-color": team.color } as CSSProperties}><i/><span>{team.name}</span><b>{team.players.length}</b></button>)}
      </div>

      <div className="appearance-team-banner" style={{ "--team-color": selected.color } as CSSProperties}>
        <div><span>Complete squad</span><h3>{selected.name}</h3></div>
        <div className="appearance-team-summary"><b>{playedThisTeam.length}<small> / {selected.fixtures.length}</small></b><span>team matches completed</span></div>
      </div>

      <div className="appearance-table-wrap">
        <table className="appearance-table">
          <thead><tr><th scope="col">Player</th><th scope="col" className="total-col">Played</th>{selected.fixtures.map((number, index) => <th scope="col" key={number} title={`CricHeroes fixture ${number}`}>Match {index + 1}</th>)}</tr></thead>
          <tbody>{rows.map((player, index) => <tr key={player.name} style={{ "--team-color": selected.color } as CSSProperties}>
            <td><span className="appearance-rank">{String(index + 1).padStart(2, "0")}</span><strong>{player.name.replace(/\s*\(C\)$/i, "")}<small>{/\(C\)$/i.test(player.name) ? "Captain" : "Squad player"}</small></strong></td>
            <td className="total-col"><b className="appearance-total">{player.played.size}</b><span> / {selected.fixtures.length}</span></td>
            {selected.fixtures.map((number) => {
              const tracked = player.appearances[String(number)];
              const synced = player.syncMarks.has(number);
              const match = matchesByNumber.get(number);
              const status = tracked === true || synced ? "played" : tracked === false ? "missed" : "pending";
              const label = status === "played" ? (synced ? "Played · CH" : "Played") : status === "missed" ? "Did not play" : match && isScheduled(match) ? "Upcoming" : "Awaiting scorecard";
              return <td key={number}><span className={`appearance-status ${status}`} title={label} aria-label={`${player.name}: ${label}`}>{status === "played" ? "✓" : status === "missed" ? "—" : "·"}<small>{status === "played" ? "Played" : status === "missed" ? "No" : match && isScheduled(match) ? "Soon" : "Pending"}</small></span></td>;
            })}
          </tr>)}</tbody>
        </table>
      </div>
      <div className="appearance-sync-note"><span className="appearance-sync-dot"/><p><strong>{lastSynced ? "CricHeroes connected" : "Week 1 tracker loaded"}</strong> First two match appearances are copied from the team tracker. Later appearances are added from CricHeroes scorecards when the player appears in the batting or bowling card. Scorecards can omit players who neither batted nor bowled, so unconfirmed entries stay pending.</p>{lastSynced && <time dateTime={lastSynced.toISOString()}>Updated {lastSynced.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>}</div>
      <div className="appearance-legend"><span><i className="played"/>Played</span><span><i className="missed"/>Did not play (tracker)</span><span><i className="pending"/>Awaiting confirmation</span></div>
    </section>
    <footer className="appearance-footer"><a href={homeUrl}>PHF Premier League</a><span>Season 5 · 2026</span></footer>
  </main>;
}
