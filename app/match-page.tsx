"use client";

import { useEffect, useMemo, useState } from "react";
import playersJson from "./season5-players.json";
import replacementProfilesJson from "./season5-replacement-profiles.json";
import { getAuctionSnapshot, getTournamentSnapshot, preAuctionSnapshot, type AuctionPlayer, type AuctionSnapshot, type AuctionTeam, type TournamentSnapshot } from "./auction-client";
import { announcedTeams } from "./season5-teams";
import SiteHeader from "./site-header";
import { seasonFiveFixtures, teamNameForSlot } from "./season5-fixtures";
import MatchRules from "./match-rules";
import { FanMatchActivity } from "./fan-activity";

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

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("");
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
      scope: "Season 5 scorecard",
      runs: row.runs,
      average: null,
      strikeRate: row.strikeRate,
      wickets: row.wickets,
      economy: row.economy,
      note: `${row.seasonMatches} Season 5 ${row.seasonMatches === 1 ? "appearance" : "appearances"} recorded.`,
    };
    const battingRank = row.careerRuns === null ? null : careerBatting.findIndex((item) => item.player.id === row.player.id) + 1;
    const bowlingRank = row.careerWickets === null ? null : careerBowling.findIndex((item) => item.player.id === row.player.id) + 1;
    const ranks = [
      battingRank ? `career runs ${battingRank}/${careerBatting.length}` : null,
      bowlingRank ? `career wickets ${bowlingRank}/${careerBowling.length}` : null,
    ].filter(Boolean);
    return {
      scope: "Verified career profile",
      runs: row.careerRuns,
      average: row.careerAverage,
      strikeRate: row.careerStrikeRate,
      wickets: row.careerWickets,
      economy: row.careerEconomy,
      note: ranks.length ? `Squad rank: ${ranks.join(" · ")}.` : row.profile?.statsSource ? "Profile linked; comparable totals are not available." : "No verified career totals in this data set.",
    };
  };
  return <details className="match-player-scouting" open>
    <summary><span>Player-by-player record</span><b>{stats.squad.length} listed</b><i aria-hidden="true" /></summary>
    <div className="match-player-scouting-intro"><p>All listed players are covered below. Batting and bowling totals are kept to the same profile scope; ranks compare available records within this squad. A dash means no comparable figure is available.</p><span>{stats.statsScope === "Season 5" ? "Season scorecards where recorded · career baseline otherwise" : "Verified career profile totals"}</span></div>
    <div className="match-player-table-scroll" role="region" aria-label={`${team.name} player-by-player stats`} tabIndex={0}>
      <table className="match-player-table"><thead><tr><th scope="col">Player &amp; role</th><th scope="col">Batting · runs / avg / SR</th><th scope="col">Bowling · wickets / econ</th><th scope="col">Scouting read</th></tr></thead><tbody>
        {stats.metrics.map((row) => {
          const record = recordFor(row);
          return <tr key={row.player.id}>
            <th scope="row"><strong>{row.player.name}{row.player.status === "captain" ? <span className="match-player-captain">C</span> : null}</strong><small>{row.player.role || "Role not listed"}</small>{(row.profile?.statsSource || row.profile?.cricheroesUrl) && <a href={row.profile.statsSource ?? row.profile.cricheroesUrl} target="_blank" rel="noopener noreferrer">Player details ↗</a>}</th>
            <td><strong>{number(record.runs)}</strong><small>Avg {number(record.average, 2)} · SR {number(record.strikeRate, 2)}</small></td>
            <td><strong>{number(record.wickets)} wickets</strong><small>Economy {number(record.economy, 2)}</small></td>
            <td><span className="match-player-scope">{record.scope}</span><small>{record.note}</small></td>
          </tr>;
        })}
      </tbody></table>
    </div>
    {stats.metrics.some((row) => row.profile?.statsChecked) && <small className="match-player-source-note">Career profile data checked {stats.metrics.find((row) => row.profile?.statsChecked)?.profile?.statsChecked}. Career records describe past performance and do not guarantee match-day selection or form.</small>}
  </details>;
}

function MatchTwoBrief({ home, away, auction, tournament }: { home: AuctionTeam; away: AuctionTeam; auction: AuctionSnapshot; tournament: TournamentSnapshot }) {
  const homeStats = getTeamStatSummary(home, auction, tournament);
  const awayStats = getTeamStatSummary(away, auction, tournament);
  const roleCount = (stats: ReturnType<typeof getTeamStatSummary>, role: string) => stats.squad.filter((player) => player.role.toLowerCase() === role.toLowerCase()).length;
  const leader = (stats: ReturnType<typeof getTeamStatSummary>, kind: "bat" | "bowl") => kind === "bat" ? stats.topScorer : stats.topBowler;
  const homeBat = leader(homeStats, "bat");
  const awayBat = leader(awayStats, "bat");
  const homeBowl = leader(homeStats, "bowl");
  const awayBowl = leader(awayStats, "bowl");
  const homeAllRounders = roleCount(homeStats, "All-rounder");
  const awayAllRounders = roleCount(awayStats, "All-rounder");
  const listedPlayerCount = homeStats.squad.length + awayStats.squad.length;
  const captainName = (stats: ReturnType<typeof getTeamStatSummary>) => stats.squad.find((player) => player.status === "captain")?.name ?? "the captain";
  const scope = homeStats.statsScope === awayStats.statsScope ? homeStats.statsScope : "available recorded";

  return <section className="match-two-brief" aria-labelledby="match-two-brief-title">
    <div className="match-two-brief-heading"><div><span>Match 02 · Tactical briefing</span><h2 id="match-two-brief-title">How each side<br/><em>can win.</em></h2></div><p>A scouting view for High Flyers vs PHF Blasterz, built from the listed squads and {scope.toLowerCase()} player records. These are discussion points, not a prediction or confirmed playing XI.</p></div>
    <div className="match-two-teams">
      <article className="match-two-team-card">
        <header>{logo(home) ? <img src={logo(home)} alt="" /> : <b>{initials(home.name)}</b>}<div><span>Suggested game plan</span><h3>{home.name}</h3></div></header>
        <div className="match-two-plan"><span>Route to a win</span><p>Build the innings around the squad’s strongest recorded run-makers{homeBat ? `, led by ${homeBat.player.name} (${homeBat.runs} ${homeStats.statsScope.toLowerCase()} runs)` : ""}. The {homeAllRounders}-player all-rounder group gives the captain options to balance batting and bowling once the XI is chosen.</p></div>
        <div className="match-two-plan watch"><span>What to look out for</span><p>{awayBowl ? `How the batting group handles ${awayBowl.player.name} (${awayBowl.wickets} ${awayStats.statsScope.toLowerCase()} wickets)` : "Which PHF Blasterz bowlers make the XI"}. Watch how the final batting order supports captain {captainName(homeStats)}; the announced squad does not confirm batting positions.</p></div>
        <div className="match-two-leader"><span>Recorded batting leader</span><strong>{homeBat?.player.name ?? "No verified figure yet"}</strong><small>{homeBat ? `${homeBat.runs} runs · ${homeStats.statsScope}` : "Player record unavailable"}</small></div>
      </article>
      <article className="match-two-team-card away">
        <header>{logo(away) ? <img src={logo(away)} alt="" /> : <b>{initials(away.name)}</b>}<div><span>Suggested game plan</span><h3>{away.name}</h3></div></header>
        <div className="match-two-plan"><span>Route to a win</span><p>Use the squad’s all-rounder depth ({awayAllRounders} listed) to keep both batting and bowling options available. Build around its leading recorded run-maker{awayBat ? `, ${awayBat.player.name} (${awayBat.runs} ${awayStats.statsScope.toLowerCase()} runs)` : ""}, while selecting a balanced XI for the match conditions.</p></div>
        <div className="match-two-plan watch"><span>What to look out for</span><p>{homeBowl ? `Whether ${homeBowl.player.name} (${homeBowl.wickets} ${homeStats.statsScope.toLowerCase()} wickets) and the High Flyers attack can interrupt partnerships` : "Which High Flyers bowlers make the XI"}. Also watch the contribution from captain {captainName(awayStats)}; career or squad figures alone cannot establish his role in this match.</p></div>
        <div className="match-two-leader"><span>Recorded bowling leader</span><strong>{awayBowl?.player.name ?? "No verified figure yet"}</strong><small>{awayBowl ? `${awayBowl.wickets} wickets · ${awayStats.statsScope}` : "Player record unavailable"}</small></div>
      </article>
    </div>
    <div className="match-two-watchline"><span>Match watch</span><p>{homeBat && awayBowl ? `${homeBat.player.name}’s run record meets ${away.name}’s leading wicket record (${awayBowl?.wickets ?? "—"} wickets).` : "Compare the two sides’ leading batting and bowling records as the confirmed XI and scorecards become available."} {awayBat && homeBowl ? `${awayBat.player.name} is the corresponding batting name to watch for ${away.name}, with ${home.name}’s leading wicket record held by ${homeBowl.player.name}.` : ""}</p></div>
    <small className="match-two-caveat">Figures are profile or scorecard totals, not head-to-head results. No player-versus-player history, pitch report, or confirmed XI is available here.</small>
    <div className="match-two-full-scouting"><div><span>Complete squad view</span><h3>Every player.<br/><em>Every verified record.</em></h3></div><p>Review all {listedPlayerCount} players currently listed for this match. Profiles, batting totals, wicket records, and within-squad ranks appear where the data is available.</p></div>
    <div className="match-two-player-grids"><PlayerByPlayerScouting team={home} auction={auction} tournament={tournament} /><PlayerByPlayerScouting team={away} auction={auction} tournament={tournament} /></div>
  </section>;
}

function SquadList({ team, auction }: { team: AuctionTeam; auction: AuctionSnapshot }) {
  const squad = auction.players.filter((player) => player.team_id === team.id && (player.status === "sold" || player.status === "captain"));
  return <article className="match-squad-card">
    <h3>{team.name}<span>{squad.length} players</span></h3>
    {squad.length ? <ol>{squad.map((player: AuctionPlayer) => <li key={player.id}>
      {player.photo ? <img src={asset(player.photo)} alt="" loading="lazy" /> : <b className="match-player-initials">{initials(player.name)}</b>}
      <span><strong>{player.name}{player.status === "captain" ? " (C)" : ""}</strong><small>{player.replacement_for_player_id ? `Replacement · ${player.role || "Role not listed"}` : player.role || "Role not listed"}</small></span>
      <em>{directory.find((item) => item.id === player.id)?.statsSource ? "Career stats" : ""}</em>
    </li>)}</ol> : <p>Squad list is not available yet.</p>}
  </article>;
}

export default function MatchDetailsPage() {
  const [auction, setAuction] = useState<AuctionSnapshot>(preAuctionSnapshot);
  const [tournament, setTournament] = useState<TournamentSnapshot>(emptyTournament);
  const [loading, setLoading] = useState(true);
  const [loadIssue, setLoadIssue] = useState("");
  const matchNumber = typeof window === "undefined" ? 0 : Number(new URLSearchParams(window.location.search).get("match"));
  const fixture = seasonFiveFixtures.find((item) => item.match_number === matchNumber);

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
  const homeTeam = fixture ? teams.find((team) => team.name === teamNameForSlot(fixture.home_slot, teams)) : undefined;
  const awayTeam = fixture ? teams.find((team) => team.name === teamNameForSlot(fixture.away_slot, teams)) : undefined;
  const liveMatch = tournament.matches.find((match) => match.match_number === matchNumber);
  const homeName = liveMatch?.home_team ?? (fixture ? teamNameForSlot(fixture.home_slot, teams) : "Home team");
  const awayName = liveMatch?.away_team ?? (fixture ? teamNameForSlot(fixture.away_slot, teams) : "Away team");
  const resolvedHome = teams.find((team) => team.name === homeName) ?? homeTeam;
  const resolvedAway = teams.find((team) => team.name === awayName) ?? awayTeam;
  const homeSquadStats = resolvedHome ? <TeamAnalysis team={resolvedHome} auction={auction} tournament={tournament} /> : null;
  const awaySquadStats = resolvedAway ? <TeamAnalysis team={resolvedAway} auction={auction} tournament={tournament} /> : null;

  if (!fixture) return <main className="match-page"><SiteHeader active="match-center" /><section className="match-not-found"><span>Season 5 schedule</span><h1>Match not found</h1><p>Choose a match from the published schedule to see its details.</p><a href={localLink("fixtures.html")}>Back to schedule</a></section></main>;

  const analysisSources = tournament.player_stats.some((stat) => stat.matches > 0) ? "Season 5 scorecards" : "verified CricHeroes career profiles";
  const hasComparables = Boolean(resolvedHome && resolvedAway && auction.players.some((player) => player.team_id === resolvedHome.id) && auction.players.some((player) => player.team_id === resolvedAway.id));

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
        <div className="match-meta"><span>{displayDate(fixture.date)}</span><span>{fixture.time}</span><span>{liveMatch?.venue ?? "Melbourne Cricket Ground"}</span></div>
        {liveMatch?.status === "completed" && <div className="match-result"><span>Final score</span><strong>{liveMatch.home_runs}/{liveMatch.home_wickets} · {liveMatch.away_runs}/{liveMatch.away_wickets}</strong><b>{liveMatch.result_text ?? `${liveMatch.winner_team} won`}</b></div>}
      </section>

      {loadIssue && <p className="match-load-issue" role="status">{loadIssue}</p>}

      <FanMatchActivity matchNumber={matchNumber} />

      <MatchRules variant="match" />

      <section className="match-analysis-section">
        <div className="match-section-title"><div><span>Pre-match analysis</span><h2>The numbers<br/><em>to watch.</em></h2></div><p>Built from {analysisSources}. It describes recorded player performance; it does not predict the result.</p></div>
        {loading ? <p className="match-loading">Loading squads and available stats…</p> : hasComparables ? <>
          {resolvedHome && resolvedAway && <PreMatchRead home={resolvedHome} away={resolvedAway} auction={auction} tournament={tournament} />}
          <div className="match-analysis-grid">{homeSquadStats}{awaySquadStats}</div>
          <div className="match-analysis-note"><strong>How to read this</strong><p>Season 5 figures use recorded scorecards once players have appeared. Before then, available player comparisons use linked career profiles. Missing records are left blank rather than estimated.</p></div>
        </> : <div className="match-analysis-empty"><h3>Analysis will sharpen when squads are available</h3><p>Once both team rosters and verified player figures are connected, this section will surface each side’s leading run scorer, wicket taker, and relevant batting rates.</p></div>}
      </section>

      {matchNumber === 2 && !loading && resolvedHome && resolvedAway && <MatchTwoBrief home={resolvedHome} away={resolvedAway} auction={auction} tournament={tournament} />}

      <section className="match-squads-section">
        <div className="match-section-title"><div><span>Season 5 squads</span><h2>Meet the<br/><em>squads.</em></h2></div><p>Player roles and current team assignments from the official Season 5 roster. Final playing XIs will be confirmed separately.</p></div>
        {loading ? <p className="match-loading">Loading team squads…</p> : <div className="match-squads-grid">{resolvedHome && <SquadList team={resolvedHome} auction={auction} />}{resolvedAway && <SquadList team={resolvedAway} auction={auction} />}</div>}
      </section>

      <section className="match-facts"><span>Match information</span><div><b>Date</b><strong>{displayDate(fixture.date)}</strong></div><div><b>Start</b><strong>{fixture.time}</strong></div><div><b>Venue</b><strong>{liveMatch?.venue ?? "Melbourne Cricket Ground"}</strong></div><div><b>Format</b><strong>Season 5 round robin · 2 points for a win</strong></div></section>
      <footer className="match-footer"><a href={localLink("")}>PHF Premier League</a><span>Season 5 · 2026</span><a href={localLink("fixtures.html")}>Return to schedule ↑</a></footer>
    </div>
  </main>;
}
