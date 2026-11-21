"use client";

import { useEffect, useMemo, useState } from "react";
import SiteHeader from "./site-header";
import { getTournamentSnapshot, type TournamentMatch, type TournamentSnapshot } from "./auction-client";
import { announcedTeams } from "./season5-teams";
import { fixtureTeamOrder, seasonFiveFixtures, teamNameForSlot } from "./season5-fixtures";

const basePath = () => typeof window !== "undefined" && window.location.pathname.startsWith("/phf-ppl/") ? "/phf-ppl/" : "/";
const link = (path: string) => `${basePath()}${path}`;
const image = (path: string | null | undefined) => path ? `${basePath()}${path.replace(/^\//, "")}` : "";

function youtubeEmbedUrl(streamUrl: string | null | undefined) {
  if (!streamUrl) return null;
  try {
    const url = new URL(streamUrl);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    const parts = url.pathname.split("/").filter(Boolean);
    if (host === "youtu.be") return parts[0] ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(parts[0])}` : null;
    if (host !== "youtube.com" && host !== "m.youtube.com" && host !== "youtube-nocookie.com") return null;
    const id = url.searchParams.get("v") ?? url.pathname.match(/^\/(?:live|embed|shorts)\/([^/?]+)/)?.[1];
    return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
  } catch { return null; }
}

type MatchCentreItem = {
  number: number; date: string; time: string; home: string; away: string; homeId: string; awayId: string;
  status: "scheduled" | "completed"; homeRuns: number | null; homeWickets: number | null;
  awayRuns: number | null; awayWickets: number | null; result: string | null; streamUrl: string | null;
  cricheroesUrl: string | null; cricheroesStatus: string | null; liveScore: TournamentMatch["cricheroes_live_score"];
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
    result: match.result_text, streamUrl: match.stream_url ?? match.cricheroes_stream_url ?? null,
    cricheroesUrl: match.cricheroes_match_url ?? null, cricheroesStatus: match.cricheroes_status ?? null, liveScore: match.cricheroes_live_score ?? null,
  };
}

function fromPublished(number: number): MatchCentreItem | null {
  const fixture = seasonFiveFixtures.find((match) => match.match_number === number);
  if (!fixture) return null;
  return {
    number: fixture.match_number, date: dateLabel(fixture.date), time: fixture.time,
    home: teamNameForSlot(fixture.home_slot, announcedTeams), away: teamNameForSlot(fixture.away_slot, announcedTeams),
    homeId: fixtureTeamOrder[fixture.home_slot - 1], awayId: fixtureTeamOrder[fixture.away_slot - 1],
    status: "scheduled", homeRuns: null, homeWickets: null, awayRuns: null, awayWickets: null, result: null, streamUrl: null, cricheroesUrl: null, cricheroesStatus: null, liveScore: null,
  };
}

export default function MatchCentrePage() {
  const [snapshot, setSnapshot] = useState<TournamentSnapshot>({ matches: [], standings: [], player_stats: [] });
  const [watching, setWatching] = useState(false);
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
  const completed = matches.filter((match) => match.status === "completed" || match.cricheroesStatus === "completed").reverse();
  const upcoming = matches.filter((match) => match.status === "scheduled" && match.cricheroesStatus !== "completed");
  const focus = matches.find((match) => match.cricheroesStatus === "live") ?? upcoming[0] ?? completed[0] ?? matches[0];
  const teamImage = (id: string) => image(announcedTeams.find((team) => team.id === id)?.logo_url);
  const matchLink = (number: number) => link(`match.html?match=${number}`);
  const focusEmbedUrl = youtubeEmbedUrl(focus?.streamUrl);
  const showLivePlayer = focus?.cricheroesStatus === "live" && Boolean(focusEmbedUrl);
  useEffect(() => { setWatching(false); }, [focus?.number, focus?.streamUrl]);

  return <main className="match-centre-page">
    <SiteHeader active="match-center" />
    <section className="mc-hero">
      <div className="mc-hero-heading"><span>Season 5 · Match Centre</span><h1>Follow every<br/>turning point.</h1><p>Match previews, squads, player analysis, and scorecards in one place.</p></div>
      {focus && <a className={`mc-feature${focus.status === "completed" ? " is-result" : ""}`} href={matchLink(focus.number)}>
        <div className="mc-feature-top"><span>{focus.cricheroesStatus === "live" ? "Live now" : focus.status === "completed" || focus.cricheroesStatus === "completed" ? "Latest result" : "Next match"}</span><b>Match {String(focus.number).padStart(2, "0")}</b></div>
        <p className="mc-feature-date">{focus.date} · {focus.time}</p>
        <div className="mc-feature-teams"><div>{teamImage(focus.homeId) && <img src={teamImage(focus.homeId)} alt=""/>}<strong>{focus.home}</strong></div><i>VS</i><div>{teamImage(focus.awayId) && <img src={teamImage(focus.awayId)} alt=""/>}<strong>{focus.away}</strong></div></div>
        {focus.status === "completed" || focus.cricheroesStatus === "completed" ? <div className="mc-feature-score">{focus.cricheroesStatus === "completed" ? <><b>{focus.liveScore?.team_a_summary || "Final"}</b><span>·</span><b>{focus.liveScore?.team_b_summary || "Final"}</b><small>{focus.liveScore?.match_summary?.short_summary || focus.result || "Final score"}</small></> : <><b>{focus.homeRuns ?? "—"}/{focus.homeWickets ?? "—"}</b><span>·</span><b>{focus.awayRuns ?? "—"}/{focus.awayWickets ?? "—"}</b><small>{focus.result ?? "Final score"}</small></>}</div> : focus.cricheroesStatus === "live" ? <div className="mc-feature-score mc-live-score"><b>LIVE</b><span>{focus.liveScore?.team_a || focus.home}: {focus.liveScore?.team_a_summary || "Score updating"}</span><span>{focus.liveScore?.team_b || focus.away}: {focus.liveScore?.team_b_summary || ""}</span><small>{focus.liveScore?.match_summary?.short_summary || "Live on CricHeroes"}</small></div> : <p className="mc-feature-prompt">Preview squads, players, and the key matchup.</p>}
        <span className="mc-feature-link">Open match details <b>↗</b></span>
      </a>}
    </section>
    {focus && <section className="mc-watch-section" aria-label="Match video player">
      <div className="mc-watch-card">
        <div className="mc-watch-atmosphere" aria-hidden="true" />
        <div className="mc-watch-topline"><span><i className={focus.streamUrl ? "is-live" : ""}/>{focus.streamUrl ? "Broadcast available" : "PHF Premier League · Season 5"}</span><b>{focus.streamUrl ? "YouTube" : "Matchday broadcast"}</b></div>
        {(watching || showLivePlayer) && focusEmbedUrl ? <div className="mc-watch-iframe-wrap"><iframe src={`${focusEmbedUrl}?autoplay=${showLivePlayer ? "1&mute=1" : "1"}&rel=0`} title={`${focus.home} vs ${focus.away} · PHF Premier League Season 5`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div> : <>
          <div className="mc-watch-content">
            <div className="mc-watch-match">
              <span className="mc-watch-kicker">{focus.cricheroesStatus === "live" ? "LIVE NOW" : focusEmbedUrl ? "Watch the match" : "The next match, up close"} · Match {String(focus.number).padStart(2, "0")}</span>
              <div className="mc-watch-teams">
                <div>{teamImage(focus.homeId) && <img src={teamImage(focus.homeId)} alt=""/>}<strong>{focus.home}</strong></div>
                <span>VS</span>
                <div>{teamImage(focus.awayId) && <img src={teamImage(focus.awayId)} alt=""/>}<strong>{focus.away}</strong></div>
              </div>
              <p>{focus.date} <i>·</i> {focus.time}</p>
              {focus.cricheroesStatus === "live" && <p className="mc-live-score-inline"><strong>{focus.liveScore?.team_a || focus.home}: {focus.liveScore?.team_a_summary || "Score updating"}</strong><strong>{focus.liveScore?.team_b || focus.away}: {focus.liveScore?.team_b_summary || ""}</strong>{focus.liveScore?.match_summary?.short_summary && <small>{focus.liveScore.match_summary.short_summary}</small>}</p>}
            </div>
            <button className="mc-watch-play" type="button" disabled={!focusEmbedUrl} onClick={() => setWatching(true)} aria-label={focusEmbedUrl ? `Play ${focus.home} versus ${focus.away} stream` : "The match stream will be available here soon"}><span>▶</span></button>
            <div className="mc-watch-caption"><strong>{focusEmbedUrl ? "Play match stream" : focus.cricheroesStatus === "live" ? "Match is live" : "Stream coming soon"}</strong><span>{focusEmbedUrl ? "Official broadcast · plays here" : focus.cricheroesStatus === "live" ? "Live score updates automatically from CricHeroes." : "The YouTube broadcast will play here when its stream link is published."}</span>{focus.cricheroesUrl && <a href={focus.cricheroesUrl} target="_blank" rel="noreferrer">Open CricHeroes scorecard ↗</a>}</div>
          </div>
          <div className="mc-watch-controls" aria-hidden="true"><span className="mc-watch-control-play">▶</span><span className="mc-watch-progress"><i/></span><span>PHF PREMIER LEAGUE</span><span>Season 5</span><b>⛶</b></div>
        </>}
      </div>
    </section>}
    <section className="mc-content">
      <div className="mc-content-heading"><div><span>Season at a glance</span><h2>Matchday tracker</h2></div><a href={link("fixtures.html")}>Full schedule ↗</a></div>
      <div className="mc-overview-strip"><div><b>{completed.length}</b><span>Completed</span></div><div><b>{upcoming.length}</b><span>Scheduled</span></div><div><b>{matches.length}</b><span>League matches</span></div><a href={link("stats.html")}>Tournament stats <b>↗</b></a></div>
      <div className="mc-lists">
        <section className="mc-list-section"><header><div><span>Scorecards</span><h3>Recent results</h3></div>{completed.length > 0 && <b>{completed.length} played</b>}</header>
          {completed.length ? <div className="mc-match-list">{completed.slice(0, 5).map((match) => <a href={matchLink(match.number)} key={match.number}><span className="mc-match-number">{String(match.number).padStart(2, "0")}</span><span className="mc-list-matchup"><strong>{match.home}</strong><i>vs</i><strong>{match.away}</strong><small>{match.date} · {match.time}</small></span><span className="mc-list-score"><b>{match.cricheroesStatus === "completed" ? match.liveScore?.team_a_summary || "Final" : `${match.homeRuns ?? "—"}/${match.homeWickets ?? "—"}`}</b><b>{match.cricheroesStatus === "completed" ? match.liveScore?.team_b_summary || "Final" : `${match.awayRuns ?? "—"}/${match.awayWickets ?? "—"}`}</b><small>{match.liveScore?.match_summary?.short_summary || match.result || "Match details"}</small></span><span className="mc-list-arrow">↗</span></a>)}</div> : <div className="mc-empty"><strong>Scorecards will appear here after each match.</strong><p>Until the first result is recorded, open a match preview to see squads and the player analysis.</p>{focus && <a href={matchLink(focus.number)}>Preview the next match ↗</a>}</div>}
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
