import "dotenv/config";
import http from "node:http";
import fs from "node:fs/promises";
import pg from "pg";
import bcrypt from "bcryptjs";
import { WebSocketServer } from "ws";
import { createApp } from "./app.mjs";

for (const name of ["DATABASE_URL", "JWT_SECRET"]) if (!process.env[name]) throw new Error(`${name} is required`);
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
const schema = await fs.readFile(new URL("./schema.sql", import.meta.url), "utf8");
await pool.query(schema);

if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
  await pool.query(`insert into auction_admins(email,password_hash) values($1,$2)
    on conflict((lower(email))) do update set password_hash=excluded.password_hash,active=true`, [process.env.ADMIN_EMAIL.trim().toLowerCase(), hash]);
}

const clients = new Set();
const app = createApp(pool, (message) => {
  const data = JSON.stringify(message);
  for (const client of clients) if (client.readyState === 1) client.send(data);
});
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });
wss.on("connection", (socket) => { clients.add(socket); socket.on("close", () => clients.delete(socket)); });

const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || "127.0.0.1";
server.listen(port, host, () => console.log(`PHF auction API listening on ${host}:${port}`));
