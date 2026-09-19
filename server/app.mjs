import express from "express";
import cors from "cors";
import helmet from "helmet";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { runAction } from "./actions.mjs";

function originsFromEnv() {
  return (process.env.ALLOWED_ORIGINS || "http://localhost:4173,http://localhost:5173").split(",").map((v) => v.trim()).filter(Boolean);
}

export function createApp(pool, broadcast = () => {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors({ origin(origin, done) { const allowed = originsFromEnv(); done(null, !origin || allowed.includes(origin)); } }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.get("/api/auction", async (_req, res, next) => {
    try {
      const [config, teams, players, events] = await Promise.all([
        pool.query("select status,current_player_id,minimum_increment,default_base_price,min_squad_size,max_squad_size,money_label from auction_config where id=1"),
        pool.query("select id,name,logo_url,purse::float8 purse,spent::float8 spent from auction_teams order by name"),
        pool.query("select id,name,role,photo,status,team_id,sold_price::float8 sold_price,current_bid::float8 current_bid,current_bid_team_id,base_price::float8 base_price from auction_players order by name"),
        pool.query("select id::float8 id,event_type,player_id,team_id,amount::float8 amount,created_at from auction_events order by id desc limit 12"),
      ]);
      res.set("Cache-Control", "no-store").json({ config: config.rows[0] || null, teams: teams.rows, players: players.rows, events: events.rows });
    } catch (error) { next(error); }
  });

  app.post("/api/auth/login", async (req, res, next) => {
    try {
      const email = String(req.body?.email || "").trim().toLowerCase();
      const { rows } = await pool.query("select id,email,password_hash from auction_admins where lower(email)=$1 and active=true", [email]);
      const admin = rows[0];
      if (!admin || !(await bcrypt.compare(String(req.body?.password || ""), admin.password_hash))) return res.status(401).json({ error: "Invalid email or password" });
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
  app.post("/api/admin/action", authenticate, async (req, res, next) => {
    const db = await pool.connect();
    try {
      await db.query("begin");
      const data = await runAction(db, Number(req.user.sub), String(req.body?.name || ""), req.body?.args || {});
      await db.query("commit"); broadcast({ type: "auction_updated" }); res.json({ data });
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
