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

function streamUrl(match) {
  const candidates = [match.streaming_url, match.steaming_url, match.streaming_multiple_url,
    ...(Array.isArray(match.streaming_details) ? match.streaming_details.flatMap((item) => [item?.streaming_url, item?.url, item?.watch_url]) : [])];
  return candidates.find((value) => typeof value === "string" && /^https:\/\//i.test(value)) || null;
}

export async function syncCricHeroesMatches(db) {
  const sources = await Promise.allSettled([[1, 1], [2, 2], [3, 3]].map(([type, status]) => getMatches(type, status)));
  const errors = sources.filter((result) => result.status === "rejected");
  const matches = sources.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  if (!matches.length && errors.length === sources.length) throw errors[0].reason;

  let synced = 0;
  for (const match of matches) {
    const id = Number(match.match_id);
    if (!Number.isInteger(id)) continue;
    const score = {
      status: match.status || "unknown",
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
      match_start_time: match.match_start_time ?? match.start_datetime ?? null,
      match_end_time: match.match_end_time ?? null,
      is_watch_live: Boolean(match.is_watch_live),
      is_ticker: Boolean(match.is_ticker),
      is_enable_tournament_streaming: Boolean(match.is_enable_tournament_streaming),
      is_enable_match_streaming: Boolean(match.is_enable_match_streaming),
      stream_url: streamUrl(match),
      source_updated_at: match.last_updated_date ?? null,
    };
    const updated = await db.query(`update tournament_matches set cricheroes_status=$1,cricheroes_live_score=$2,
      cricheroes_stream_url=$3,cricheroes_synced_at=now(),updated_at=now()
      where cricheroes_match_id=$4`, [score.status, score, score.stream_url, id]);
    synced += updated.rowCount || 0;
  }
  return { fetched: matches.length, synced, errors: errors.length };
}
