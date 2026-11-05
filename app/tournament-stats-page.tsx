"use client";

import { useEffect, useMemo, useState } from "react";
import SiteHeader from "./site-header";
import { getTournamentSnapshot, type TournamentSnapshot } from "./auction-client";

const pageBase = () => typeof window !== "undefined" && window.location.pathname.startsWith("/phf-ppl/") ? "/phf-ppl/" : "/";
const pageLink = (path: string) => `${pageBase()}${path}`;

export default function TournamentStatsPage() {
  const [snapshot, setSnapshot] = useState<TournamentSnapshot>({ matches: [], standings: [], player_stats: [] });
  useEffect(() => {
    let active = true;
    const refresh = async () => { try { const next = await getTournamentSnapshot(); if (active) setSnapshot(next); } catch { /* The empty state points fans to published match pages. */ } };
    void refresh();
    const timer = window.setInterval(refresh, 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const completedMatches = useMemo(() => snapshot.matches.filter((match) => match.status === "completed").sort((a, b) => b.match_number - a.match_number), [snapshot.matches]);
  const standings = useMemo(() => [...snapshot.standings].sort((a, b) => b.points - a.points || b.nrr - a.nrr), [snapshot.standings]);
  const playedPlayers = useMemo(() => snapshot.player_stats.filter((player) => player.matches > 0), [snapshot.player_stats]);
  const batters = useMemo(() => [...playedPlayers].sort((a, b) => b.runs - a.runs || (b.balls ? b.runs / b.balls : 0) - (a.balls ? a.runs / a.balls : 0)).slice(0, 10), [playedPlayers]);
  const bowlers = useMemo(() => [...playedPlayers].sort((a, b) => b.wickets - a.wickets || a.runs_conceded - b.runs_conceded).slice(0, 10), [playedPlayers]);
  const catches = useMemo(() => [...playedPlayers].sort((a, b) => b.catches - a.catches).filter((player) => player.catches > 0).slice(0, 5), [playedPlayers]);
  const awards = useMemo(() => [...playedPlayers].sort((a, b) => b.potm_count - a.potm_count).filter((player) => player.potm_count > 0).slice(0, 5), [playedPlayers]);
  const totalMatches = 15;

  return <main className="tournament-stats-page">
    <SiteHeader active="stats" />
    <section className="ts-hero"><div><span>Season 5 · Tournament stats</span><h1>The numbers<br/>behind the season.</h1><p>Standings, scorecards, and player records—updated as official match results are entered.</p><div className="ts-hero-links"><a href={pageLink("match-centre.html")}>Open Match Centre ↗</a><a href={pageLink("fixtures.html")}>View Schedule ↗</a></div></div><div className="ts-season-mark" aria-hidden="true"><strong>05</strong><span>SEASON</span></div></section>

    <section className="ts-summary" aria-label="Tournament summary">
      <article><span>League matches</span><strong>{completedMatches.length}<i> / {totalMatches}</i></strong><small>scorecards recorded</small></article>
      <article><span>Teams on the table</span><strong>{standings.length || 6}</strong><small>{standings.length ? "current standings" : "Season 5 franchises"}</small></article>
      <article><span>Top run scorer</span><strong className="ts-summary-name">{batters[0]?.name ?? "—"}</strong><small>{batters[0] ? `${batters[0].runs} runs · ${batters[0].matches} matches` : "Appears after a scorecard"}</small></article>
      <article><span>Top wicket taker</span><strong className="ts-summary-name">{bowlers[0]?.name ?? "—"}</strong><small>{bowlers[0] ? `${bowlers[0].wickets} wickets · ${bowlers[0].matches} matches` : "Appears after a scorecard"}</small></article>
    </section>

    {!completedMatches.length && <section className="ts-first-scorecard"><div><span>Waiting for the first result</span><h2>Records start with the scorecard.</h2><p>Once a match result is recorded, the points table, batting and bowling lists, catches, and Player of the Match records will update here.</p></div><a href={pageLink("fixtures.html")}>See the published schedule ↗</a></section>}

    <section className="ts-main-content">
      <div className="ts-section-heading"><div><span>League position</span><h2>Points table</h2></div><small>2 points for a win · NRR breaks equal points</small></div>
      {standings.length ? <div className="ts-table-wrap"><table className="ts-table"><thead><tr><th scope="col">Pos</th><th scope="col">Team</th><th scope="col">Played</th><th scope="col">Won</th><th scope="col">Lost</th><th scope="col">Points</th><th scope="col">NRR</th></tr></thead><tbody>{standings.map((team, index) => <tr key={team.team_id}><td>{String(index + 1).padStart(2, "0")}</td><th scope="row">{team.team_name}</th><td>{team.played}</td><td>{team.wins}</td><td>{team.losses}</td><td>{team.points}</td><td>{team.played ? team.nrr.toFixed(2) : "—"}</td></tr>)}</tbody></table></div> : <div className="ts-empty-row"><strong>Standings are not available yet.</strong><span>They will appear as soon as an official result is recorded.</span></div>}

      <div className="ts-player-grids">
        <section className="ts-player-board"><header><div><span>Batting</span><h3>Most runs</h3></div><b>Runs</b></header>{batters.length ? <ol>{batters.map((player, index) => <li key={player.player_id}><i>{String(index + 1).padStart(2, "0")}</i><span><strong>{player.name}</strong><small>{player.team_name ?? "Team not listed"} · {player.matches} {player.matches === 1 ? "match" : "matches"}</small></span><b>{player.runs}</b></li>)}</ol> : <p className="ts-board-empty">Player batting records will appear after the first scorecard.</p>}</section>
        <section className="ts-player-board"><header><div><span>Bowling</span><h3>Most wickets</h3></div><b>Wickets</b></header>{bowlers.length ? <ol>{bowlers.map((player, index) => <li key={player.player_id}><i>{String(index + 1).padStart(2, "0")}</i><span><strong>{player.name}</strong><small>{player.team_name ?? "Team not listed"} · {player.matches} {player.matches === 1 ? "match" : "matches"}</small></span><b>{player.wickets}</b></li>)}</ol> : <p className="ts-board-empty">Player bowling records will appear after the first scorecard.</p>}</section>
      </div>

      <div className="ts-extra-records">
        <section><span>Fielding</span><h3>Most catches</h3>{catches.length ? <ol>{catches.map((player) => <li key={player.player_id}><b>{player.name}</b><span>{player.catches} catches</span></li>)}</ol> : <p>Catch records will appear with match scorecards.</p>}</section>
        <section><span>Match awards</span><h3>Player of the Match</h3>{awards.length ? <ol>{awards.map((player) => <li key={player.player_id}><b>{player.name}</b><span>{player.potm_count} {player.potm_count === 1 ? "award" : "awards"}</span></li>)}</ol> : <p>Award records will appear after the first match.</p>}</section>
      </div>

      <div className="ts-section-heading ts-results-heading"><div><span>Official scorecards</span><h2>Match results</h2></div><a href={pageLink("match-centre.html")}>Open Match Centre ↗</a></div>
      {completedMatches.length ? <div className="ts-results-list">{completedMatches.map((match) => <a href={pageLink(`match.html?match=${match.match_number}`)} key={match.id}><span>Match {String(match.match_number).padStart(2, "0")}<small>{match.match_date}</small></span><strong>{match.home_team}<i>vs</i>{match.away_team}</strong><b>{match.home_runs ?? "—"}/{match.home_wickets ?? "—"}<i>·</i>{match.away_runs ?? "—"}/{match.away_wickets ?? "—"}</b><em>Scorecard ↗</em></a>)}</div> : <div className="ts-empty-row"><strong>No results recorded yet.</strong><span>Open a match preview in the Match Centre while we wait for the first scorecard.</span></div>}
    </section>
    <footer className="ts-footer"><a href={pageLink("")}>PHF Premier League</a><span>Season 5 · Tournament stats</span><a href={pageLink("fan.html")}>Make Fan Picks ↗</a></footer>
  </main>;
}
