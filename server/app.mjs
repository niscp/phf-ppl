import express from "express";
import cors from "cors";
import helmet from "helmet";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { runAction } from "./actions.mjs";
import { runInstanceAction } from "./instance-actions.mjs";
import { normalizeAuctionState } from "./auction-units.mjs";

function originsFromEnv() {
  return (process.env.ALLOWED_ORIGINS || "http://localhost:4173,http://localhost:5173").split(",").map((v) => v.trim()).filter(Boolean);
}

export function createApp(pool, broadcast = () => {}, queueSync = async () => {}) {
  const app = express();
  app.disable("x-powered-by");
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

  app.post("/api/auth/login", async (req, res, next) => {
    try {
      const username = String(req.body?.username || req.body?.email || "").trim().toLowerCase();
      const { rows } = await pool.query("select id,email,password_hash from auction_admins where lower(email)=$1 and active=true", [username]);
      const admin = rows[0];
      if (!admin || !(await bcrypt.compare(String(req.body?.password || ""), admin.password_hash))) return res.status(401).json({ error: "Invalid username or password" });
      const token = jwt.sign({ sub: String(admin.id), email: admin.email, role: "auction_admin" }, process.env.JWT_SECRET, { expiresIn: "12h", issuer: "phf-auction" });
      res.json({ token, user: { id: String(admin.id), email: admin.email } });
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
      const data = auctionId && !active
        ? await runInstanceAction(db, Number(req.user.sub), auctionId, String(req.body?.name || ""), req.body?.args || {})
        : await runAction(db, Number(req.user.sub), String(req.body?.name || ""), req.body?.args || {});
      await db.query("commit");
      if (auctionId) void queueSync(auctionId).catch((error) => console.error("Could not queue cloud synchronization", error));
      broadcast({ type: "auction_updated" }); res.json({ data });
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
