import express from "express";
import cors from "cors";
import helmet from "helmet";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { runAction, saveActiveState } from "./actions.mjs";
import { runInstanceAction } from "./instance-actions.mjs";
import { normalizeAuctionState } from "./auction-units.mjs";
import { tournamentSnapshot, recordTournamentMatch } from "./tournament.mjs";

function originsFromEnv() {
  return (process.env.ALLOWED_ORIGINS || "http://localhost:4173,http://localhost:5173").split(",").map((v) => v.trim()).filter(Boolean);
}

export function createApp(pool, broadcast = () => {}, queueSync = async () => {}) {
  const app = express();
  const loginAttempts = new Map();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors({ origin(origin, done) { const allowed = originsFromEnv(); done(null, !origin || allowed.includes(origin)); } }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.get("/api/auction", async (_req, res, next) => {
    try {
      const [config, teams, players, events, auction] = await Promise.all([
        pool.query("select status,current_player_id,minimum_increment::float8 minimum_increment,increment_threshold::float8 increment_threshold,increment_above_threshold::float8 increment_above_threshold,default_base_price::float8 default_base_price,min_squad_size,max_squad_size,money_label from auction_config where id=1"),
        pool.query("select id,name,logo_url,purse::float8 purse,spent::float8 spent from auction_teams order by name"),
        pool.query("select id,name,role,photo,status,team_id,sold_price::float8 sold_price,current_bid::float8 current_bid,current_bid_team_id,base_price::float8 base_price from auction_players order by name"),
        pool.query("select id::float8 id,event_type,player_id,team_id,amount::float8 amount,created_at from auction_events order by id desc limit 12"),
        pool.query("select id,name,kind from auction_instances where active=true"),
      ]);
      res.set("Cache-Control", "no-store").json(normalizeAuctionState({ auction: auction.rows[0] || null, config: config.rows[0] || null, teams: teams.rows, players: players.rows, events: events.rows }));
    } catch (error) { next(error); }
  });

  app.get("/api/tournament", async (_req, res, next) => {
    try { res.set("Cache-Control", "no-store").json(await tournamentSnapshot(pool)); }
    catch (error) { next(error); }
  });

  app.post("/api/auction/view", async (req, res, next) => {
    try {
      const auctionId = String(req.body?.auctionId || "").trim();
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(auctionId)) return res.status(400).json({ error: "Invalid auction ID" });
      const { rows } = await pool.query("select id,name,kind,active,archived,state_data from auction_instances where id=$1", [auctionId]);
      const selected = rows[0];
      if (!selected || selected.archived) return res.status(404).json({ error: "Auction not found" });
      if (selected.active) {
        const [config, teams, players, events] = await Promise.all([
          pool.query("select status,current_player_id,minimum_increment::float8 minimum_increment,increment_threshold::float8 increment_threshold,increment_above_threshold::float8 increment_above_threshold,default_base_price::float8 default_base_price,min_squad_size,max_squad_size,money_label from auction_config where id=1"),
          pool.query("select id,name,logo_url,purse::float8 purse,spent::float8 spent from auction_teams order by name"),
          pool.query("select id,name,role,photo,status,team_id,sold_price::float8 sold_price,current_bid::float8 current_bid,current_bid_team_id,base_price::float8 base_price from auction_players order by name"),
          pool.query("select id::float8 id,event_type,player_id,team_id,amount::float8 amount,created_at from auction_events order by id desc limit 12"),
        ]);
        return res.set("Cache-Control", "no-store").json(normalizeAuctionState({ auction: { id: selected.id, name: selected.name, kind: selected.kind }, config: config.rows[0] || null, teams: teams.rows, players: players.rows, events: events.rows }));
      }
      const state = selected.state_data || {};
      const events = Array.isArray(state.events) ? [...state.events].reverse().slice(0, 12) : [];
      res.set("Cache-Control", "no-store").json(normalizeAuctionState({ auction: { id: selected.id, name: selected.name, kind: selected.kind }, config: state.config || null, teams: state.teams || [], players: state.players || [], events }));
    } catch (error) { next(error); }
  });

  app.get("/api/auction/bid-history", async (req, res, next) => {
    try {
      const playerId = String(req.query.playerId || "").trim();
      const auctionId = String(req.query.auctionId || "").trim();
      if (!playerId) return res.status(400).json({ error: "Choose a player to view their bid history" });
      let selected;
      if (auctionId) {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(auctionId)) return res.status(400).json({ error: "Invalid auction ID" });
        selected = (await pool.query("select id,name,kind,active,archived,state_data from auction_instances where id=$1 and archived=false", [auctionId])).rows[0];
      } else {
        selected = (await pool.query("select id,name,kind,active,archived,state_data from auction_instances where active=true limit 1")).rows[0];
      }
      if (!selected) return res.status(404).json({ error: "Auction not found" });
      if (selected.active) {
        const [config, teams, player, events] = await Promise.all([
          pool.query("select money_label from auction_config where id=1"),
          pool.query("select id,name from auction_teams order by name"),
          pool.query("select id,name,role from auction_players where id=$1", [playerId]),
          pool.query("select id::float8 id,event_type,player_id,team_id,amount::float8 amount,created_at from auction_events where player_id=$1 order by id", [playerId]),
        ]);
        if (!player.rows[0]) return res.status(404).json({ error: "Player not found in this auction" });
        return res.set("Cache-Control", "no-store").json({ auction: { id: selected.id, name: selected.name, kind: selected.kind }, player: player.rows[0], teams: teams.rows, money_label: config.rows[0]?.money_label ?? "CR", events: events.rows });
      }
      const data = selected.state_data || {};
      const player = (data.players || []).find((item) => item.id === playerId);
      if (!player) return res.status(404).json({ error: "Player not found in this auction" });
      const events = (data.events || []).map((event, index) => ({ ...event, id: event.id ?? index + 1 })).filter((event) => event.player_id === playerId);
      return res.set("Cache-Control", "no-store").json({ auction: { id: selected.id, name: selected.name, kind: selected.kind }, player: { id: player.id, name: player.name, role: player.role }, teams: data.teams || [], money_label: data.config?.money_label ?? "CR", events });
    } catch (error) { next(error); }
  });

  app.post("/api/auth/login", async (req, res, next) => {
    try {
      const key = req.ip || "unknown";
      const now = Date.now();
      const attempt = loginAttempts.get(key);
      if (attempt?.blockedUntil > now) return res.status(429).json({ error: "Too many sign-in attempts. Try again in 15 minutes." });
      const username = String(req.body?.username || req.body?.email || "").trim().toLowerCase();
      const { rows } = await pool.query("select id,email,password_hash from auction_admins where lower(email)=$1 and active=true", [username]);
      const admin = rows[0];
      if (!admin || !(await bcrypt.compare(String(req.body?.password || ""), admin.password_hash))) {
        const count = attempt?.firstAttempt > now - 15 * 60_000 ? attempt.count + 1 : 1;
        loginAttempts.set(key, { count, firstAttempt: count === 1 ? now : attempt.firstAttempt, blockedUntil: count >= 8 ? now + 15 * 60_000 : 0 });
        return res.status(401).json({ error: "Invalid username or password" });
      }
      loginAttempts.delete(key);
      const token = jwt.sign({ sub: String(admin.id), email: admin.email, role: "auction_admin" }, process.env.JWT_SECRET, { expiresIn: "18h", issuer: "phf-auction" });
      res.json({ token, user: { id: String(admin.id), email: admin.email } });
    } catch (error) { next(error); }
  });

  const fanAttempts = new Map();
  function fanRateLimit(req, res, scope) {
    const key = `${scope}:${req.ip || "unknown"}`;
    const now = Date.now();
    const previous = fanAttempts.get(key);
    if (previous?.blockedUntil > now) {
      res.status(429).json({ error: "Too many attempts. Try again in 15 minutes." });
      return false;
    }
    const nextAttempt = previous?.firstAttempt > now - 15 * 60_000
      ? { count: previous.count + 1, firstAttempt: previous.firstAttempt, blockedUntil: 0 }
      : { count: 1, firstAttempt: now, blockedUntil: 0 };
    if (nextAttempt.count >= 12) nextAttempt.blockedUntil = now + 15 * 60_000;
    fanAttempts.set(key, nextAttempt);
    return true;
  }
  function normalizeFanPhone(value) {
    let phone = String(value || "").trim().replace(/[\s().-]/g, "");
    if (/^\d{10}$/.test(phone)) phone = `+91${phone}`;
    else if (/^0\d{10}$/.test(phone)) phone = `+91${phone.slice(1)}`;
    else if (/^91\d{10}$/.test(phone)) phone = `+${phone}`;
    else if (/^\d{8,15}$/.test(phone)) phone = `+${phone}`;
    return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
  }
  function signFanToken(fan) {
    return jwt.sign({ sub: fan.id, role: "fan" }, process.env.JWT_SECRET, { expiresIn: "30d", issuer: "phf-fan" });
  }
  function fanAuth(req, res, next) {
    try {
      const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
      if (!token) return res.status(401).json({ error: "Sign in to save your picks." });
      const user = jwt.verify(token, process.env.JWT_SECRET, { issuer: "phf-fan" });
      if (user.role !== "fan") return res.status(401).json({ error: "Sign in to save your picks." });
      req.fan = { id: user.sub };
      next();
    } catch { res.status(401).json({ error: "Your fan session expired. Sign in again." }); }
  }
  function optionalFanId(req) {
    try {
      const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
      if (!token) return null;
      const user = jwt.verify(token, process.env.JWT_SECRET, { issuer: "phf-fan" });
      return user.role === "fan" ? user.sub : null;
    } catch { return null; }
  }

  app.post("/api/fan/register", async (req, res, next) => {
    try {
      if (!fanRateLimit(req, res, "register")) return;
      const name = String(req.body?.name || "").trim().replace(/\s+/g, " ");
      const phone = normalizeFanPhone(req.body?.phone);
      const password = String(req.body?.password || "");
      if (name.length < 2 || name.length > 40) return res.status(400).json({ error: "Name must be 2 to 40 characters." });
      if (!phone) return res.status(400).json({ error: "Enter a valid phone number with country code, or a 10-digit Indian number." });
      if (password.length < 10 || password.length > 128) return res.status(400).json({ error: "Choose a password between 10 and 128 characters." });
      const passwordHash = await bcrypt.hash(password, 12);
      const { rows } = await pool.query(
        "insert into fan_users(phone_e164,display_name,password_hash) values($1,$2,$3) returning id,display_name",
        [phone, name, passwordHash],
      );
      const fan = rows[0];
      res.status(201).json({ token: signFanToken(fan), fan });
    } catch (error) {
      if (error?.code === "23505") return res.status(409).json({ error: "An account already uses this phone number. Sign in instead." });
      next(error);
    }
  });

  app.post("/api/fan/login", async (req, res, next) => {
    try {
      if (!fanRateLimit(req, res, "login")) return;
      const phone = normalizeFanPhone(req.body?.phone);
      const { rows } = phone ? await pool.query("select id,display_name,password_hash from fan_users where phone_e164=$1 and active=true", [phone]) : { rows: [] };
      const fan = rows[0];
      if (!fan || !(await bcrypt.compare(String(req.body?.password || ""), fan.password_hash))) {
        return res.status(401).json({ error: "Phone number or password is incorrect." });
      }
      fanAttempts.delete(`login:${req.ip || "unknown"}`);
      const safeFan = { id: fan.id, display_name: fan.display_name };
      res.json({ token: signFanToken(fan), fan: safeFan });
    } catch (error) { next(error); }
  });

  app.get("/api/fan/me", fanAuth, async (req, res, next) => {
    try {
      const { rows } = await pool.query("select id,display_name from fan_users where id=$1 and active=true", [req.fan.id]);
      if (!rows[0]) return res.status(401).json({ error: "Fan account is unavailable. Sign in again." });
      res.set("Cache-Control", "no-store").json({ fan: rows[0] });
    } catch (error) { next(error); }
  });

  app.get("/api/fan/matches", async (req, res, next) => {
    try {
      const fanId = optionalFanId(req);
      const [matches, players] = await Promise.all([
        pool.query(`select m.id,m.match_number,m.match_date,m.match_time,m.status,m.winner_team_id,m.result_text,
          h.id home_team_id,h.name home_team,h.logo_url home_logo,a.id away_team_id,a.name away_team,a.logo_url away_logo,
          ((m.match_date + m.match_time::time) at time zone 'Asia/Kolkata') starts_at,
          case when m.status='scheduled' and ((m.match_date + m.match_time::time) at time zone 'Asia/Kolkata') > now() then true else false end can_pick,
          p.winner_team_id my_winner_team_id,p.top_scorer_player_id my_top_scorer_player_id,p.top_wicket_taker_player_id my_top_wicket_taker_player_id,
          p.player_spotlight_player_id my_spotlight_player_id,p.innings_score_band my_score_band,
          (power.match_id is not null) is_power_pick,pm.choice my_moment_vote,
          coalesce(v.home_votes,0)::int home_votes,coalesce(v.away_votes,0)::int away_votes,
          coalesce(v.scorer_votes,0)::int scorer_votes,coalesce(v.wicket_votes,0)::int wicket_votes,
          coalesce(moment.batting_votes,0)::int batting_votes,coalesce(moment.bowling_votes,0)::int bowling_votes,
          coalesce(moment.fielding_votes,0)::int fielding_votes
          from tournament_matches m join auction_teams h on h.id=m.home_team_id join auction_teams a on a.id=m.away_team_id
          left join fan_match_picks p on p.match_id=m.id and p.fan_id=$1
          left join fan_matchday_power_picks power on power.match_id=m.id and power.fan_id=$1
          left join fan_match_moment_votes pm on pm.match_id=m.id and pm.fan_id=$1
          left join lateral (select count(*) filter(where winner_team_id=m.home_team_id) home_votes,
            count(*) filter(where winner_team_id=m.away_team_id) away_votes,
            count(top_scorer_player_id) scorer_votes,count(top_wicket_taker_player_id) wicket_votes
            from fan_match_picks where match_id=m.id) v on true
          left join lateral (select count(*) filter(where choice='batting') batting_votes,
            count(*) filter(where choice='bowling') bowling_votes,count(*) filter(where choice='fielding') fielding_votes
            from fan_match_moment_votes where match_id=m.id) moment on true
          order by m.match_number`, [fanId]),
        pool.query("select id,name,role,photo,team_id,status from auction_players where status in ('sold','captain') order by name"),
      ]);
      const roster = new Map();
      for (const player of players.rows) {
        if (!roster.has(player.team_id)) roster.set(player.team_id, []);
        roster.get(player.team_id).push(player);
      }
      const data = matches.rows.map((match) => {
        const homeVotes = Number(match.home_votes);
        const awayVotes = Number(match.away_votes);
        const reveal = Boolean(fanId && match.my_winner_team_id) || !match.can_pick;
        const revealMoment = Boolean(fanId && match.my_moment_vote) || !match.can_pick;
        return {
          ...match,
          home_players: roster.get(match.home_team_id) || [],
          away_players: roster.get(match.away_team_id) || [],
          my_pick: match.my_winner_team_id ? { winner_team_id: match.my_winner_team_id, top_scorer_player_id: match.my_top_scorer_player_id, top_wicket_taker_player_id: match.my_top_wicket_taker_player_id, player_spotlight_player_id: match.my_spotlight_player_id, innings_score_band: match.my_score_band } : null,
          is_power_pick: Boolean(match.is_power_pick),
          community: reveal ? { home_votes: homeVotes, away_votes: awayVotes, total: homeVotes + awayVotes, home_percent: homeVotes + awayVotes ? Math.round(homeVotes * 100 / (homeVotes + awayVotes)) : 0, away_percent: homeVotes + awayVotes ? Math.round(awayVotes * 100 / (homeVotes + awayVotes)) : 0 } : null,
          moment_poll: { batting: revealMoment ? Number(match.batting_votes) : null, bowling: revealMoment ? Number(match.bowling_votes) : null, fielding: revealMoment ? Number(match.fielding_votes) : null, my_vote: match.my_moment_vote || null },
          home_votes: undefined, away_votes: undefined, scorer_votes: undefined, wicket_votes: undefined,
          my_winner_team_id: undefined, my_top_scorer_player_id: undefined, my_top_wicket_taker_player_id: undefined, my_spotlight_player_id: undefined, my_score_band: undefined, my_moment_vote: undefined,
          batting_votes: undefined, bowling_votes: undefined, fielding_votes: undefined,
        };
      });
      res.set("Cache-Control", "no-store").json({ matches: data });
    } catch (error) { next(error); }
  });

  app.post("/api/fan/matches/:matchNumber/picks", fanAuth, async (req, res, next) => {
    try {
      const matchNumber = Number(req.params.matchNumber);
      const { winner_team_id: winnerTeamId, top_scorer_player_id: scorerId = null, top_wicket_taker_player_id: bowlerId = null,
        player_spotlight_player_id: spotlightId = null, innings_score_band: scoreBand = null } = req.body || {};
      if (!Number.isInteger(matchNumber) || matchNumber < 1 || matchNumber > 15) return res.status(400).json({ error: "Choose a valid Season 5 match." });
      const { rows: matchRows } = await pool.query(`select id,home_team_id,away_team_id,status,
        ((match_date + match_time::time) at time zone 'Asia/Kolkata') starts_at from tournament_matches where match_number=$1`, [matchNumber]);
      const match = matchRows[0];
      if (!match) return res.status(404).json({ error: "Match not found." });
      if (match.status !== "scheduled" || new Date(match.starts_at).getTime() <= Date.now()) return res.status(409).json({ error: "Picks are closed for this match." });
      if (![match.home_team_id, match.away_team_id].includes(winnerTeamId)) return res.status(400).json({ error: "Choose one of the two teams in this match." });
      for (const [playerId, label] of [[scorerId, "top run-scorer"], [bowlerId, "top wicket-taker"]]) {
        if (playerId === null) continue;
        const { rows } = await pool.query("select id from auction_players where id=$1 and team_id=any($2::uuid[]) and status in ('sold','captain')", [playerId, [match.home_team_id, match.away_team_id]]);
        if (!rows[0]) return res.status(400).json({ error: `Choose a listed match player for ${label}.` });
      }
      if (spotlightId !== null) {
        const { rows } = await pool.query("select id from auction_players where id=$1 and team_id=any($2::uuid[]) and status in ('sold','captain')", [spotlightId, [match.home_team_id, match.away_team_id]]);
        if (!rows[0]) return res.status(400).json({ error: "Choose a listed player from this match for Player to Watch." });
      }
      const scoreBands = ["under_120", "120_149", "150_179", "180_209", "210_plus"];
      if (scoreBand !== null && !scoreBands.includes(scoreBand)) return res.status(400).json({ error: "Choose a valid first-innings score range." });
      const { rows } = await pool.query(`insert into fan_match_picks(fan_id,match_id,winner_team_id,top_scorer_player_id,top_wicket_taker_player_id,player_spotlight_player_id,innings_score_band)
        values($1,$2,$3,$4,$5,$6,$7) on conflict(fan_id,match_id) do update set winner_team_id=excluded.winner_team_id,
        top_scorer_player_id=excluded.top_scorer_player_id,top_wicket_taker_player_id=excluded.top_wicket_taker_player_id,
        player_spotlight_player_id=excluded.player_spotlight_player_id,innings_score_band=excluded.innings_score_band,updated_at=now()
        returning winner_team_id,top_scorer_player_id,top_wicket_taker_player_id,player_spotlight_player_id,innings_score_band,updated_at`, [req.fan.id, match.id, winnerTeamId, scorerId, bowlerId, spotlightId, scoreBand]);
      res.set("Cache-Control", "no-store").json({ pick: rows[0] });
    } catch (error) { next(error); }
  });

  app.post("/api/fan/matches/:matchNumber/moment-poll", fanAuth, async (req, res, next) => {
    try {
      const matchNumber = Number(req.params.matchNumber);
      const choice = String(req.body?.choice || "");
      if (!Number.isInteger(matchNumber) || matchNumber < 1 || matchNumber > 15) return res.status(400).json({ error: "Choose a valid Season 5 match." });
      if (!["batting", "bowling", "fielding"].includes(choice)) return res.status(400).json({ error: "Choose batting, bowling, or fielding." });
      const { rows: matches } = await pool.query(`select id,status,((match_date + match_time::time) at time zone 'Asia/Kolkata') starts_at from tournament_matches where match_number=$1`, [matchNumber]);
      const match = matches[0];
      if (!match) return res.status(404).json({ error: "Match not found." });
      if (match.status !== "scheduled" || new Date(match.starts_at).getTime() <= Date.now()) return res.status(409).json({ error: "This match poll is closed." });
      const { rows } = await pool.query(`insert into fan_match_moment_votes(fan_id,match_id,choice) values($1,$2,$3)
        on conflict(fan_id,match_id) do update set choice=excluded.choice,updated_at=now() returning choice`, [req.fan.id, match.id, choice]);
      res.set("Cache-Control", "no-store").json({ vote: rows[0] });
    } catch (error) { next(error); }
  });

  app.post("/api/fan/matches/:matchNumber/power-pick", fanAuth, async (req, res, next) => {
    try {
      const matchNumber = Number(req.params.matchNumber);
      if (!Number.isInteger(matchNumber) || matchNumber < 1 || matchNumber > 15) return res.status(400).json({ error: "Choose a valid Season 5 match." });
      const { rows: matches } = await pool.query(`select id,match_date,status,((match_date + match_time::time) at time zone 'Asia/Kolkata') starts_at from tournament_matches where match_number=$1`, [matchNumber]);
      const match = matches[0];
      if (!match) return res.status(404).json({ error: "Match not found." });
      if (match.status !== "scheduled" || new Date(match.starts_at).getTime() <= Date.now()) return res.status(409).json({ error: "Power picks close when the match starts." });
      const hasSavedPick = (await pool.query("select 1 from fan_match_picks where fan_id=$1 and match_id=$2", [req.fan.id, match.id])).rows[0];
      if (!hasSavedPick) return res.status(409).json({ error: "Save a match prediction before choosing your power pick." });
      const current = (await pool.query(`select p.match_id,m.status,((m.match_date + m.match_time::time) at time zone 'Asia/Kolkata') starts_at
        from fan_matchday_power_picks p join tournament_matches m on m.id=p.match_id where p.fan_id=$1 and p.match_date=$2`, [req.fan.id, match.match_date])).rows[0];
      if (current && current.match_id !== match.id && (current.status !== "scheduled" || new Date(current.starts_at).getTime() <= Date.now())) {
        return res.status(409).json({ error: "Your power pick for this matchday is already locked." });
      }
      const { rows } = await pool.query(`insert into fan_matchday_power_picks(fan_id,match_date,match_id) values($1,$2,$3)
        on conflict(fan_id,match_date) do update set match_id=excluded.match_id,created_at=now() returning match_id`, [req.fan.id, match.match_date, match.id]);
      res.set("Cache-Control", "no-store").json({ power_pick: rows[0] });
    } catch (error) { next(error); }
  });

  app.get("/api/fan/leaderboard", async (_req, res, next) => {
    try {
      const { rows } = await pool.query(`with picks as (
          select p.fan_id,count(*)::int match_entries,
            count(*) filter(where m.status='completed')::int completed_entries,
            count(*) filter(where m.status='completed' and p.winner_team_id=m.winner_team_id)::int points,
            count(*) filter(where p.top_scorer_player_id is not null and p.top_wicket_taker_player_id is not null)::int complete_entries,
            count(p.player_spotlight_player_id)::int spotlight_entries,
            count(p.innings_score_band)::int score_band_entries,
            sum(2 + case when p.top_scorer_player_id is not null then 1 else 0 end
              + case when p.top_wicket_taker_player_id is not null then 1 else 0 end
              + case when p.top_scorer_player_id is not null and p.top_wicket_taker_player_id is not null then 1 else 0 end
              + case when p.player_spotlight_player_id is not null then 1 else 0 end
              + case when p.innings_score_band is not null then 1 else 0 end)::int base_score
          from fan_match_picks p join tournament_matches m on m.id=p.match_id group by p.fan_id
        ), matchdays as (
          select match_date,count(*)::int fixture_count,row_number() over(order by match_date)::int day_number,
            bool_and(status='completed') all_completed
          from tournament_matches group by match_date
        ), fan_matchdays as (
          select f.id fan_id,d.match_date,d.day_number,d.fixture_count,d.all_completed,count(distinct p.match_id)::int picked_count
          from fan_users f cross join matchdays d join tournament_matches m on m.match_date=d.match_date
          left join fan_match_picks p on p.fan_id=f.id and p.match_id=m.id
          group by f.id,d.match_date,d.day_number,d.fixture_count,d.all_completed
        ), sweep_stats as (
          select fan_id,count(*) filter(where picked_count=fixture_count)::int sweep_count
          from fan_matchdays group by fan_id
        ), sweep_streaks as (
          select distinct a.fan_id from fan_matchdays a
          join fan_matchdays b on b.fan_id=a.fan_id and b.day_number=a.day_number+1
          join fan_matchdays c on c.fan_id=b.fan_id and c.day_number=b.day_number+1
          where a.picked_count=a.fixture_count and b.picked_count=b.fixture_count and c.picked_count=c.fixture_count
        ), poll_activity as (
          select fan_id,count(*)::int moment_votes from fan_match_moment_votes group by fan_id
        ), power_activity as (
          select fan_id,count(*)::int power_picks from fan_matchday_power_picks group by fan_id
        ), comeback_activity as (
          select distinct current.fan_id from fan_matchdays current
          where current.picked_count>0 and exists (
            select 1 from fan_matchdays previous
            where previous.fan_id=current.fan_id and previous.match_date<current.match_date and previous.picked_count>0
              and exists (select 1 from fan_matchdays missed where missed.fan_id=current.fan_id
                and missed.match_date>previous.match_date and missed.match_date<current.match_date
                and missed.picked_count=0 and missed.all_completed=true)
          )
        ), public_fans as (
          select f.id,f.display_name,coalesce(p.points,0)::int points,
            (coalesce(p.base_score,0)+coalesce(poll.moment_votes,0)+coalesce(power.power_picks,0)
              +2*coalesce(sweep.sweep_count,0)+case when streak.fan_id is not null then 2 else 0 end)::int engagement_score,
            coalesce(p.match_entries,0)::int match_entries,
            coalesce(p.complete_entries,0)::int complete_entries,
            coalesce(p.spotlight_entries,0)::int spotlight_entries,coalesce(p.score_band_entries,0)::int score_band_entries,
            coalesce(sweep.sweep_count,0)::int matchday_sweeps,case when streak.fan_id is not null then 3 else 0 end::int longest_sweep_streak,
            coalesce(power.power_picks,0)::int power_picks,coalesce(poll.moment_votes,0)::int moment_votes,
            case when coalesce(p.completed_entries,0)>0 then round(100.0*coalesce(p.points,0)/p.completed_entries)::int else 0 end accuracy_percent,
            array_remove(array[
              case when coalesce(p.match_entries,0)>=5 then '5 Match Picks' end,
              case when coalesce(p.match_entries,0)>=10 then '10 Match Picks' end,
              case when coalesce(p.match_entries,0)>=15 then 'Season Finisher' end,
              case when coalesce(sweep.sweep_count,0)>0 then 'Matchday Sweep' end,
              case when streak.fan_id is not null then '3 Matchday Streak' end,
              case when comeback.fan_id is not null then 'Comeback Fan' end
            ],null)::text[] badges
          from fan_users f left join picks p on p.fan_id=f.id
          left join sweep_stats sweep on sweep.fan_id=f.id
          left join sweep_streaks streak on streak.fan_id=f.id
          left join power_activity power on power.fan_id=f.id
          left join poll_activity poll on poll.fan_id=f.id
          left join comeback_activity comeback on comeback.fan_id=f.id
          where f.active=true
        ), ranked as (
          select public_fans.*,
            row_number() over(order by engagement_score desc,match_entries desc,complete_entries desc,points desc,display_name asc) engagement_rank,
            row_number() over(order by points desc,accuracy_percent desc,engagement_score desc,display_name asc) points_rank
          from public_fans
        )
        select id,display_name,points,engagement_score,match_entries,complete_entries,accuracy_percent,
          spotlight_entries,score_band_entries,matchday_sweeps,longest_sweep_streak,power_picks,moment_votes,badges
        from ranked where engagement_rank<=50 or points_rank<=50
        order by points_rank,engagement_rank`);
      res.set("Cache-Control", "no-store").json({ leaderboard: rows });
    } catch (error) { next(error); }
  });

  function authenticate(req, res, next) {
    try {
      const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
      if (!token) return res.status(401).json({ error: "Auctioneer sign-in required" });
      req.user = jwt.verify(token, process.env.JWT_SECRET, { issuer: "phf-auction" }); next();
    } catch { res.status(401).json({ error: "Your session has expired. Sign in again." }); }
  }
  app.get("/api/auth/me", authenticate, (req, res) => res.json({ user: { id: req.user.sub, email: req.user.email }, admin: req.user.role === "auction_admin" }));
  app.get("/api/sync/status", async (_req, res, next) => {
    try {
      const [pending, status] = await Promise.all([
        pool.query("select count(*)::int count from auction_sync_outbox"),
        pool.query("select last_success_at,last_error,updated_at from auction_sync_status where id=1"),
      ]);
      res.set("Cache-Control", "no-store").json({
        localHub: Boolean(process.env.CLOUD_SYNC_URL),
        pending: pending.rows[0]?.count || 0,
        lastSuccessAt: status.rows[0]?.last_success_at || null,
        lastError: status.rows[0]?.last_error || null,
      });
    } catch (error) { next(error); }
  });
  app.post("/api/sync/auction", async (req, res, next) => {
    try {
      if (!process.env.SYNC_SECRET || req.headers["x-auction-sync-secret"] !== process.env.SYNC_SECRET) {
        return res.status(401).json({ error: "Auction synchronization is not authorized" });
      }
      const payload = req.body?.payload;
      const auction = payload?.auction;
      if (!auction?.id || !payload?.state_data) return res.status(400).json({ error: "Invalid synchronization payload" });
      await pool.query(`insert into auction_instances(id,name,kind,state_data,active,archived,updated_at)
        values($1,$2,$3,$4,false,false,now())
        on conflict(id) do update set name=excluded.name,kind=excluded.kind,state_data=excluded.state_data,
          active=false,archived=false,updated_at=now()`,
        [auction.id, auction.name, auction.kind === "demo" ? "demo" : "official", payload.state_data]);
      broadcast({ type: "auction_updated", auctionId: auction.id });
      res.json({ ok: true });
    } catch (error) { next(error); }
  });
  app.get("/api/admin/auctions", authenticate, async (_req, res, next) => {
    try {
      const { rows } = await pool.query(`select i.id,i.name,i.kind,i.active,i.archived,i.created_at,i.updated_at,
        case when i.active then c.status else coalesce(i.state_data->'config'->>'status','preparing') end status,
        case when i.active then (select count(*)::int from auction_players) else coalesce(jsonb_array_length(i.state_data->'players'),0) end player_count
        from auction_instances i cross join auction_config c where c.id=1 order by i.archived,i.active desc,i.created_at desc`);
      res.set("Cache-Control", "no-store").json({ auctions: rows });
    } catch (error) { next(error); }
  });
  app.post("/api/admin/action", authenticate, async (req, res, next) => {
    const db = await pool.connect();
    try {
      await db.query("begin");
      const auctionId = String(req.body?.auctionId || "").trim();
      const active = auctionId
        ? (await db.query("select active from auction_instances where id=$1", [auctionId])).rows[0]?.active === true
        : true;
      let data;
      let syncAuctionId = auctionId;
      if (String(req.body?.name || "") === "tournament_record_match") {
        if (auctionId && !active) throw new Error("Tournament results can only be recorded on the active official ledger");
        data = await recordTournamentMatch(db, Number(req.user.sub), req.body?.args || {});
        syncAuctionId = null;
      } else if (auctionId && !active) {
        data = await runInstanceAction(db, Number(req.user.sub), auctionId, String(req.body?.name || ""), req.body?.args || {});
      } else {
        data = await runAction(db, Number(req.user.sub), String(req.body?.name || ""), req.body?.args || {});
        syncAuctionId = await saveActiveState(db) || auctionId;
      }
      await db.query("commit");
      if (syncAuctionId) void queueSync(syncAuctionId).catch((error) => console.error("Could not queue cloud synchronization", error));
      broadcast({ type: "auction_updated", auctionId: syncAuctionId || null }); res.json({ data });
    } catch (error) { await db.query("rollback"); next(error); }
    finally { db.release(); }
  });

  app.use((error, _req, res, next) => {
    void next;
    console.error(error);
    const expected = error instanceof Error && !/password|secret|token/i.test(error.message);
    res.status(400).json({ error: expected ? error.message : "The request could not be completed" });
  });
  return app;
}
