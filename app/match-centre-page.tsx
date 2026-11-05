"use client";

import { useEffect, useMemo, useState } from "react";
import SiteHeader from "./site-header";
import { getTournamentSnapshot, type TournamentMatch, type TournamentSnapshot } from "./auction-client";
import { announcedTeams } from "./season5-teams";
import { fixtureTeamOrder, seasonFiveFixtures, teamNameForSlot } from "./season5-fixtures";

const basePath = () => typeof window !== "undefined" && window.location.pathname.startsWith("/phf-ppl/") ? "/phf-ppl/" : "/";
const link = (path: string) => `${basePath()}${path}`;
const image = (path: string | null | undefined) => path ? `${basePath()}${path.replace(/^\//, "")}` : "";

type MatchCentreItem = {
  number: number; date: string; time: string; home: string; away: string; homeId: string; awayId: string;
  status: "scheduled" | "completed"; homeRuns: number | null; homeWickets: number | null;
  awayRuns: number | null; awayWickets: number | null; result: string | null;
};

function dateLabel(value: string) {
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime()) ? "Date to be confirmed" : date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

function fromLive(match: TournamentMatch): MatchCentreItem {
  const fallback = seasonFiveFixtures.find((item) => item.match_number === match.match_number);
  return {
    number: match.match_number,
    date: dateLabel(match.match_date || fallback?.date || ""),
    time: match.match_time || fallback?.time || "Time to be confirmed",
    home: match.home_team || (fallback ? teamNameForSlot(fallback.home_slot, announcedTeams) : "Home team"),
    away: match.away_team || (fallback ? teamNameForSlot(fallback.away_slot, announcedTeams) : "Away team"),
    homeId: match.home_team_id || (fallback ? fixtureTeamOrder[fallback.home_slot - 1] : ""),
    awayId: match.away_team_id || (fallback ? fixtureTeamOrder[fallback.away_slot - 1] : ""),
    status: match.status,
    homeRuns: match.home_runs, homeWickets: match.home_wickets, awayRuns: match.away_runs, awayWickets: match.away_wickets,
    result: match.result_text,
  };
}

function fromPublished(number: number): MatchCentreItem | null {
  const fixture = seasonFiveFixtures.find((match) => match.match_number === number);
  if (!fixture) return null;
  return {
    number: fixture.match_number, date: dateLabel(fixture.date), time: fixture.time,
    home: teamNameForSlot(fixture.home_slot, announcedTeams), away: teamNameForSlot(fixture.away_slot, announcedTeams),
    homeId: fixtureTeamOrder[fixture.home_slot - 1], awayId: fixtureTeamOrder[fixture.away_slot - 1],
    status: "scheduled", homeRuns: null, homeWickets: null, awayRuns: null, awayWickets: null, result: null,
  };
}

export default function MatchCentrePage() {
  const [snapshot, setSnapshot] = useState<TournamentSnapshot>({ matches: [], standings: [], player_stats: [] });
  useEffect(() => {
    let active = true;
    const refresh = async () => { try { const next = await getTournamentSnapshot(); if (active) setSnapshot(next); } catch { /* Published fixtures still render below. */ } };
    void refresh();
    const timer = window.setInterval(refresh, 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const matches = useMemo(() => {
    const recorded = snapshot.matches.map(fromLive);
    const byNumber = new Map(recorded.map((match) => [match.number, match]));
    return seasonFiveFixtures.map((fixture) => byNumber.get(fixture.match_number) ?? fromPublished(fixture.match_number)!).sort((a, b) => a.number - b.number);
  }, [snapshot.matches]);
  const focus = matches.find((match) => match.status === "scheduled") ?? matches.filter((match) => match.status === "completed").at(-1) ?? matches[0];
  const completed = matches.filter((match) => match.status === "completed").reverse();
  const upcoming = matches.filter((match) => match.status === "scheduled");
  const teamImage = (id: string) => image(announcedTeams.find((team) => team.id === id)?.logo_url);
  const matchLink = (number: number) => link(`match.html?match=${number}`);

  return <main className="match-centre-page">
    <SiteHeader active="match-center" />
    <section className="mc-hero">
      <div className="mc-hero-heading"><span>Season 5 · Match Centre</span><h1>Follow every<br/>turning point.</h1><p>Match previews, squads, player analysis, and scorecards in one place.</p></div>
      {focus && <a className={`mc-feature${focus.status === "completed" ? " is-result" : ""}`} href={matchLink(focus.number)}>
        <div className="mc-feature-top"><span>{focus.status === "completed" ? "Latest result" : "Next match"}</span><b>Match {String(focus.number).padStart(2, "0")}</b></div>
        <p className="mc-feature-date">{focus.date} · {focus.time}</p>
        <div className="mc-feature-teams"><div>{teamImage(focus.homeId) && <img src={teamImage(focus.homeId)} alt=""/>}<strong>{focus.home}</strong></div><i>VS</i><div>{teamImage(focus.awayId) && <img src={teamImage(focus.awayId)} alt=""/>}<strong>{focus.away}</strong></div></div>
        {focus.status === "completed" ? <div className="mc-feature-score"><b>{focus.homeRuns ?? "—"}/{focus.homeWickets ?? "—"}</b><span>·</span><b>{focus.awayRuns ?? "—"}/{focus.awayWickets ?? "—"}</b><small>{focus.result ?? "Final score"}</small></div> : <p className="mc-feature-prompt">Preview squads, players, and the key matchup.</p>}
        <span className="mc-feature-link">Open match details <b>↗</b></span>
      </a>}
    </section>
    <section className="mc-content">
      <div className="mc-content-heading"><div><span>Season at a glance</span><h2>Matchday tracker</h2></div><a href={link("fixtures.html")}>Full schedule ↗</a></div>
      <div className="mc-overview-strip"><div><b>{completed.length}</b><span>Completed</span></div><div><b>{upcoming.length}</b><span>Scheduled</span></div><div><b>{matches.length}</b><span>League matches</span></div><a href={link("stats.html")}>Tournament stats <b>↗</b></a></div>
      <div className="mc-lists">
        <section className="mc-list-section"><header><div><span>Scorecards</span><h3>Recent results</h3></div>{completed.length > 0 && <b>{completed.length} played</b>}</header>
          {completed.length ? <div className="mc-match-list">{completed.slice(0, 5).map((match) => <a href={matchLink(match.number)} key={match.number}><span className="mc-match-number">{String(match.number).padStart(2, "0")}</span><span className="mc-list-matchup"><strong>{match.home}</strong><i>vs</i><strong>{match.away}</strong><small>{match.date} · {match.time}</small></span><span className="mc-list-score"><b>{match.homeRuns ?? "—"}/{match.homeWickets ?? "—"}</b><b>{match.awayRuns ?? "—"}/{match.awayWickets ?? "—"}</b><small>{match.result ?? "Match details"}</small></span><span className="mc-list-arrow">↗</span></a>)}</div> : <div className="mc-empty"><strong>Scorecards will appear here after each match.</strong><p>Until the first result is recorded, open a match preview to see squads and the player analysis.</p>{focus && <a href={matchLink(focus.number)}>Preview the next match ↗</a>}</div>}
        </section>
        <section className="mc-list-section mc-upcoming-section"><header><div><span>Coming up</span><h3>Next on the schedule</h3></div><b>{upcoming.length} to play</b></header>
          {upcoming.slice(0, 4).map((match) => <a className="mc-upcoming-row" href={matchLink(match.number)} key={match.number}><span className="mc-upcoming-date">{match.date}<small>{match.time}</small></span><span className="mc-upcoming-teams">{match.home}<i>vs</i>{match.away}</span><b>Match {String(match.number).padStart(2, "0")} ↗</b></a>)}
          <a className="mc-schedule-link" href={link("fixtures.html")}>Browse and filter the full schedule ↗</a>
        </section>
      </div>
    </section>
    <section className="mc-bottom-cta"><div><span>PHF Premier League · Season 5</span><h2>Have a read on the game?</h2><p>Make your Fan Picks, then compare your calls with the scorecard.</p></div><a href={link("fan.html")}>Make Fan Picks <b>↗</b></a></section>
  </main>;
}
