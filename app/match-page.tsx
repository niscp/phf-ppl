"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import playersJson from "./season5-players.json";
import replacementProfilesJson from "./season5-replacement-profiles.json";
import { getAuctionSnapshot, getTournamentSnapshot, preAuctionSnapshot, type AuctionSnapshot, type AuctionPlayer, type AuctionTeam, type CricHeroesBattingFigure, type CricHeroesBowlingFigure, type TournamentMatch, type TournamentSnapshot } from "./auction-client";
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
  const seasonFor = (player: AuctionPlayer) => tournament.player_stats.find((stat) => stat.team_id === team.id && normalizedPerson(stat.name) === normalizedPerson(player.name));
  const seasonStatsExist = squad.some((player) => (seasonFor(player)?.matches ?? 0) > 0);
  const statsScope = seasonStatsExist ? "Season 5" : "verified career";
  const metrics = squad.map((player) => {
    const profile = directory.find((item) => item.id === player.id);
    const season = seasonFor(player);
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

type RecentBattingLine = CricHeroesBattingFigure & { battingSlot: number; displayName: string; rosterPlayer?: AuctionPlayer; profile?: DirectoryPlayer };
type RecentBowlingLine = CricHeroesBowlingFigure & { displayName: string; rosterPlayer?: AuctionPlayer; profile?: DirectoryPlayer };
type TeamRecentForm = { match: TournamentMatch; opponent: string; batting: RecentBattingLine[]; bowling: RecentBowlingLine[] };

const playerNameAliases: Record<string, string> = {
  "ajay aj": "ajay", "ajay a j": "ajay", "harshank singh chaggar": "harshank",
  "chandan mahapatra": "chandan", "vinay bharadwaj": "vinay bhardwaj", "vineet mishra": "vineet",
  "revanth": "revanth reddy", "srikanth k": "srikanth kavuri", "kowshik": "chirumamilla kowshik",
  "ratna raju jetty": "ratna taji", "swejan r": "swejan", "diptiranjan samantaray": "dr sam",
  "praveer": "praveer kumar kullu", "yogi": "yogesh", "akki thadani": "akash thadani",
  "bhupesh": "bhupesh jatiani", "santosh sriramoju": "santosh kumar sriramoju",
  "shobhit k": "shobhit kastuar", "shravan kumar": "shravan", "abhishek s phf": "abhishek s",
  "kishore bowrothu": "kishore chandra", "pavan kumar e v": "e v pavan kumar",
  "sindhu kumar": "sindhukumar recharla", "talluri tarun": "tarun talluri",
  "krishna prashanth": "prashanth palipudi", "subash reddy k": "subash k reddy",
};

function normalizedPerson(value: string | null | undefined) {
  const raw = String(value ?? "").toLowerCase().replace(/[†‡]/g, "").replace(/\([^)]*\)/g, "").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
  return playerNameAliases[raw] ?? raw;
}

function normalizedTeam(value: string | null | undefined) {
  return normalizedPerson(value).replace(/\b(phf|the|prestige)\b/g, "").replace(/\s+/g, " ").trim();
}

function externalPlayerId(profile: DirectoryPlayer | undefined) {
  return profile?.statsSource?.match(/\/player-profile\/(\d+)\//)?.[1] ?? null;
}

function resolveRosterEntry(name: string, externalId: number | string | null | undefined, team: AuctionTeam, auction: AuctionSnapshot) {
  const squad = auction.players.filter((player) => player.team_id === team.id && (player.status === "sold" || player.status === "captain"));
  const id = externalId == null ? null : String(externalId);
  if (id) {
    const profile = directory.find((item) => externalPlayerId(item) === id);
    const player = profile && squad.find((item) => item.id === profile.id);
    if (player) return { player, profile };
  }
  const key = normalizedPerson(name);
  const player = squad.find((item) => normalizedPerson(item.name) === key);
  return player ? { player, profile: directory.find((item) => item.id === player.id) } : {};
}

function scorecardInnings(match: TournamentMatch, team: AuctionTeam) {
  const scorecard = match.cricheroes_live_score?.full_scorecard;
  if (!scorecard) return null;
  const cards = [scorecard.team_a, scorecard.team_b].filter(Boolean);
  const own = cards.find((card) => normalizedTeam(card?.name) === normalizedTeam(team.name));
  if (!own) return null;
  const opponent = cards.find((card) => card !== own);
  if (!opponent) return null;
  return { own, opponent };
}

function getTeamRecentForm(team: AuctionTeam, auction: AuctionSnapshot, tournament: TournamentSnapshot): TeamRecentForm | null {
  const completed = [...tournament.matches].filter((match) => match.status === "completed").sort((a, b) => b.match_number - a.match_number);
  for (const match of completed) {
    const innings = scorecardInnings(match, team);
    if (!innings) continue;
    const battingRows = (innings.own?.scorecard ?? []).flatMap((inning) => Number(inning.inning) <= 2 ? inning.batting ?? [] : []);
    const bowlingRows = (innings.opponent?.scorecard ?? []).flatMap((inning) => Number(inning.inning) <= 2 ? inning.bowling ?? [] : []);
    if (!battingRows.length && !bowlingRows.length) continue;
    const batting = battingRows.map((row, index) => {
      const resolved = resolveRosterEntry(row.name, row.player_id, team, auction);
      return { ...row, battingSlot: index + 1, displayName: resolved.player?.name ?? row.name.replace(/[†‡]/g, "").replace(/\s*\([^)]*\)\s*/g, " ").trim(), rosterPlayer: resolved.player, profile: resolved.profile };
    });
    const bowling = bowlingRows.map((row) => {
      const resolved = resolveRosterEntry(row.name, row.player_id, team, auction);
      return { ...row, displayName: resolved.player?.name ?? row.name.replace(/[†‡]/g, "").replace(/\s*\([^)]*\)\s*/g, " ").trim(), rosterPlayer: resolved.player, profile: resolved.profile };
    });
    return { match, opponent: match.home_team_id === team.id ? match.away_team : match.home_team, batting, bowling };
  }
  return null;
}

function playerHasAppeared(player: AuctionPlayer, team: AuctionTeam, auction: AuctionSnapshot, tournament: TournamentSnapshot) {
  const profile = directory.find((item) => item.id === player.id);
  const id = externalPlayerId(profile);
  const canonicalName = normalizedPerson(player.name);
  for (const match of tournament.matches) {
    if (match.status !== "completed") continue;
    const innings = scorecardInnings(match, team);
    if (!innings) continue;
    const rows = [
      ...(innings.own?.scorecard ?? []).flatMap((inning) => [...(inning.batting ?? [])]),
      ...(innings.opponent?.scorecard ?? []).flatMap((inning) => [...(inning.bowling ?? [])]),
    ];
    if (rows.some((row) => (id && String(row.player_id ?? "") === id) || normalizedPerson(row.name) === canonicalName)) return true;
  }
  return tournament.player_stats.some((stat) => stat.team_id === team.id && normalizedPerson(stat.name) === canonicalName && stat.matches > 0);
}

function tournamentRecordFor(player: AuctionPlayer, team: AuctionTeam, tournament: TournamentSnapshot) {
  return tournament.player_stats.find((stat) => stat.team_id === team.id && normalizedPerson(stat.name) === normalizedPerson(player.name));
}

function teamPreviousScore(team: AuctionTeam, match: TournamentMatch) {
  const isHome = match.home_team_id === team.id;
  return isHome ? match.home_runs : match.away_runs;
}

function teamPreviousConceded(team: AuctionTeam, match: TournamentMatch) {
  const isHome = match.home_team_id === team.id;
  return isHome ? match.away_runs : match.home_runs;
}

function roleFromRecentUse(player: RecentBattingLine | RecentBowlingLine, batting?: RecentBattingLine, bowling?: RecentBowlingLine) {
  const batLabel = batting ? batting.battingSlot <= 2 ? `Opening batter · slot ${batting.battingSlot}` : batting.battingSlot <= 5 ? `Middle order · slot ${batting.battingSlot}` : `Lower order · slot ${batting.battingSlot}` : null;
  const overs = bowling ? numeric(bowling.overs) : null;
  const bowlLabel = bowling ? (overs !== null && overs >= 3 ? "Frontline spell" : numeric(bowling.wickets) ? "Wicket-taking spell" : "Support spell") : null;
  if (batLabel && bowlLabel) return `${batLabel} · bowled ${bowling?.overs} ov`;
  if (batLabel) return batLabel;
  if (bowlLabel) return bowlLabel;
  return player.rosterPlayer?.role ?? "Match role not recorded";
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
  const homeRecent = getTeamRecentForm(home, auction, tournament);
  const awayRecent = getTeamRecentForm(away, auction, tournament);
  const homeSquad = getTeamStatSummary(home, auction, tournament).squad;
  const awaySquad = getTeamStatSummary(away, auction, tournament).squad;

  const leadingBatter = (form: TeamRecentForm | null) => form?.batting.reduce<RecentBattingLine | null>((best, item) => !best || Number(item.runs) > Number(best.runs) ? item : best, null) ?? null;
  const leadingBowler = (form: TeamRecentForm | null) => form?.bowling.reduce<RecentBowlingLine | null>((best, item) => !best || Number(item.wickets) > Number(best.wickets) || (Number(item.wickets) === Number(best.wickets) && Number(item.overs) > Number(best.overs)) ? item : best, null) ?? null;

  const optionFor = (team: AuctionTeam, squad: AuctionPlayer[], recent: TeamRecentForm | null) => {
    const candidates = squad.filter((player) => !playerHasAppeared(player, team, auction, tournament));
    if (!candidates.length) return null;
    const ownScore = recent ? numeric(teamPreviousScore(team, recent.match)) : null;
    const conceded = recent ? numeric(teamPreviousConceded(team, recent.match)) : null;
    const need = ownScore !== null && ownScore < 110 ? "batting" : conceded !== null && conceded >= 175 ? "bowling" : "balance";
    const profileFor = (player: AuctionPlayer) => directory.find((item) => item.id === player.id);
    const candidateRole = (player: AuctionPlayer, profile?: DirectoryPlayer) => {
      if (player.role !== "All-rounder") return player.role;
      const runs = numeric(profile?.stats?.batting?.runs) ?? 0;
      const wickets = numeric(profile?.stats?.bowling?.wickets) ?? 0;
      if (wickets >= 25 && wickets >= runs / 30) return "Bowling all-rounder";
      if (runs >= 200 && runs >= wickets * 30) return "Batting all-rounder";
      return "Flexible all-rounder";
    };
    const score = (player: AuctionPlayer) => {
      const profile = profileFor(player);
      const role = candidateRole(player, profile);
      const preference = need === "batting" ? /batter|batting/i.test(role) ? 8 : /flexible/i.test(role) ? 3 : 0
        : need === "bowling" ? /bowler|bowling/i.test(role) ? 8 : /flexible/i.test(role) ? 3 : 0
          : 2;
      const career = (numeric(profile?.stats?.batting?.runs) ?? 0) / 500 + (numeric(profile?.stats?.bowling?.wickets) ?? 0) / 20;
      return preference + Math.min(career, 5) + (profile?.statsSource ? 0.5 : 0);
    };
    const player = [...candidates].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))[0];
    const profile = profileFor(player);
    return { player, profile, need, role: candidateRole(player, profile) };
  };

  const displayNumber = (value: number | string | null | undefined, digits = 0) => {
    const parsed = numeric(value);
    return parsed === null ? "—" : parsed.toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: digits });
  };

  const squadRole = (player: AuctionPlayer, stat: ReturnType<typeof tournamentRecordFor>, profile?: DirectoryPlayer) => {
    const listed = player.role || stat?.role || "Role not listed";
    if (listed.toLowerCase() !== "all-rounder") return listed;
    const runs = stat?.runs ?? (profile?.statsSource ? numeric(profile.stats?.batting?.runs) ?? 0 : 0);
    const wickets = stat?.wickets ?? (profile?.statsSource ? numeric(profile.stats?.bowling?.wickets) ?? 0 : 0);
    if (runs > 0 && wickets > 0) return runs >= wickets * 30 ? "Batting-led all-rounder" : "Bowling-led all-rounder";
    if (runs > 0) return "Batting option";
    if (wickets > 0) return "Bowling option";
    return "Flexible all-rounder";
  };

  const squadUsage = (player: AuctionPlayer, stat: ReturnType<typeof tournamentRecordFor>, batting?: RecentBattingLine, bowling?: RecentBowlingLine) => {
    if (batting || bowling) {
      const parts = [
        batting ? `${batting.battingSlot <= 2 ? "Top order" : batting.battingSlot <= 5 ? "Middle order" : "Lower order"} · ${displayNumber(batting.runs)} off ${displayNumber(batting.balls)}` : null,
        bowling ? `Bowling · ${displayNumber(bowling.overs, 1)} ov, ${displayNumber(bowling.wickets)} wickets, ${displayNumber(bowling.economy, 1)} econ` : null,
      ].filter(Boolean);
      return { role: batting && bowling ? "Batting and bowling option" : batting ? "Batting position" : "Bowling option", detail: parts.join(" · "), appeared: true };
    }
    if ((stat?.matches ?? 0) > 0) {
      const role = squadRole(player, stat, directory.find((item) => item.id === player.id));
      const detail = `${stat?.matches ?? 0} Season 5 match${stat?.matches === 1 ? "" : "es"} · ${displayNumber(stat?.runs)} runs · ${displayNumber(stat?.wickets)} wickets`;
      return { role, detail, appeared: true };
    }
    const profile = directory.find((item) => item.id === player.id);
    const career = profile?.statsSource ? [
      numeric(profile.stats?.batting?.runs) !== null ? `${displayNumber(profile.stats?.batting?.runs)} career runs` : null,
      numeric(profile.stats?.bowling?.wickets) !== null ? `${displayNumber(profile.stats?.bowling?.wickets)} career wickets` : null,
    ].filter(Boolean).join(" · ") : "No linked career figures";
    return { role: `${squadRole(player, stat, profile)} · possible first appearance`, detail: `${career}. Role comes from the squad listing; selection is unconfirmed.`, appeared: false };
  };

  const featuredLines = (form: TeamRecentForm | null) => {
    if (!form) return [] as Array<{ key: string; name: string; role: string; figures: string; player?: AuctionPlayer; photo?: string | null }>;
    const selected = new Map<string, { batting?: RecentBattingLine; bowling?: RecentBowlingLine }>();
    const add = (name: string, kind: "batting" | "bowling", line: RecentBattingLine | RecentBowlingLine) => {
      const key = line.rosterPlayer?.id ?? normalizedPerson(name);
      const current = selected.get(key) ?? {};
      selected.set(key, kind === "batting" ? { ...current, batting: line as RecentBattingLine } : { ...current, bowling: line as RecentBowlingLine });
    };
    const batting = [...form.batting].sort((a, b) => Number(b.runs) - Number(a.runs) || a.battingSlot - b.battingSlot);
    const battingSelection = [...form.batting.slice(0, 2), ...batting].filter((line, index, list) => list.findIndex((item) => (item.rosterPlayer?.id ?? normalizedPerson(item.displayName)) === (line.rosterPlayer?.id ?? normalizedPerson(line.displayName))) === index).slice(0, 3);
    battingSelection.forEach((line) => add(line.displayName, "batting", line));
    const bowling = [...form.bowling].sort((a, b) => Number(b.wickets) - Number(a.wickets) || Number(b.overs) - Number(a.overs) || Number(a.runs) - Number(b.runs));
    bowling.slice(0, 2).forEach((line) => add(line.displayName, "bowling", line));
    return [...selected.entries()].map(([key, lines]) => {
      const player = lines.batting?.rosterPlayer ?? lines.bowling?.rosterPlayer;
      const name = player?.name ?? lines.batting?.displayName ?? lines.bowling?.displayName ?? "Player";
      const bat = lines.batting;
      const bowl = lines.bowling;
      const role = bat && bowl ? roleFromRecentUse(bat, bat, bowl) : bat ? roleFromRecentUse(bat, bat) : bowl ? roleFromRecentUse(bowl, undefined, bowl) : player?.role ?? "Match role not recorded";
      const figures = [bat ? `${displayNumber(bat.runs)} off ${displayNumber(bat.balls)}` : null, bowl ? `${displayNumber(bowl.wickets)} wkts · ${displayNumber(bowl.overs, 1)} ov · econ ${displayNumber(bowl.economy, 1)}` : null].filter(Boolean).join(" / ");
      return { key, name, role, figures, player, photo: player?.photo ?? null };
    }).slice(0, 5);
  };

  const card = (team: AuctionTeam, squad: AuctionPlayer[], recent: TeamRecentForm | null, opponentRecent: TeamRecentForm | null, awaySide = false) => {
    const bat = leadingBatter(recent);
    const bowler = leadingBowler(recent);
    const opponentBowler = leadingBowler(opponentRecent);
    const opponentBatter = leadingBatter(opponentRecent);
    const featured = featuredLines(recent);
    const rotation = optionFor(team, squad, recent);
    const squadPlayers = squad.map((player) => {
      const stat = tournamentRecordFor(player, team, tournament);
      const battingLine = recent?.batting.find((line) => line.rosterPlayer?.id === player.id || normalizedPerson(line.displayName) === normalizedPerson(player.name));
      const bowlingLine = recent?.bowling.find((line) => line.rosterPlayer?.id === player.id || normalizedPerson(line.displayName) === normalizedPerson(player.name));
      const usage = squadUsage(player, stat, battingLine, bowlingLine);
      return { player, usage };
    });
    const nishank = team.name.toLowerCase().includes("high flyers") ? squadPlayers.find(({ player }) => normalizedPerson(player.name) === "nishank singh") : null;
    const nishankStat = nishank ? tournamentRecordFor(nishank.player, team, tournament) : null;
    const ownRuns = recent ? teamPreviousScore(team, recent.match) : null;
    const ownWickets = recent ? (recent.match.home_team_id === team.id ? recent.match.home_wickets : recent.match.away_wickets) : null;
    const ownOvers = recent ? (recent.match.home_team_id === team.id ? recent.match.home_overs : recent.match.away_overs) : null;
    const sourceUrl = recent?.match.cricheroes_match_url;
    const career = rotation?.profile?.statsSource ? [
      numeric(rotation.profile.stats?.batting?.runs) !== null ? `${displayNumber(rotation.profile.stats?.batting?.runs)} career runs` : null,
      numeric(rotation.profile.stats?.bowling?.wickets) !== null ? `${displayNumber(rotation.profile.stats?.bowling?.wickets)} career wickets` : null,
    ].filter(Boolean).join(" · ") : "No linked career figures; role is based on the squad listing.";
    const selectionDescription = rotation?.need === "batting" ? "Could add another batting option after the side’s last low-scoring innings." : rotation?.need === "bowling" ? "Could add a fresh bowling option after the opponent made a high total." : "A first-appearance option to add role depth if the captain rotates the squad.";
    return <article className={`match-two-team-card match-preview-team${awaySide ? " away" : ""}`} key={team.id} style={{ "--team-color": teamColor(team.name) } as CSSProperties}>
      <header>{logo(team) ? <img src={logo(team)} alt="" /> : <b>{initials(team.name)}</b>}<div><span>{recent ? `Most recent card · Match ${recent.match.match_number}` : "Season 5 scorecard data"}</span><h3>{team.name}</h3></div></header>
      {recent ? <>
        <div className="preview-last-outing"><b>Last outing</b><span>vs {recent.opponent}</span><strong>{displayNumber(ownRuns)}/{displayNumber(ownWickets)} <small>in {displayNumber(ownOvers, 1)} overs</small></strong><em>{recent.match.result_text ?? "Result recorded"}</em>{sourceUrl && <a href={sourceUrl} target="_blank" rel="noopener noreferrer">CricHeroes scorecard ↗</a>}</div>
        <div className="preview-plan-grid">
          <div className="match-two-plan"><span>Batting plan</span><p>{bat ? `Keep ${recent.batting.slice(0, 2).map((line) => line.displayName).join(" and ")} in their established opening slots; ${bat.displayName} led the last innings with ${displayNumber(bat.runs)} off ${displayNumber(bat.balls)}.` : "Batting entries are not available on the latest linked scorecard; confirm the order after the XI is announced."}</p></div>
          <div className="match-two-plan"><span>Bowling plan</span><p>{bowler ? `Build the attack around ${bowler.displayName}, who took ${displayNumber(bowler.wickets)} wicket${Number(bowler.wickets) === 1 ? "" : "s"} in ${displayNumber(bowler.overs, 1)} overs. ${opponentBatter ? `The opposing side’s latest top score was ${opponentBatter.displayName} (${displayNumber(opponentBatter.runs)} off ${displayNumber(opponentBatter.balls)}), so track that matchup.` : "Use the latest scorecard to set the bowling roles."}` : "Bowling figures are missing from the latest linked card; set roles from the confirmed XI and conditions."}</p></div>
        </div>
        <div className="preview-contributors"><div className="preview-subhead"><span>Recent contributors</span><small>Role reflects the last scorecard</small></div><div className="preview-contributor-grid">{featured.map((line) => <div className="preview-contributor" key={line.key}>{line.photo ? <img src={asset(line.photo)} alt="" loading="lazy" /> : <b>{initials(line.name)}</b>}<div><strong>{line.name}</strong><small>{line.role}</small><em>{line.figures}</em></div></div>)}</div></div>
        <div className="preview-full-squad"><div className="preview-subhead"><span>Full squad game plan</span><small>{squadPlayers.length} listed players · individual roles</small></div><div className="preview-squad-grid">{squadPlayers.map(({ player, usage }) => <article className={`preview-squad-player${usage.appeared ? " appeared" : " rotation"}`} key={player.id}><div><strong>{player.name}</strong><span>{usage.role}</span></div><small>{usage.detail}</small></article>)}</div>{nishank && nishankStat && nishankStat.wickets > 0 && <p className="preview-squad-praise"><strong>Bowling shout-out · Nishank Singh</strong><span>In Match 2 vs PHF Blasterz: {nishankStat.wickets}/{nishankStat.runs_conceded} from {displayNumber(nishankStat.overs, 1)} overs (economy {displayNumber(nishankStat.runs_conceded / nishankStat.overs, 2)}). A tidy, wicket-taking spell that deserves recognition.</span></p>}</div>
      </> : <p className="preview-no-card">No completed CricHeroes scorecard is linked for this team yet. The squad board below uses only available verified records.</p>}
      {rotation && <div className="preview-rotation"><span>Selection watch · possible first appearance</span><strong>{rotation.player.name}</strong><small>{rotation.role} · {selectionDescription}</small><p>{career}{rotation.profile?.statsChecked ? ` · profile checked ${new Date(`${rotation.profile.statsChecked}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}</p>{rotation.profile?.statsSource && <a href={rotation.profile.statsSource} target="_blank" rel="noopener noreferrer">View CricHeroes career profile ↗</a>}</div>}
      {!rotation && <div className="preview-rotation preview-rotation-empty"><span>Squad rotation</span><p>Every listed player appears on a previous batting or bowling card. No first-appearance option was found in the available data.</p></div>}
      <div className="preview-crosscheck"><span>Opponent form check</span><p>{opponentBowler && bat ? `${bat.displayName} (${displayNumber(bat.runs)} runs last outing) against ${opponentBowler.displayName} (${displayNumber(opponentBowler.wickets)} wickets in ${displayNumber(opponentBowler.overs, 1)} overs last outing).` : "A recent batter-versus-bowler comparison will appear when both teams have linked scorecards."} These are recent-form comparisons, not verified head-to-head records.</p></div>
    </article>;
  };

  const totalSquad = homeSquad.length + awaySquad.length;
  return <section className="match-two-brief match-scout-dashboard" aria-labelledby="match-preview-analysis-title">
    <div className="match-two-brief-heading"><div><span>Recent CricHeroes scorecards · Season 5</span><h2 id="match-preview-analysis-title">Matchup<br/><em>dashboard.</em></h2></div><p>Recent batting order, bowling workload, named contributors, and one possible first-appearance option for each side. Career figures appear only where they help assess a player without a Season 5 card.</p></div>
    <div className="match-two-teams">{card(home, homeSquad, homeRecent, awayRecent)}{card(away, awaySquad, awayRecent, homeRecent, true)}</div>
    <div className="match-two-watchline"><span>Matchup to watch</span><p>{leadingBatter(homeRecent) && leadingBowler(awayRecent) ? `${leadingBatter(homeRecent)!.displayName}’s recent batting output against ${leadingBowler(awayRecent)!.displayName}’s recent wicket-taking spell; then reverse the lens for ${leadingBatter(awayRecent)?.displayName ?? away.name} against ${leadingBowler(homeRecent)?.displayName ?? home.name}.` : "Compare each side’s latest batting contributors with the opposing attack when the scorecards are linked."} Each player’s figures come from their own latest completed match, not from a direct meeting.</p></div>
    <small className="match-two-caveat">A player is marked as a possible first appearance when they are not listed on a previous batting or bowling card; a fielder who neither batted nor bowled may be absent from those records. Playing XIs and roles are not confirmed. All tournament performance lines link to the relevant CricHeroes scorecard.</small>
    <div className="match-two-full-scouting"><div><span>Squad depth</span><h3>Players beyond<br/><em>the last XI.</em></h3></div><p>All {totalSquad} players listed for this fixture, with Season 5 scorecard records first and career figures used only where the tournament has no player entry yet.</p></div>
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
