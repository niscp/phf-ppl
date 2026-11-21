import { announcedTeams } from "./season5-teams";
import type { CricHeroesFullScorecard, CricHeroesInningsSummary, CricHeroesLiveScore, CricHeroesTeamScorecard } from "./auction-client";

const basePath = () => typeof window !== "undefined" && window.location.pathname.startsWith("/phf-ppl/") ? "/phf-ppl/" : "/";
const asset = (path: string) => `${basePath()}${path.replace(/^\//, "")}`;
const normalize = (name: string) => name.toLowerCase().replace(/\b(phf|the|prestige)\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();

function teamLogo(name?: string | null) {
  if (!name) return "";
  const team = announcedTeams.find((item) => normalize(item.name) === normalize(name));
  return team?.logo_url ? asset(team.logo_url) : "";
}

function latest<T extends CricHeroesInningsSummary>(innings?: T[]) {
  return innings?.length ? innings[innings.length - 1] : undefined;
}

function scoreFor(name: string | null | undefined, summary: string | undefined, innings?: CricHeroesInningsSummary[]) {
  const current = latest(innings);
  return {
    name: name || "Team",
    score: summary || current?.score || "—",
    overs: current?.overs ? `${current.overs} ov` : "",
    rr: current?.run_rate ? `RR ${current.run_rate}` : "",
  };
}

function TeamScore({ name, summary, innings, side }: { name: string | null | undefined; summary: string | undefined; innings?: CricHeroesInningsSummary[]; side: string }) {
  const team = scoreFor(name, summary, innings);
  const logo = teamLogo(team.name);
  return <div className={`live-score-team ${side}`}>
    {logo ? <img src={logo} alt="" /> : <span className="live-score-monogram">{team.name.slice(0, 2)}</span>}
    <div className="live-score-team-copy"><span>{team.name}</span><strong>{team.score}</strong><small>{[team.overs, team.rr].filter(Boolean).join(" · ") || "Innings"}</small></div>
  </div>;
}

function inningLabel(inning?: number) {
  return inning === 1 ? "1st innings" : inning === 2 ? "2nd innings" : inning ? `${inning}th innings` : "Innings";
}

function FullInnings({ team }: { team?: CricHeroesTeamScorecard }) {
  if (!team) return null;
  return <section className="live-full-team">
    <header><span>{team.name || "Team"}</span><b>{team.innings?.length ?? 0} innings</b></header>
    {(team.scorecard ?? []).map((inning, index) => {
      const total = team.innings?.find((entry) => entry.inning === inning.inning) ?? team.innings?.[index];
      return <article className="live-full-innings" key={`${inning.inning ?? index}-${index}`}>
        <div className="live-full-innings-heading"><strong>{inningLabel(inning.inning)}</strong><span>{total?.score ?? "Score unavailable"}{total?.overs ? ` · ${total.overs} ov` : ""}{total?.run_rate ? ` · RR ${total.run_rate}` : ""}</span></div>
        {inning.batting?.length > 0 && <div className="live-table-scroll" role="region" aria-label={`${team.name} batting scorecard`} tabIndex={0}>
          <table className="live-score-table live-batting-table"><thead><tr><th scope="col">Batter</th><th scope="col">R</th><th scope="col">B</th><th scope="col">4s</th><th scope="col">6s</th><th scope="col">SR</th></tr></thead><tbody>
            {inning.batting.map((batter, row) => <tr key={`${batter.name}-${row}`}><th scope="row"><strong>{batter.name || "Batter"}</strong><small>{batter.dismissal || "not out"}</small></th><td>{batter.runs}</td><td>{batter.balls}</td><td>{batter.fours}</td><td>{batter.sixes}</td><td>{batter.strike_rate}</td></tr>)}
          </tbody></table>
        </div>}
        {inning.extras && <p className="live-innings-note"><b>Extras</b> {inning.extras}</p>}
        {inning.fall_of_wickets && <p className="live-innings-note"><b>Fall of wickets</b> {inning.fall_of_wickets}</p>}
        {inning.bowling?.length > 0 && <div className="live-table-scroll live-bowling-scroll" role="region" aria-label={`${team.name} bowling scorecard`} tabIndex={0}>
          <table className="live-score-table live-bowling-table"><thead><tr><th scope="col">Bowler</th><th scope="col">O</th><th scope="col">M</th><th scope="col">R</th><th scope="col">W</th><th scope="col">Econ</th></tr></thead><tbody>
            {inning.bowling.map((bowler, row) => <tr key={`${bowler.name}-${row}`}><th scope="row">{bowler.name || "Bowler"}</th><td>{bowler.overs}</td><td>{bowler.maidens}</td><td>{bowler.runs}</td><td>{bowler.wickets}</td><td>{bowler.economy}</td></tr>)}
          </tbody></table>
        </div>}
      </article>;
    })}
    {!team.scorecard?.length && <p className="live-scorecard-pending">Player-by-player figures are not available yet.</p>}
  </section>;
}

export default function LiveScoreboard({ score, status }: { score?: CricHeroesLiveScore | null; status?: string | null }) {
  if (!score || !["live", "completed"].includes(status || score.status)) return null;
  const live = (status || score.status) === "live";
  const home = scoreFor(score.team_a, score.team_a_summary, (score.team_a_innings ?? []) as CricHeroesInningsSummary[]);
  const away = scoreFor(score.team_b, score.team_b_summary, (score.team_b_innings ?? []) as CricHeroesInningsSummary[]);
  const chase = score.match_summary;
  const resultText = chase?.summary || chase?.full_summary || chase?.short_summary;
  const awards = score.match_awards;
  const details = score.full_scorecard;
  const scorecardReady = Boolean(details?.team_a?.scorecard?.length || details?.team_b?.scorecard?.length);
  return <section className={`live-scoreboard${live ? " is-live" : " is-final"}`} aria-label={live ? "Live match score" : "Final match score"}>
    <div className="live-scoreboard-top"><span><i aria-hidden="true"/>{live ? "Live score" : "Full-time"}</span><small>{score.overs ? `${score.overs} overs` : score.tournament_round_name || "PHF Premier League · Season 5"}</small></div>
    <div className="live-scoreboard-teams">
      <TeamScore name={score.team_a} summary={score.team_a_summary} innings={score.team_a_innings as CricHeroesInningsSummary[]} side="first" />
      <span className="live-score-vs">VS</span>
      <TeamScore name={score.team_b} summary={score.team_b_summary} innings={score.team_b_innings as CricHeroesInningsSummary[]} side="second" />
    </div>
    {live && chase && (chase.summary || chase.target || chase.rrr) && <div className="live-chase-line"><strong>{chase.summary || `Target ${chase.target}`}</strong><span>{chase.target ? `Target ${chase.target}` : ""}{chase.rrr ? ` · RRR ${chase.rrr}` : ""}</span></div>}
    {!live && (resultText || awards) && <div className="live-result-wrap">
      {resultText && <div className="live-result-banner"><span>Match result</span><strong>🏆 {resultText}</strong></div>}
      {awards && <div className="live-match-awards">
        {awards.player_of_match && <div className="is-player-of-match"><span>Player of the Match</span><strong>{awards.player_of_match.name}</strong></div>}
        {awards.best_batter && <div><span>Best Batter</span><strong>{awards.best_batter.name}</strong>{awards.best_batter.detail && <small>{awards.best_batter.detail}</small>}</div>}
        {awards.best_bowler && <div><span>Best Bowler</span><strong>{awards.best_bowler.name}</strong>{awards.best_bowler.detail && <small>{awards.best_bowler.detail}</small>}</div>}
      </div>}
    </div>}
    <details className="live-scorecard-details">
      <summary><span>{scorecardReady ? "Open full scorecard" : "Scorecard details"}</span><small>{scorecardReady ? "Batting · bowling · innings" : "Figures load as they are recorded"}</small><b aria-hidden="true">+</b></summary>
      {scorecardReady ? <div className="live-scorecard-body"><FullInnings team={details?.team_a}/><FullInnings team={details?.team_b}/></div> : <p className="live-scorecard-pending">The live total is available. Player-by-player scorecard figures will appear here when CricHeroes publishes them.</p>}
    </details>
    <div className="live-scoreboard-source">Score updates automatically from CricHeroes</div>
  </section>;
}
