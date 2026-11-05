"use client";

import { useEffect, useMemo, useState } from "react";
import SiteHeader from "./site-header";
import { getTournamentSnapshot, type TournamentSnapshot } from "./auction-client";
import { announcedTeams } from "./season5-teams";
import { fixtureTeamOrder, seasonFiveFixtures, teamNameForSlot } from "./season5-fixtures";

const publicBase = () => typeof window !== "undefined" && window.location.pathname.startsWith("/phf-ppl/") ? "/phf-ppl/" : "/";
const localLink = (path: string) => `${publicBase()}${path}`;
const asset = (path: string | null | undefined) => path ? `${publicBase()}${path.replace(/^\//, "")}` : "";

function readableDate(value: string) {
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime()) ? "Date to be confirmed" : date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function Home() {
  const [tournament, setTournament] = useState<TournamentSnapshot>({ matches: [], standings: [], player_stats: [] });

  useEffect(() => {
    if (window.location.hash.toLowerCase() === "#fixtures") window.location.replace(localLink("fixtures.html"));
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const snapshot = await getTournamentSnapshot();
        if (active) setTournament(snapshot);
      } catch { /* The published schedule remains available if live stats are offline. */ }
    };
    void refresh();
    const timer = window.setInterval(refresh, 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const featuredMatch = useMemo(() => {
    const upcoming = [...tournament.matches].filter((match) => match.status === "scheduled").sort((a, b) => a.match_number - b.match_number)[0];
    const latestCompleted = [...tournament.matches].filter((match) => match.status === "completed").sort((a, b) => b.match_number - a.match_number)[0];
    if (upcoming) return {
      number: upcoming.match_number, date: readableDate(upcoming.match_date), time: upcoming.match_time,
      home: upcoming.home_team, away: upcoming.away_team, homeId: upcoming.home_team_id, awayId: upcoming.away_team_id,
      completed: false, result: "",
    };
    if (latestCompleted) return {
      number: latestCompleted.match_number, date: readableDate(latestCompleted.match_date), time: latestCompleted.match_time,
      home: latestCompleted.home_team, away: latestCompleted.away_team, homeId: latestCompleted.home_team_id, awayId: latestCompleted.away_team_id,
      completed: true, result: latestCompleted.result_text ?? `${latestCompleted.winner_team ?? "Match"} won`,
    };
    const first = seasonFiveFixtures[0];
    return {
      number: first.match_number, date: readableDate(first.date), time: first.time,
      home: teamNameForSlot(first.home_slot, announcedTeams), away: teamNameForSlot(first.away_slot, announcedTeams),
      homeId: fixtureTeamOrder[first.home_slot - 1], awayId: fixtureTeamOrder[first.away_slot - 1],
      completed: false, result: "",
    };
  }, [tournament.matches]);

  const teamLogo = (id: string) => {
    const team = announcedTeams.find((item) => item.id === id);
    return team?.logo_url ? asset(team.logo_url) : "";
  };
  const completedMatches = tournament.matches.filter((match) => match.status === "completed").length;
  const topRunScorer = [...tournament.player_stats].filter((player) => player.matches > 0).sort((a, b) => b.runs - a.runs)[0];
  const topWicketTaker = [...tournament.player_stats].filter((player) => player.matches > 0).sort((a, b) => b.wickets - a.wickets)[0];

  return <main className="phf-home-hub">
    <SiteHeader active="home" />

    <section className="hub-hero">
      <div className="hub-hero-backdrop" aria-hidden="true" />
      <div className="hub-hero-copy">
        <p className="hub-season-line">PHF Premier League <span>Season 5</span></p>
        <h1>The season is on.<br/><em>Make your call.</em></h1>
        <p className="hub-intro">Follow the matchups, make your Fan Picks, and keep up with the story as the tournament unfolds.</p>
        <div className="hub-hero-actions">
          <a className="hub-primary-action" href={localLink("fan.html")}>Make Fan Picks <span>↗</span></a>
          <a className="hub-secondary-action" href={localLink("fixtures.html")}>View Schedule</a>
        </div>
        <div className="hub-season-counts" aria-label="Season format">
          <span><b>6</b> teams</span><span><b>15</b> league matches</span><span><b>17</b> matches total</span>
        </div>
      </div>

      <a className="hub-featured-match" href={localLink(`match.html?match=${featuredMatch.number}`)} aria-label={`Open match centre for match ${featuredMatch.number}, ${featuredMatch.home} versus ${featuredMatch.away}`}>
        <div className="hub-match-topline"><span>{featuredMatch.completed ? "Latest result" : "Next match"}</span><b>Match {String(featuredMatch.number).padStart(2, "0")}</b></div>
        <div className="hub-match-date">{featuredMatch.date} <i>·</i> {featuredMatch.time}</div>
        <div className="hub-match-teams">
          <div className="hub-match-team">{teamLogo(featuredMatch.homeId) && <img src={teamLogo(featuredMatch.homeId)} alt=""/>}<strong>{featuredMatch.home}</strong></div>
          <span className="hub-versus">VS</span>
          <div className="hub-match-team">{teamLogo(featuredMatch.awayId) && <img src={teamLogo(featuredMatch.awayId)} alt=""/>}<strong>{featuredMatch.away}</strong></div>
        </div>
        {featuredMatch.completed ? <p className="hub-match-result">{featuredMatch.result}</p> : <p className="hub-match-note">Open squads, player analysis and match details</p>}
        <span className="hub-match-link">Open Match Centre <b>↗</b></span>
      </a>
    </section>

    <section className="hub-destinations" aria-label="Season destinations">
      <a className="hub-destination hub-picks" href={localLink("fan.html")}><span className="hub-destination-mark">P</span><div><h2>Fan Picks</h2><p>Call the winner, pick players, join the match poll, and climb the fan boards.</p></div><b className="hub-destination-arrow">↗</b></a>
      <a className="hub-destination" href={localLink("fixtures.html")}><span className="hub-destination-mark">S</span><div><h2>Schedule</h2><p>See every matchday, filter by team, and open a match from the schedule.</p></div><b className="hub-destination-arrow">↗</b></a>
      <a className="hub-destination" href={localLink("match-centre.html")}><span className="hub-destination-mark">M</span><div><h2>Match Centre</h2><p>See the latest result, the next matchup, and each match’s analysis.</p></div><b className="hub-destination-arrow">↗</b></a>
      <a className="hub-destination" href={localLink("stats.html")}><span className="hub-destination-mark">T</span><div><h2>Tournament Stats</h2><p>Follow the table, scorecard results, and player records as they build.</p></div><b className="hub-destination-arrow">↗</b></a>
    </section>

    <section className="hub-tournament-pulse" aria-labelledby="hub-pulse-title">
      <header className="hub-section-heading"><div><span>Season 5, as it stands</span><h2 id="hub-pulse-title">Tournament pulse</h2></div><a href={localLink("stats.html")}>All tournament stats <b>↗</b></a></header>
      <div className="hub-pulse-grid">
        <article className="hub-table-panel">
          <div className="hub-panel-heading"><div><span>Points table</span><h3>Every point counts.</h3></div><span className="hub-live-indicator"><i/>{completedMatches ? "Scorecards recorded" : "Season standings"}</span></div>
          {tournament.standings.length ? <div className="hub-standings-table" role="table" aria-label="Tournament standings">
            <div className="hub-standings-row hub-standings-head" role="row"><span>Team</span><span>P</span><span>W</span><span>Pts</span><span>NRR</span></div>
            {[...tournament.standings].sort((a, b) => b.points - a.points || b.nrr - a.nrr).slice(0, 4).map((team, index) => <div className="hub-standings-row" role="row" key={team.team_id}><strong><i>{String(index + 1).padStart(2, "0")}</i>{team.team_name}</strong><span>{team.played}</span><span>{team.wins}</span><b>{team.points}</b><span>{team.played ? team.nrr.toFixed(2) : "—"}</span></div>)}
          </div> : <div className="hub-stats-empty"><strong>The table will take shape after the first scorecard.</strong><p>Standings and net run rate update from recorded match results.</p><a href={localLink("fixtures.html")}>See the schedule ↗</a></div>}
          {tournament.standings.length > 4 && <a className="hub-panel-link" href={localLink("stats.html")}>View full standings ↗</a>}
        </article>
        <article className="hub-records-panel">
          <div className="hub-panel-heading"><div><span>Player records</span><h3>Names to watch.</h3></div><span className="hub-records-total">{completedMatches} {completedMatches === 1 ? "match" : "matches"} played</span></div>
          <div className="hub-record-row"><span className="hub-record-icon">R</span><div><small>Most runs</small><strong>{topRunScorer?.name ?? "Awaiting first scorecard"}</strong></div><b>{topRunScorer ? `${topRunScorer.runs} runs` : "—"}</b></div>
          <div className="hub-record-row"><span className="hub-record-icon">W</span><div><small>Most wickets</small><strong>{topWicketTaker?.name ?? "Awaiting first scorecard"}</strong></div><b>{topWicketTaker ? `${topWicketTaker.wickets} wkts` : "—"}</b></div>
          <a className="hub-panel-link" href={localLink("stats.html")}>Explore player records ↗</a>
        </article>
      </div>
    </section>

    <section className="hub-sponsor-line" aria-label="Season partners"><span>Season partners</span><b>Kotak Mahindra Bank</b><i/><b>The Aartah School</b><i/><b>Viseshta Avenues</b><a href={localLink("index.html#sponsors")}>Meet our partners ↗</a></section>
    <footer className="hub-footer"><a href={localLink("")} className="hub-footer-brand">PHF <span>Premier League</span></a><span>Season 5 · 2026</span><a href={localLink("stats.html")}>Tournament Stats ↑</a></footer>
  </main>;
}
