const round2 = (value) => Math.round(Number(value) * 100) / 100;

function normalizedPlayerName(value) {
  return String(value ?? "").toLowerCase().replace(/[†‡]/g, "").replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizedTeamName(value) {
  return normalizedPlayerName(value).replace(/\b(phf|the|prestige)\b/g, " ").replace(/\s+/g, " ").trim();
}

function numeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cricketOvers(value) {
  const match = String(value ?? "").match(/^(\d+)(?:\.(\d+))?/);
  if (!match) return 0;
  const balls = Number(match[2] ?? 0);
  return balls <= 5 ? Number(match[1]) + balls / 6 : 0;
}

function seasonPlayerStats(matches, teams) {
  const teamNames = new Map(teams.map((team) => [String(team.id), team.name]));
  const nameToTeam = new Map(teams.map((team) => [normalizedTeamName(team.name), String(team.id)]));
  const players = new Map();

  for (const match of matches) {
    if (match.status !== "completed") continue;
    const seenThisMatch = new Set();
    const addPlayer = (name, teamId, figures = {}) => {
      const cleanName = String(name ?? "").replace(/[†‡]/g, "").replace(/\s*\([^)]*\)\s*/g, " ").trim();
      const normalized = normalizedPlayerName(cleanName);
      if (!normalized) return null;
      const resolvedTeamId = teamId == null ? null : String(teamId);
      const key = `${resolvedTeamId ?? "unknown"}:${normalized}`;
      let player = players.get(key);
      if (!player) {
        player = { player_id: `season:${key}`, name: cleanName, role: "", photo: null, team_id: resolvedTeamId,
          team_name: resolvedTeamId ? teamNames.get(resolvedTeamId) ?? null : null,
          matches: 0, runs: 0, balls: 0, wickets: 0, runs_conceded: 0, overs: 0, catches: 0, potm_count: 0 };
        players.set(key, player);
      }
      if (!seenThisMatch.has(key)) {
        player.matches += 1;
        seenThisMatch.add(key);
      }
      player.runs += numeric(figures.runs);
      player.balls += numeric(figures.balls);
      player.wickets += numeric(figures.wickets);
      player.runs_conceded += numeric(figures.runs_conceded);
      player.overs += numeric(figures.overs);
      player.catches += numeric(figures.catches);
      player.potm_count += numeric(figures.potm_count);
      return player;
    };

    const live = match.cricheroes_live_score ?? {};
    const card = live.full_scorecard;
    if (card?.team_a?.scorecard || card?.team_b?.scorecard) {
      for (const [side, opposingSide] of [["team_a", "team_b"], ["team_b", "team_a"]]) {
        const teamCard = card[side];
        const teamId = nameToTeam.get(normalizedTeamName(teamCard?.name));
        const opposingTeamId = nameToTeam.get(normalizedTeamName(card[opposingSide]?.name));
        const innings = (teamCard?.scorecard ?? []).filter((inning) => Number(inning.inning) <= 2);
        for (const inning of innings) {
          for (const batter of inning.batting ?? []) {
            addPlayer(batter.name, teamId, { runs: batter.runs, balls: batter.balls });
            const dismissal = String(batter.dismissal ?? "");
            const caught = dismissal.match(/\bc\s+†?(.+?)\s+b\s+/i);
            const caughtAndBowled = dismissal.match(/\bc\s*&\s*b\s+(.+)$/i);
            const fielder = caught?.[1]?.trim() ?? caughtAndBowled?.[1]?.trim();
            if (fielder) addPlayer(fielder, opposingTeamId, { catches: 1 });
          }
          for (const bowler of inning.bowling ?? []) {
            addPlayer(bowler.name, opposingTeamId, { wickets: bowler.wickets, runs_conceded: bowler.runs, overs: cricketOvers(bowler.overs) });
          }
        }

      }
      const awardName = live.match_awards?.player_of_match?.name;
      const awardKey = normalizedPlayerName(awardName);
      if (awardKey) {
        const awardee = [...players.values()].find((player) => normalizedPlayerName(player.name) === awardKey);
        if (awardee) awardee.potm_count += 1;
        else addPlayer(awardName, null, { potm_count: 1 });
      }
      continue;
    }

    for (const player of match.player_scorecard ?? []) {
      addPlayer(player.player_name, player.team_id, { runs: player.runs, balls: player.balls, wickets: player.wickets,
        runs_conceded: player.runs_conceded, overs: player.overs, catches: player.catches, potm_count: player.potm ? 1 : 0 });
    }
  }

  return [...players.values()].sort((a, b) => b.runs - a.runs || b.wickets - a.wickets || a.name.localeCompare(b.name));
}

export async function tournamentSnapshot(db) {
  const [matches, teams] = await Promise.all([
    db.query(`select m.id,m.match_number,m.match_date,m.match_time,m.report_time,m.venue,m.status,m.stream_url,
      m.cricheroes_match_id,m.cricheroes_match_url,m.cricheroes_status,m.cricheroes_live_score,m.cricheroes_stream_url,m.cricheroes_synced_at,
      m.home_team_id,m.away_team_id,m.home_runs,m.home_wickets,m.home_overs,
      m.away_runs,m.away_wickets,m.away_overs,m.winner_team_id,m.result_text,m.player_scorecard,
      ht.name home_team,at.name away_team,wt.name winner_team
      from tournament_matches m
      join auction_teams ht on ht.id=m.home_team_id
      join auction_teams at on at.id=m.away_team_id
      left join auction_teams wt on wt.id=m.winner_team_id
      order by m.match_number`),
    db.query("select id,name,logo_url from auction_teams order by name"),
  ]);

  const completed = matches.rows.filter((match) => match.status === "completed");
  const standings = teams.rows.map((team) => {
    const played = completed.filter((match) => match.home_team_id === team.id || match.away_team_id === team.id);
    const wins = played.filter((match) => match.winner_team_id === team.id).length;
    const losses = played.filter((match) => match.winner_team_id && match.winner_team_id !== team.id).length;
    const runsFor = played.reduce((sum, match) => sum + (match.home_team_id === team.id ? Number(match.home_runs || 0) : Number(match.away_runs || 0)), 0);
    const runsAgainst = played.reduce((sum, match) => sum + (match.home_team_id === team.id ? Number(match.away_runs || 0) : Number(match.home_runs || 0)), 0);
    const oversFor = played.reduce((sum, match) => sum + (match.home_team_id === team.id ? Number(match.home_overs || 0) : Number(match.away_overs || 0)), 0);
    const oversAgainst = played.reduce((sum, match) => sum + (match.home_team_id === team.id ? Number(match.away_overs || 0) : Number(match.home_overs || 0)), 0);
    const nrr = oversFor && oversAgainst ? round2(runsFor / oversFor - runsAgainst / oversAgainst) : 0;
    return { team_id: team.id, team_name: team.name, played: played.length, wins, losses, points: wins * 2, runs_for: runsFor, runs_against: runsAgainst, nrr };
  }).sort((a, b) => b.points - a.points || b.nrr - a.nrr || b.wins - a.wins || a.team_name.localeCompare(b.team_name));

  return { matches: matches.rows, standings, player_stats: seasonPlayerStats(matches.rows, teams.rows) };
}

export async function recordTournamentMatch(db, actorId, payload = {}) {
  const matchId = Number(payload.p_match_id);
  const homeRuns = Number(payload.p_home_runs);
  const awayRuns = Number(payload.p_away_runs);
  const homeWickets = Number(payload.p_home_wickets ?? 0);
  const awayWickets = Number(payload.p_away_wickets ?? 0);
  const homeOvers = Number(payload.p_home_overs);
  const awayOvers = Number(payload.p_away_overs);
  if (!Number.isInteger(matchId) || matchId < 1) throw new Error("Choose a scheduled match");
  if (![homeRuns, awayRuns, homeOvers, awayOvers].every(Number.isFinite) || homeRuns < 0 || awayRuns < 0 || homeOvers <= 0 || awayOvers <= 0) throw new Error("Enter valid scores and overs");
  if (![homeWickets, awayWickets].every(Number.isInteger) || homeWickets < 0 || homeWickets > 10 || awayWickets < 0 || awayWickets > 10) throw new Error("Wickets must be between 0 and 10");

  const match = (await db.query("select * from tournament_matches where id=$1 for update", [matchId])).rows[0];
  if (!match) throw new Error("Match not found");
  if (match.status === "completed") throw new Error("This match is already recorded; use the correction workflow before changing it");
  if (homeRuns === awayRuns) throw new Error("A tied result needs a declared winner or a future super-over field");
  const winner = homeRuns > awayRuns ? match.home_team_id : match.away_team_id;
  const resultText = String(payload.p_result_text || `${homeRuns > awayRuns ? "Home team" : "Away team"} won`).trim().slice(0, 240);
  await db.query(`update tournament_matches set status='completed',home_runs=$1,home_wickets=$2,home_overs=$3,
    away_runs=$4,away_wickets=$5,away_overs=$6,winner_team_id=$7,result_text=$8,updated_at=now() where id=$9`,
    [homeRuns, homeWickets, homeOvers, awayRuns, awayWickets, awayOvers, winner, resultText, matchId]);

  const stats = Array.isArray(payload.p_player_stats) ? payload.p_player_stats : [];
  const seenPlayers = new Set();
  const scorecard = [];
  for (const item of stats) {
    const playerId = String(item.player_id || "").trim();
    if (!playerId) continue;
    if (seenPlayers.has(playerId)) throw new Error(`Player ${playerId} appears more than once in the scorecard`);
    seenPlayers.add(playerId);
    const player = (await db.query("select name,role,team_id from auction_players where id=$1", [playerId])).rows[0];
    if (!player || ![match.home_team_id, match.away_team_id].includes(player.team_id)) throw new Error(`Player ${playerId} is not in this match`);
    const values = [Number(item.runs || 0), Number(item.balls || 0), Number(item.wickets || 0), Number(item.runs_conceded || 0), Number(item.overs || 0), Number(item.catches || 0), item.potm ? 1 : 0];
    if (!values.every(Number.isFinite) || values.some((value) => value < 0)) throw new Error("Player statistics must be non-negative numbers");
    scorecard.push({ player_id: playerId, player_name: player.name, role: player.role, team_id: player.team_id,
      runs: values[0], balls: values[1], wickets: values[2], runs_conceded: values[3], overs: values[4], catches: values[5], potm: Boolean(item.potm) });
    await db.query(`insert into tournament_player_stats(player_id,matches,runs,balls,wickets,runs_conceded,overs,catches,potm_count)
      values($1,1,$2,$3,$4,$5,$6,$7,$8,$9)
      on conflict(player_id) do update set matches=tournament_player_stats.matches+1,runs=tournament_player_stats.runs+excluded.runs,
      balls=tournament_player_stats.balls+excluded.balls,wickets=tournament_player_stats.wickets+excluded.wickets,
      runs_conceded=tournament_player_stats.runs_conceded+excluded.runs_conceded,overs=tournament_player_stats.overs+excluded.overs,
      catches=tournament_player_stats.catches+excluded.catches,potm_count=tournament_player_stats.potm_count+excluded.potm_count,updated_at=now()`, [playerId, ...values]);
  }
  await db.query("update tournament_matches set player_scorecard=$1,updated_at=now() where id=$2", [JSON.stringify(scorecard), matchId]);
  await db.query("insert into auction_audit(actor_id,action,details) values($1,$2,$3)", [actorId, "tournament_record_match", { match_id: matchId, stats_count: stats.length }]);
  return { match_id: matchId, winner_team_id: winner };
}
