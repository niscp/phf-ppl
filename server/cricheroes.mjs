const API_BASE = "https://api.cricheroes.in/api/v1";
const TOURNAMENT_ID = process.env.CRICHOEROES_TOURNAMENT_ID || "2253333";
const API_KEY = process.env.CRICHOEROES_API_KEY || "cr!CkH3r0s";
const DEVICE_ID = "phf-season5-dwemory-sync";

function headers() {
  return {
    "api-key": API_KEY,
    udid: DEVICE_ID,
    "device-type": "Chrome: 114.0.0.0",
    "user-agent": "Mozilla/5.0 (compatible; PHFMatchCentre/1.0)",
    origin: "https://cricheroes.com",
    referer: "https://cricheroes.com/",
  };
}

async function getMatches(type, status) {
  const url = new URL(`${API_BASE}/match/get-tournament-matches/${type}/-1/-1`);
  for (const [key, value] of Object.entries({ pagesize: 50, tournamentid: TOURNAMENT_ID, status, divisionId: -1, pageno: 1, datetime: Date.now() })) {
    url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`CricHeroes returned HTTP ${response.status}`);
  const body = await response.json();
  if (!body.status) return [];
  return Array.isArray(body.data) ? body.data : [];
}

async function getMatchScorecard(matchId) {
  const response = await fetch(`${API_BASE}/scorecard/v2/get-scorecard/${encodeURIComponent(matchId)}`, {
    headers: headers(), signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) return null;
  const body = await response.json();
  if (!body.status || !body.data) return null;
  const side = (value) => ({
    name: value?.name ?? "",
    innings: (value?.innings ?? []).map((inning) => ({
      inning: inning.inning,
      score: inning.summary?.score ?? `${inning.total_run ?? 0}/${inning.total_wicket ?? 0}`,
      overs: inning.overs_played ?? "",
      run_rate: inning.summary?.rr ?? "",
    })),
    scorecard: (value?.scorecard ?? []).map((inning) => ({
      inning: inning.inning,
      batting: (inning.batting ?? []).map((player) => ({
        player_id: player.player_id ?? null, name: player.name ?? "", runs: player.runs ?? 0, balls: player.balls ?? 0,
        fours: player["4s"] ?? 0, sixes: player["6s"] ?? 0, strike_rate: player.SR ?? "",
        dismissal: player.how_to_out ?? "",
      })),
      bowling: (inning.bowling ?? []).map((player) => ({
        player_id: player.player_id ?? null, name: player.name ?? "", overs: player.overs ?? 0, maidens: player.maidens ?? 0,
        runs: player.runs ?? 0, wickets: player.wickets ?? 0, economy: player.economy_rate ?? "",
      })),
      extras: inning.extras?.summary ?? "",
      fall_of_wickets: inning.fall_of_wicket?.summary ?? "",
    })),
  });
  return { team_a: side(body.data.team_a), team_b: side(body.data.team_b) };
}

function streamUrl(match) {
  const candidates = [match.streaming_url, match.steaming_url, match.streaming_multiple_url,
    ...(Array.isArray(match.streaming_details) ? match.streaming_details.flatMap((item) => [item?.streaming_url, item?.url, item?.watch_url]) : [])];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const value = candidate.trim();
    if (/^https:\/\//i.test(value)) return value;
    // CricHeroes supplies YouTube video IDs in its streaming_url fields.
    if (/^[A-Za-z0-9_-]{11}$/.test(value)) return `https://www.youtube.com/watch?v=${value}`;
  }
  return null;
}

function normalizedMatchStatus(value) {
  const status = String(value ?? "unknown").trim().toLowerCase();
  return ["past", "complete", "completed", "finished", "result"].includes(status) ? "completed" : status;
}

function normalizedTeamName(value) {
  return String(value ?? "").toLowerCase().replace(/\b(phf|the|prestige)\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function scoreParts(value) {
  const match = String(value ?? "").match(/^(\d+)\s*\/\s*(\d+)/);
  return match ? { runs: Number(match[1]), wickets: Number(match[2]) } : null;
}

function oversAsDecimal(value, quota, wickets) {
  const match = String(value ?? "").match(/^(\d+)(?:\.(\d+))?/);
  if (!match) return null;
  if (wickets === 10 && Number(quota) > 0) return Number(quota);
  const overs = Number(match[1]);
  const balls = Number(match[2] ?? 0);
  return balls <= 5 ? Number((overs + balls / 6).toFixed(4)) : null;
}

export async function syncCricHeroesMatches(db) {
  const sources = await Promise.allSettled([[1, 1], [2, 2], [3, 3]].map(([type, status]) => getMatches(type, status)));
  const errors = sources.filter((result) => result.status === "rejected");
  const matches = sources.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  if (!matches.length && errors.length === sources.length) throw errors[0].reason;

  const matchIds = matches.map((match) => Number(match.match_id)).filter(Number.isInteger);
  const priorRows = matchIds.length
    ? await db.query(`select m.cricheroes_match_id,m.cricheroes_status,m.cricheroes_live_score,
        m.home_team_id,m.away_team_id,m.overs,ht.name home_team,at.name away_team
      from tournament_matches m join auction_teams ht on ht.id=m.home_team_id
      join auction_teams at on at.id=m.away_team_id
      where m.cricheroes_match_id=any($1::bigint[])`, [matchIds])
    : { rows: [] };
  const priorById = new Map(priorRows.rows.map((row) => [Number(row.cricheroes_match_id), row]));

  let synced = 0;
  for (const match of matches) {
    const id = Number(match.match_id);
    if (!Number.isInteger(id)) continue;
    const score = {
      status: normalizedMatchStatus(match.status),
      team_a: match.team_a ?? match.team_a_name ?? null,
      team_b: match.team_b ?? match.team_b_name ?? null,
      team_a_summary: match.team_a_summary ?? "",
      team_b_summary: match.team_b_summary ?? "",
      match_summary: match.match_summary ?? {},
      team_a_innings: match.team_a_innings ?? [],
      team_b_innings: match.team_b_innings ?? [],
      tournament_name: match.tournament_name ?? null,
      tournament_round_name: match.tournament_round_name ?? null,
      venue: match.ground_name ?? null,
      city: match.city_name ?? null,
      overs: match.overs ?? null,
      toss_details: match.toss_details ?? null,
      team_a_id: match.team_a_id ?? null,
      team_b_id: match.team_b_id ?? null,
      team_a_logo: match.team_a_logo ?? null,
      team_b_logo: match.team_b_logo ?? null,
      current_inning: match.current_inning ?? null,
      winning_team: match.winning_team ?? null,
      winning_team_id: match.winning_team_id ?? null,
      win_by: match.win_by ?? null,
      match_start_time: match.match_start_time ?? match.start_datetime ?? null,
      match_end_time: match.match_end_time ?? null,
      is_watch_live: Boolean(match.is_watch_live),
      is_ticker: Boolean(match.is_ticker),
      is_enable_tournament_streaming: Boolean(match.is_enable_tournament_streaming),
      is_enable_match_streaming: Boolean(match.is_enable_match_streaming),
      stream_url: streamUrl(match),
      source_updated_at: match.last_updated_date ?? null,
    };
    const previous = priorById.get(id);
    const previousScore = previous?.cricheroes_live_score ?? {};
    const previousCard = previousScore.full_scorecard;
    const finalCardStale = score.status === "completed" && (
      previous?.cricheroes_status !== "completed"
      || !previousCard
      || !previousScore.match_awards
      || previousCard.team_a?.innings?.at(-1)?.score !== score.team_a_summary
      || previousCard.team_b?.innings?.at(-1)?.score !== score.team_b_summary
    );
    if (score.status === "live" || finalCardStale) {
      try {
        const fullScorecard = await getMatchScorecard(id);
        if (fullScorecard) {
          score.full_scorecard = fullScorecard;
          score.match_awards = {};
          const batting = [fullScorecard.team_a, fullScorecard.team_b].flatMap((team) => team.scorecard.flatMap((inning) => inning.batting));
          const bowling = [fullScorecard.team_a, fullScorecard.team_b].flatMap((team) => team.scorecard.flatMap((inning) => inning.bowling));
          const findPlayer = (playerId, rows, detail) => {
            const player = rows.find((row) => String(row.player_id) === String(playerId));
            return player ? { name: player.name, ...(detail(player) ? { detail: detail(player) } : {}) } : undefined;
          };
          const bestBatter = findPlayer(match.bba_player_id, batting, (player) => `${player.runs} runs`);
          const bestBowler = findPlayer(match.bbo_player_id, bowling, (player) => `${player.wickets}/${player.runs}`);
          const playerOfMatch = findPlayer(match.pom_player_id, [...batting, ...bowling], () => "");
          if (playerOfMatch || bestBatter || bestBowler) score.match_awards = {
            ...(playerOfMatch ? { player_of_match: playerOfMatch } : {}),
            ...(bestBatter ? { best_batter: bestBatter } : {}),
            ...(bestBowler ? { best_bowler: bestBowler } : {}),
          };
        }
      } catch { /* Keep the compact live score; scorecard details can retry on the next sync. */ }
    }
    const resultText = match.match_summary?.summary ?? "";
    const winnerFromSummary = resultText.match(/^(.+?)\s+won\b/i)?.[1]?.trim();
    const sourceWinner = match.winning_team || winnerFromSummary;
    const aIsHome = normalizedTeamName(score.team_a) === normalizedTeamName(previous?.home_team);
    const bIsHome = normalizedTeamName(score.team_b) === normalizedTeamName(previous?.home_team);
    const homeSourceSide = aIsHome ? "team_a" : bIsHome ? "team_b" : null;
    const awaySourceSide = homeSourceSide === "team_a" ? "team_b" : homeSourceSide === "team_b" ? "team_a" : null;
    const homeScore = homeSourceSide ? scoreParts(homeSourceSide === "team_a" ? score.team_a_summary : score.team_b_summary) : null;
    const awayScore = awaySourceSide ? scoreParts(awaySourceSide === "team_a" ? score.team_a_summary : score.team_b_summary) : null;
    const homeInnings = homeSourceSide === "team_a" ? score.team_a_innings : score.team_b_innings;
    const awayInnings = awaySourceSide === "team_a" ? score.team_a_innings : score.team_b_innings;
    const homeOvers = homeInnings?.at(-1)?.overs_played;
    const awayOvers = awayInnings?.at(-1)?.overs_played;
    const synchronizedResult = score.status === "completed" && homeScore && awayScore && homeSourceSide;
    const winnerName = normalizedTeamName(sourceWinner);
    const homeWon = sourceWinner
      ? winnerName === normalizedTeamName(previous?.home_team) ? true
        : winnerName === normalizedTeamName(previous?.away_team) ? false : null
      : homeScore && awayScore && homeScore.runs !== awayScore.runs ? homeScore.runs > awayScore.runs : null;
    const winnerTeamId = homeWon === null ? null : homeWon ? previous?.home_team_id : previous?.away_team_id;
    const updated = await db.query(`update tournament_matches set cricheroes_status=$1,
      cricheroes_live_score=case when $2::jsonb ? 'full_scorecard' then $2::jsonb
        else $2::jsonb || jsonb_build_object('full_scorecard',cricheroes_live_score->'full_scorecard') end,
      cricheroes_stream_url=$3,
      status=case when $5 then 'completed' else status end,
      home_runs=case when $5 then $6 else home_runs end,
      home_wickets=case when $5 then $7 else home_wickets end,
      home_overs=case when $5 then $8 else home_overs end,
      away_runs=case when $5 then $9 else away_runs end,
      away_wickets=case when $5 then $10 else away_wickets end,
      away_overs=case when $5 then $11 else away_overs end,
      winner_team_id=case when $5 then $12 else winner_team_id end,
      result_text=case when $5 then nullif($13,'') else result_text end,
      cricheroes_synced_at=now(),updated_at=now()
      where cricheroes_match_id=$4`, [score.status, score, score.stream_url, id, Boolean(synchronizedResult),
      homeScore?.runs ?? null, homeScore?.wickets ?? null,
      oversAsDecimal(homeOvers, match.overs, homeScore?.wickets),
      awayScore?.runs ?? null, awayScore?.wickets ?? null,
      oversAsDecimal(awayOvers, match.overs, awayScore?.wickets),
      winnerTeamId ?? null, resultText]);
    synced += updated.rowCount || 0;
  }
  return { fetched: matches.length, synced, errors: errors.length };
}
