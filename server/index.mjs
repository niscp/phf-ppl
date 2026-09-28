import "dotenv/config";
import http from "node:http";
import fs from "node:fs/promises";
import pg from "pg";
import bcrypt from "bcryptjs";
import { WebSocketServer } from "ws";
import { createApp } from "./app.mjs";
import { migrateActiveAuctionToCr, normalizeAuctionState } from "./auction-units.mjs";

for (const name of ["DATABASE_URL", "JWT_SECRET"]) if (!process.env[name]) throw new Error(`${name} is required`);
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
const schema = await fs.readFile(new URL("./schema.sql", import.meta.url), "utf8");
await pool.query(schema);
await migrateActiveAuctionToCr(pool);

async function ensureActiveAuction() {
  const existing = await pool.query("select id from auction_instances where active=true limit 1");
  if (existing.rows[0]) return existing.rows[0].id;
  const [config, teams, players, events] = await Promise.all([
    pool.query("select * from auction_config where id=1"),
    pool.query("select * from auction_teams order by name"),
    pool.query("select * from auction_players order by name"),
    pool.query("select event_type,player_id,team_id,amount,created_at from auction_events order by id"),
  ]);
  const state = normalizeAuctionState({ config: config.rows[0] || null, teams: teams.rows, players: players.rows, events: events.rows });
  const { rows } = await pool.query("insert into auction_instances(name,kind,state_data,active) values('Season 5 Official Auction','official',$1,true) returning id", [state]);
  return rows[0].id;
}

await ensureActiveAuction();

if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
  await pool.query(`insert into auction_admins(email,password_hash) values($1,$2)
    on conflict((lower(email))) do update set password_hash=excluded.password_hash,active=true`, [process.env.ADMIN_EMAIL.trim().toLowerCase(), hash]);
}

const clients = new Set();
async function queueAuctionSync(auctionId) {
  if (!process.env.CLOUD_SYNC_URL || !process.env.SYNC_SECRET) return;
  const { rows } = await pool.query(
    "select id,name,kind,state_data from auction_instances where id=$1 and archived=false",
    [auctionId],
  );
  const auction = rows[0];
  if (!auction) return;
  const payload = { auction: { id: auction.id, name: auction.name, kind: auction.kind }, state_data: auction.state_data };
  await pool.query(`insert into auction_sync_outbox(auction_id,payload,updated_at) values($1,$2,now())
    on conflict(auction_id) do update set payload=excluded.payload,updated_at=now()`, [auctionId, payload]);
  void flushAuctionSync();
}

let flushingSync = false;
async function flushAuctionSync() {
  if (flushingSync || !process.env.CLOUD_SYNC_URL || !process.env.SYNC_SECRET) return;
  flushingSync = true;
  try {
    const { rows } = await pool.query("select auction_id,payload from auction_sync_outbox order by updated_at limit 20");
    for (const row of rows) {
      const response = await fetch(`${process.env.CLOUD_SYNC_URL.replace(/\/$/, "")}/api/sync/auction`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-auction-sync-secret": process.env.SYNC_SECRET },
        body: JSON.stringify({ payload: row.payload }),
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error(`Cloud synchronization returned ${response.status}`);
      await pool.query("delete from auction_sync_outbox where auction_id=$1 and payload=$2", [row.auction_id, row.payload]);
    }
    await pool.query("update auction_sync_status set last_success_at=now(),last_error=null,updated_at=now() where id=1");
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 240) : "Cloud synchronization failed";
    await pool.query("update auction_sync_status set last_error=$1,updated_at=now() where id=1", [message]).catch(() => {});
  } finally {
    flushingSync = false;
  }
}

const app = createApp(pool, (message) => {
  const data = JSON.stringify(message);
  for (const client of clients) if (client.readyState === 1) client.send(data);
}, queueAuctionSync);
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });
wss.on("connection", (socket) => { clients.add(socket); socket.on("close", () => clients.delete(socket)); });

const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || "127.0.0.1";
server.listen(port, host, () => console.log(`PHF auction API listening on ${host}:${port}`));

if (process.env.CLOUD_SYNC_URL && process.env.SYNC_SECRET) {
  setInterval(() => { void flushAuctionSync(); }, 5000).unref();
  void flushAuctionSync();
}
