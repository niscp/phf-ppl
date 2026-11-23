"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import playersJson from "./season5-players.json";
import replacementProfilesJson from "./season5-replacement-profiles.json";
import { getAuctionSnapshot, getTournamentSnapshot, preAuctionSnapshot, type AuctionSnapshot, type AuctionTeam, type TournamentSnapshot } from "./auction-client";
import { announcedTeams } from "./season5-teams";
import SiteHeader from "./site-header";
import { seasonFiveFixtures, teamNameForSlot } from "./season5-fixtures";
import { FanMatchActivity } from "./fan-activity";
import LiveScoreboard from "./live-scoreboard";

type DirectoryPlayer = {
  id: string;
  name: string;
  role: string;
  photo: string | null;
  statsSource?: string;
  cricheroesUrl?: string;
  statsChecked?: string;
  stats?: {
    batting?: { runs?: number | string | null; average?: number | string | null; strikeRate?: number | string | null };
    bowling?: { wickets?: number | string | null; economy?: number | string | null };
  } | null;
};

const directory = [...playersJson, ...replacementProfilesJson] as DirectoryPlayer[];
const emptyTournament: TournamentSnapshot = { matches: [], standings: [], player_stats: [] };
const finalsFixtures = [
  { match_number: 16, date: "2026-12-06", reportTime: "9:15 AM", time: "9:30 AM", home_slot: 0, away_slot: 0 },
  { match_number: 17, date: "2026-12-06", reportTime: "12:45 PM", time: "1:00 PM", home_slot: 0, away_slot: 0 },
] as const;

function localLink(path: string) {
  return typeof window !== "undefined" && window.location.pathname.startsWith("/phf-ppl/") ? `/phf-ppl/${path}` : `/${path}`;
}

function asset(path: string | null | undefined) {
  if (!path) return "";
  const base = typeof window !== "undefined" && window.location.pathname.startsWith("/phf-ppl/") ? "/phf-ppl" : "";
  return `${base}${path}`;
}

function numeric(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function displayDate(isoDate: string) {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function logo(team: AuctionTeam) {
  return team.logo_url?.startsWith("/") ? asset(team.logo_url) : team.logo_url ?? "";
}

function teamColor(name: string) {
  const key = name.toLowerCase();
  if (key.includes("avengers")) return "#e9c52c";
  if (key.includes("prestige super giants")) return "#74364f";
  if (key.includes("super kings")) return "#285ba8";
  if (key.includes("high flyers")) return "#8c969b";
  if (key.includes("amigos")) return "#214a9a";
  if (key.includes("blasterz")) return "#d7a352";
  return "#d5b048";
}

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("");
}

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
  } catch {
    return null;
  }
}

function getTeamStatSummary(team: AuctionTeam, auction: AuctionSnapshot, tournament: TournamentSnapshot) {
  const squad = auction.players.filter((player) => player.team_id === team.id && (player.status === "sold" || player.status === "captain"));
  const seasonStatsExist = squad.some((player) => tournament.player_stats.some((stat) => stat.player_id === player.id && stat.matches > 0));
  const statsScope = seasonStatsExist ? "Season 5" : "verified career";
  const metrics = squad.map((player) => {
    const profile = directory.find((item) => item.id === player.id);
    const season = tournament.player_stats.find((item) => item.player_id === player.id);
    const careerRuns = profile?.statsSource ? numeric(profile.stats?.batting?.runs) : null;
    const careerAverage = profile?.statsSource ? numeric(profile.stats?.batting?.average) : null;
    const careerStrikeRate = profile?.statsSource ? numeric(profile.stats?.batting?.strikeRate) : null;
    const careerWickets = profile?.statsSource ? numeric(profile.stats?.bowling?.wickets) : null;
    const careerEconomy = profile?.statsSource ? numeric(profile.stats?.bowling?.economy) : null;
    const hasSeasonRecord = Boolean(season?.matches);
    return {
      player,
      profile,
      hasSeasonRecord,
      seasonMatches: season?.matches ?? 0,
      careerRuns,
      careerAverage,
      careerStrikeRate,
      careerWickets,
      careerEconomy,
      runs: seasonStatsExist ? (season?.matches ? season.runs : null) : (profile?.statsSource ? numeric(profile.stats?.batting?.runs) : null),
      strikeRate: seasonStatsExist ? (season?.matches && season.balls ? (100 * season.runs / season.balls) : null) : (profile?.statsSource ? numeric(profile.stats?.batting?.strikeRate) : null),
      wickets: seasonStatsExist ? (season?.matches ? season.wickets : null) : (profile?.statsSource ? numeric(profile.stats?.bowling?.wickets) : null),
      economy: seasonStatsExist ? (season?.matches && season.overs ? season.runs_conceded / season.overs : null) : (profile?.statsSource ? numeric(profile.stats?.bowling?.economy) : null),
    };
  });
  const topScorer = [...metrics].filter((row) => row.runs !== null).sort((a, b) => (b.runs ?? 0) - (a.runs ?? 0))[0];
  const topBowler = [...metrics].filter((row) => row.wickets !== null).sort((a, b) => (b.wickets ?? 0) - (a.wickets ?? 0))[0];
  const averageStrikeRate = metrics.map((row) => row.strikeRate).filter((value): value is number => value !== null);
  return { squad, statsScope, topScorer, topBowler, averageStrikeRate, metrics };
}

function PreMatchRead({ home, away, auction, tournament }: { home: AuctionTeam; away: AuctionTeam; auction: AuctionSnapshot; tournament: TournamentSnapshot }) {
  const homeStats = getTeamStatSummary(home, auction, tournament);
  const awayStats = getTeamStatSummary(away, auction, tournament);
  const homeBat = homeStats.topScorer;
  const awayBat = awayStats.topScorer;
  const homeBowl = homeStats.topBowler;
  const awayBowl = awayStats.topBowler;
  const battingRead = homeBat && awayBat
    ? `${home.name}’s leading recorded scorer is ${homeBat.player.name} (${homeBat.runs} ${homeStats.statsScope.toLowerCase()} runs); ${away.name}’s is ${awayBat.player.name} (${awayBat.runs} ${awayStats.statsScope.toLowerCase()} runs).`
    : "Comparable batting totals are not available for both squads yet.";
  const bowlingRead = homeBowl && awayBowl
    ? `${home.name}’s leading wicket record belongs to ${homeBowl.player.name} (${homeBowl.wickets}); ${away.name}’s belongs to ${awayBowl.player.name} (${awayBowl.wickets}).`
    : "Comparable bowling wicket records are not available for both squads yet.";
  const roleCount = (team: AuctionTeam, role: string) => getTeamStatSummary(team, auction, tournament).squad.filter((player) => player.role.toLowerCase() === role.toLowerCase()).length;
  return <article className="match-generated-read">
    <div><span>Stats-based preview</span><h3>Pre-match read</h3></div>
    <p>{battingRead}</p>
    <p>{bowlingRead}</p>
    <p>Listed squad mix: {home.name} have {roleCount(home, "Batter")} batters, {roleCount(home, "All-rounder")} all-rounders and {roleCount(home, "Bowler")} bowlers; {away.name} have {roleCount(away, "Batter")} batters, {roleCount(away, "All-rounder")} all-rounders and {roleCount(away, "Bowler")} bowlers.</p>
    <small>These are descriptive records, not a result prediction. Career numbers are used only where a linked stats profile is available.</small>
  </article>;
}

function TeamAnalysis({ team, auction, tournament }: { team: AuctionTeam; auction: AuctionSnapshot; tournament: TournamentSnapshot }) {
  const { squad, statsScope, topScorer, topBowler, averageStrikeRate } = getTeamStatSummary(team, auction, tournament);
  return <article className="match-team-analysis">
    <div className="match-team-analysis-head">
      {logo(team) ? <img src={logo(team)} alt="" /> : <b>{initials(team.name)}</b>}
      <div><span>{squad.length} players listed</span><h3>{team.name}</h3></div>
    </div>
    <div className="match-team-metrics">
      <div><span>Batting leader · {statsScope}</span><strong>{topScorer?.player.name ?? "No recorded figure"}</strong><b>{topScorer?.runs !== null && topScorer?.runs !== undefined ? `${topScorer.runs} runs` : "Stats unavailable"}</b></div>
      <div><span>Bowling leader · {statsScope}</span><strong>{topBowler?.player.name ?? "No recorded figure"}</strong><b>{topBowler?.wickets !== null && topBowler?.wickets !== undefined ? `${topBowler.wickets} wickets` : "Stats unavailable"}</b></div>
      <div><span>Squad batting snapshot</span><strong>{averageStrikeRate.length ? `${(averageStrikeRate.reduce((sum, value) => sum + value, 0) / averageStrikeRate.length).toFixed(1)} SR` : "Not enough data"}</strong><b>{averageStrikeRate.length ? `Across ${averageStrikeRate.length} tracked players` : "No verified batting rates"}</b></div>
    </div>
  </article>;
}

function PlayerByPlayerScouting({ team, auction, tournament }: { team: AuctionTeam; auction: AuctionSnapshot; tournament: TournamentSnapshot }) {
  const stats = getTeamStatSummary(team, auction, tournament);
  const careerBatting = stats.metrics.filter((row) => row.careerRuns !== null).sort((a, b) => (b.careerRuns ?? 0) - (a.careerRuns ?? 0));
  const careerBowling = stats.metrics.filter((row) => row.careerWickets !== null).sort((a, b) => (b.careerWickets ?? 0) - (a.careerWickets ?? 0));
  const number = (value: number | null, digits = 0) => value === null ? "—" : value.toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: digits });
  const recordFor = (row: typeof stats.metrics[number]) => {
    if (row.hasSeasonRecord) return {
      scope: "Season 5",
      runs: row.runs,
      average: null,
      strikeRate: row.strikeRate,
      wickets: row.wickets,
      economy: row.economy,
      note: `${row.seasonMatches} ${row.seasonMatches === 1 ? "appearance" : "appearances"} recorded.`,
    };
    const battingRank = row.careerRuns === null ? null : careerBatting.findIndex((item) => item.player.id === row.player.id) + 1;
    const bowlingRank = row.careerWickets === null ? null : careerBowling.findIndex((item) => item.player.id === row.player.id) + 1;
    const ranks = [battingRank ? `Squad batting rank ${battingRank}/${careerBatting.length}` : null, bowlingRank ? `Squad bowling rank ${bowlingRank}/${careerBowling.length}` : null].filter(Boolean);
    return {
      scope: "Career",
      runs: row.careerRuns,
      average: row.careerAverage,
      strikeRate: row.careerStrikeRate,
      wickets: row.careerWickets,
      economy: row.careerEconomy,
      note: ranks.length ? ranks.join(" · ") : row.profile?.statsSource ? "Profile linked · no comparable totals" : "No verified figures yet",
    };
  };
  const ordered = [...stats.metrics].sort((a, b) => {
    const aRecord = recordFor(a), bRecord = recordFor(b);
    const aHasFigures = aRecord.runs !== null || aRecord.wickets !== null;
    const bHasFigures = bRecord.runs !== null || bRecord.wickets !== null;
    return Number(bHasFigures) - Number(aHasFigures) || (bRecord.runs ?? -1) - (aRecord.runs ?? -1);
  });
  const tracked = ordered.filter((row) => { const record = recordFor(row); return record.runs !== null || record.wickets !== null; }).length;
  return <section className="match-player-scouting" aria-label={`${team.name} player dashboard`} style={{ "--team-color": teamColor(team.name) } as CSSProperties}>
    <header className="scout-board-heading"><div><span>Full squad board</span><h3>{team.name}</h3></div><b>{tracked}/{stats.squad.length} with records</b></header>
    <p className="scout-board-note">All listed players, ranked by recorded batting contribution where figures are available. A dash means no verified figure is connected yet.</p>
    <div className="scout-player-grid">{ordered.map((row, index) => {
      const record = recordFor(row);
      const profileLink = row.profile?.statsSource ?? row.profile?.cricheroesUrl;
      return <article className="scout-player-card" key={row.player.id}>
        <header><span className="scout-player-rank">{String(index + 1).padStart(2, "0")}</span>{row.player.photo ? <img src={asset(row.player.photo)} alt="" loading="lazy"/> : <b className="scout-player-initials">{initials(row.player.name)}</b>}<div><strong>{row.player.name}{row.player.status === "captain" ? <i>C</i> : null}</strong><small>{row.player.role || "Role not listed"}</small></div></header>
        <div className="scout-player-stats"><div><span>BAT</span><b>{number(record.runs)}</b><small>runs · SR {number(record.strikeRate, 1)}</small></div><div><span>BOWL</span><b>{number(record.wickets)}</b><small>wickets · econ {number(record.economy, 1)}</small></div></div>
        <footer><span>{record.scope}</span><small>{record.note}</small>{profileLink && <a href={profileLink} target="_blank" rel="noopener noreferrer">Full profile ↗</a>}</footer>
      </article>;
    })}</div>
  </section>;
}

function MatchTacticalPreview({ home, away, auction, tournament }: { home: AuctionTeam; away: AuctionTeam; auction: AuctionSnapshot; tournament: TournamentSnapshot }) {
  const homeStats = getTeamStatSummary(home, auction, tournament);
  const awayStats = getTeamStatSummary(away, auction, tournament);
  const roleCount = (stats: ReturnType<typeof getTeamStatSummary>, role: string) => stats.squad.filter((player) => player.role.toLowerCase() === role.toLowerCase()).length;
  const captainName = (stats: ReturnType<typeof getTeamStatSummary>) => stats.squad.find((player) => player.status === "captain")?.name ?? "the captain";
  const allRounders = (stats: ReturnType<typeof getTeamStatSummary>) => roleCount(stats, "All-rounder");
  const scope = homeStats.statsScope === awayStats.statsScope ? homeStats.statsScope : "available recorded";
  const teamBrief = (team: AuctionTeam, own: ReturnType<typeof getTeamStatSummary>, opponent: ReturnType<typeof getTeamStatSummary>, awaySide = false) => {
    const opponentBowler = opponent.topBowler;
    const ownBatter = own.topScorer;
    const ownBowler = own.topBowler;
    const ownBatDepth = roleCount(own, "Batter");
    const ownAllRounders = allRounders(own);
    return <article className={`match-two-team-card${awaySide ? " away" : ""}`} key={team.id} style={{ "--team-color": teamColor(team.name) } as CSSProperties}>
      <header>{logo(team) ? <img src={logo(team)} alt="" /> : <b>{initials(team.name)}</b>}<div><span>Team plan · {own.squad.length} players listed</span><h3>{team.name}</h3></div></header>
      <div className="match-two-plan"><span>Batting approach</span><p>{ownBatDepth ? `Use the ${ownBatDepth} listed batter${ownBatDepth === 1 ? "" : "s"} to set the innings structure, then keep the ${ownAllRounders} all-rounder${ownAllRounders === 1 ? "" : "s"} flexible for the middle and closing overs.` : `Build the innings around the confirmed XI and preserve batting options through the middle overs.`} {ownBatter ? `${ownBatter.player.name} leads the available ${own.statsScope.toLowerCase()} record with ${ownBatter.runs} runs; use that record to inform the order, then let match-day conditions and form guide the role.` : "No verified batting leader is available yet, so the final XI and recent form should drive the order."}</p></div>
      <div className="match-two-plan"><span>Bowling approach</span><p>{ownBowler ? `Consider using ${ownBowler.player.name}, the squad’s leading recorded wicket taker (${ownBowler.wickets} ${own.statsScope.toLowerCase()} wickets), in a spell where a breakthrough matters. Keep the remaining bowling workload spread across the available options.` : "Choose the bowling order after the XI and conditions are known; no comparable wicket record is available for this squad yet."} With {ownAllRounders} all-rounder{ownAllRounders === 1 ? "" : "s"} listed, the captain has potential flexibility if the selected players bowl.</p></div>
      <div className="match-two-plan watch"><span>What to watch</span><p>{opponentBowler ? `Watch how ${team.name}’s top recorded batter ${ownBatter?.player.name ?? "the top order"} handles ${opponentBowler.player.name} (${opponentBowler.wickets} ${opponent.statsScope.toLowerCase()} wickets).` : `Watch how ${team.name}’s confirmed batting group handles the opponent’s opening bowlers; verified wicket records are not available yet.`} Track whether partnerships form, how the side manages dot-ball pressure, and whether the captain, ${captainName(own)}, adjusts the plan as the innings develops.</p></div>
      <div className="match-two-leader"><span>Key records · {own.statsScope}</span><strong>{ownBatter ? `${ownBatter.player.name} · ${ownBatter.runs} runs` : "Batting figure unavailable"}</strong><small>{ownBowler ? `${ownBowler.player.name} · ${ownBowler.wickets} wickets` : "Bowling figure unavailable"}</small></div>
    </article>;
  };
  const listedPlayerCount = homeStats.squad.length + awayStats.squad.length;

  return <section className="match-two-brief" aria-labelledby="match-preview-analysis-title">
    <div className="match-two-brief-heading"><div><span>Matchday scouting · {scope} records</span><h2 id="match-preview-analysis-title">Matchup<br/><em>dashboard.</em></h2></div><p>Full-squad scouting, practical plans for both teams, and the moments to watch. Records describe past performance; they are not head-to-head data, confirmed roles, or a prediction.</p></div>
    <div className="match-two-teams">{teamBrief(home, homeStats, awayStats)}{teamBrief(away, awayStats, homeStats, true)}</div>
    <div className="match-two-watchline"><span>Match watch</span><p>Look for the first partnership that settles the innings, the first spell that changes its pace, and how each captain responds. Compare each player’s recorded runs, strike rate, wickets, and economy below where available. The final XI, pitch conditions, and match-day form will shape how these plans apply.</p></div>
    <small className="match-two-caveat">Player records use linked CricHeroes career profiles or Season 5 scorecards, as labeled. They do not show direct batter-versus-bowler history. No pitch report or confirmed playing XI is available.</small>
    <div className="match-two-full-scouting"><div><span>Complete squad analysis</span><h3>Every player.<br/><em>Every verified record.</em></h3></div><p>All {listedPlayerCount} players currently listed for this fixture, with batting and bowling figures, roles, and squad ranking where the data is available.</p></div>
    <div className="match-two-player-grids"><PlayerByPlayerScouting team={home} auction={auction} tournament={tournament} /><PlayerByPlayerScouting team={away} auction={auction} tournament={tournament} /></div>
  </section>;
}

export default function MatchDetailsPage() {
  const [auction, setAuction] = useState<AuctionSnapshot>(preAuctionSnapshot);
  const [tournament, setTournament] = useState<TournamentSnapshot>(emptyTournament);
  const [loading, setLoading] = useState(true);
  const [loadIssue, setLoadIssue] = useState("");
  const matchNumber = typeof window === "undefined" ? 0 : Number(new URLSearchParams(window.location.search).get("match"));
  const fixture = seasonFiveFixtures.find((item) => item.match_number === matchNumber) ?? finalsFixtures.find((item) => item.match_number === matchNumber);

  useEffect(() => {
    let active = true;
    Promise.allSettled([getAuctionSnapshot(), getTournamentSnapshot()]).then(([auctionResult, tournamentResult]) => {
      if (!active) return;
      if (auctionResult.status === "fulfilled") setAuction(auctionResult.value);
      if (tournamentResult.status === "fulfilled") setTournament(tournamentResult.value);
      if (auctionResult.status === "rejected" && tournamentResult.status === "rejected") setLoadIssue("Live squad and match records could not be reached. Showing the published fixture details where available.");
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const teams = useMemo(() => auction.teams.length ? auction.teams : announcedTeams, [auction.teams]);
  const homeTeam = fixture && fixture.home_slot > 0 ? teams.find((team) => team.name === teamNameForSlot(fixture.home_slot, teams)) : undefined;
  const awayTeam = fixture && fixture.away_slot > 0 ? teams.find((team) => team.name === teamNameForSlot(fixture.away_slot, teams)) : undefined;
  const liveMatch = tournament.matches.find((match) => match.match_number === matchNumber);
  const cricStatus = String(liveMatch?.cricheroes_status ?? "").toLowerCase();
  const cricCompleted = ["past", "complete", "completed", "finished", "result"].includes(cricStatus);
  const matchCompleted = cricCompleted || liveMatch?.status === "completed";
  const homeName = liveMatch?.home_team ?? (matchNumber === 16 ? "3rd place" : matchNumber === 17 ? "1st place" : fixture ? teamNameForSlot(fixture.home_slot, teams) : "Home team");
  const awayName = liveMatch?.away_team ?? (matchNumber === 16 ? "4th place" : matchNumber === 17 ? "2nd place" : fixture ? teamNameForSlot(fixture.away_slot, teams) : "Away team");
  const resolvedHome = teams.find((team) => team.name === homeName) ?? homeTeam;
  const resolvedAway = teams.find((team) => team.name === awayName) ?? awayTeam;
  const homeSquadStats = resolvedHome ? <TeamAnalysis team={resolvedHome} auction={auction} tournament={tournament} /> : null;
  const awaySquadStats = resolvedAway ? <TeamAnalysis team={resolvedAway} auction={auction} tournament={tournament} /> : null;

  if (!fixture) return <main className="match-page"><SiteHeader active="match-center" /><section className="match-not-found"><span>Season 5 schedule</span><h1>Match not found</h1><p>Choose a match from the published schedule to see its details.</p><a href={localLink("fixtures.html")}>Back to schedule</a></section></main>;

  const analysisSources = tournament.player_stats.some((stat) => stat.matches > 0) ? "Season 5 scorecards" : "verified CricHeroes career profiles";
  const hasComparables = Boolean(resolvedHome && resolvedAway && auction.players.some((player) => player.team_id === resolvedHome.id) && auction.players.some((player) => player.team_id === resolvedAway.id));
  const availableStreamUrl = liveMatch?.stream_url ?? liveMatch?.cricheroes_stream_url ?? null;
  const streamEmbedUrl = youtubeEmbedUrl(availableStreamUrl);
  const cricVenue = [liveMatch?.cricheroes_live_score?.venue, liveMatch?.cricheroes_live_score?.city].filter(Boolean).join(", ");

  return <main className="match-page">
    <SiteHeader active="match-center" />
    <div className="match-wrap">
      <a className="match-back-link" href={localLink("fixtures.html")}>← Full schedule</a>
      <section className="match-hero">
        <div className="match-hero-kicker"><span>PHF Premier League · Season 5</span><b>Match {String(matchNumber).padStart(2, "0")}</b></div>
        <div className="match-versus">
          <div>{resolvedHome?.logo_url && <img src={logo(resolvedHome)} alt="" />}<span>{homeName}</span></div>
          <b>vs</b>
          <div>{resolvedAway?.logo_url && <img src={logo(resolvedAway)} alt="" />}<span>{awayName}</span></div>
        </div>
        <div className="match-meta"><span>{displayDate(fixture.date)}</span><span>Team report {fixture.reportTime} · Start {fixture.time}</span><span>{cricVenue || liveMatch?.venue || "Melbourne Cricket Ground"}</span></div>
        {(liveMatch?.cricheroes_status === "live" || cricCompleted) && <LiveScoreboard score={liveMatch.cricheroes_live_score} status={cricCompleted ? "completed" : "live"} />}
        {liveMatch?.status === "completed" && !cricCompleted && <div className="match-result"><span>Final score</span><strong>{liveMatch.home_runs}/{liveMatch.home_wickets} · {liveMatch.away_runs}/{liveMatch.away_wickets}</strong><b>{liveMatch.result_text ?? `${liveMatch.winner_team} won`}</b></div>}
        {liveMatch?.cricheroes_match_url && <a className="match-source-link" href={liveMatch.cricheroes_match_url} target="_blank" rel="noopener noreferrer">Open official CricHeroes match page ↗</a>}
      </section>

      <section className="match-broadcast" aria-labelledby="match-broadcast-title">
        <div className="match-broadcast-heading"><div><span>Watch Season 5</span><h2 id="match-broadcast-title">Match stream</h2></div><b><i/> YouTube</b></div>
        {streamEmbedUrl ? <div className="match-broadcast-player"><iframe src={streamEmbedUrl} title={`${homeName} vs ${awayName} · PHF Premier League Season 5 live stream`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div>
          : availableStreamUrl ? <div className="match-broadcast-placeholder"><span className="match-broadcast-play">▶</span><div><strong>Stream link published</strong><p>Open the official match broadcast.</p></div><a href={availableStreamUrl} target="_blank" rel="noopener noreferrer">Watch stream ↗</a></div>
          : <div className="match-broadcast-placeholder"><span className="match-broadcast-play">▶</span><div><strong>This match will be streamed on YouTube.</strong><p>The live player will appear here when the match stream is published.</p></div><span className="match-broadcast-upcoming">Stream link coming soon</span></div>}
      </section>

      {loadIssue && <p className="match-load-issue" role="status">{loadIssue}</p>}

      {matchNumber <= 15 && <FanMatchActivity matchNumber={matchNumber} />}

      {liveMatch?.status === "completed" && !cricCompleted && <section className="match-scorecard-section"><div className="match-section-title"><div><span>Official match record</span><h2>Scorecard</h2></div><p>Innings totals and player figures submitted by the match recorder.</p></div><div className="match-scorecard-innings"><article><span>{homeName}</span><strong>{liveMatch.home_runs ?? "—"}/{liveMatch.home_wickets ?? "—"}</strong><small>{liveMatch.home_overs ?? "—"} overs</small></article><article><span>{awayName}</span><strong>{liveMatch.away_runs ?? "—"}/{liveMatch.away_wickets ?? "—"}</strong><small>{liveMatch.away_overs ?? "—"} overs</small></article></div>{liveMatch.player_scorecard?.length ? <div className="match-scorecard-players"><div><span>Player</span><span>Runs (balls)</span><span>Wickets · overs</span></div>{liveMatch.player_scorecard.map((player) => <div key={player.player_id}><strong>{player.player_name}<small>{player.role}</small></strong><b>{player.runs} ({player.balls})</b><span>{player.wickets} · {player.overs}</span></div>)}</div> : <p className="match-scorecard-empty">Player figures have not been submitted for this match. Ball-by-ball commentary is not part of the current match record.</p>}</section>}

      {!matchCompleted && matchNumber <= 15 && <section className="match-analysis-section">
        <div className="match-section-title"><div><span>Pre-match analysis</span><h2>The numbers<br/><em>to watch.</em></h2></div><p>Built from {analysisSources}. It describes recorded player performance; it does not predict the result.</p></div>
        {loading ? <p className="match-loading">Loading squads and available stats…</p> : hasComparables ? <>
          {resolvedHome && resolvedAway && <PreMatchRead home={resolvedHome} away={resolvedAway} auction={auction} tournament={tournament} />}
          <div className="match-analysis-grid">{homeSquadStats}{awaySquadStats}</div>
          <div className="match-analysis-note"><strong>How to read this</strong><p>Season 5 figures use recorded scorecards once players have appeared. Before then, available player comparisons use linked career profiles. Missing records are left blank rather than estimated.</p></div>
        </> : <div className="match-analysis-empty"><h3>Analysis will sharpen when squads are available</h3><p>Once both team rosters and verified player figures are connected, this section will surface each side’s leading run scorer, wicket taker, and relevant batting rates.</p></div>}
      </section>}

      {!matchCompleted && matchNumber <= 15 && !loading && hasComparables && resolvedHome && resolvedAway && <MatchTacticalPreview home={resolvedHome} away={resolvedAway} auction={auction} tournament={tournament} />}

      <section className="match-facts"><span>Match information</span><div><b>Date</b><strong>{displayDate(fixture.date)}</strong></div><div><b>Team reporting</b><strong>{fixture.reportTime}</strong></div><div><b>Match start</b><strong>{fixture.time}</strong></div><div><b>Venue</b><strong>{cricVenue || liveMatch?.venue || "Melbourne Cricket Ground"}</strong></div><div><b>Format</b><strong>{liveMatch?.cricheroes_live_score?.overs ? `${liveMatch.cricheroes_live_score.overs} overs · ` : ""}{matchNumber >= 16 ? "Season 5 finals · knockout match" : "Season 5 round robin · 2 points for a win"}</strong></div></section>
      <footer className="match-footer"><a href={localLink("")}>PHF Premier League</a><span>Season 5 · 2026</span><a href={localLink("fixtures.html")}>Return to schedule ↑</a></footer>
    </div>
  </main>;
}
