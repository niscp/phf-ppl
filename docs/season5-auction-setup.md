# Season 5 self-hosted auction setup

The complete website and live auction backend run on the PHF EC2 server using Nginx, Node.js, PostgreSQL and WebSockets. Redis and Supabase are not required.

## Production layout

- `https://phfppl.dwemory.com/` — public website, API and WebSocket endpoint
- PostgreSQL — reachable only inside the Docker network
- Existing Nginx — static site, HTTPS and reverse proxy

## EC2 prerequisites

1. Point the `phfppl.dwemory.com` `A` record to the EC2 public IPv4 address.
2. Permit inbound TCP 80 and 443 in the EC2 security group. Do not expose ports 5432 or 8080.
3. Docker Engine, Docker Compose, Nginx and Certbot must be installed.
4. Clone this repository on the server and enter the `deploy` directory.

## Configure and start

```bash
cp .env.example .env
```

Edit `.env` and replace every placeholder. Use independent random values for the PostgreSQL password and JWT secret. `ALLOWED_ORIGINS` must contain the exact public website origin, without a trailing slash.

```bash
docker compose up -d --build
docker compose ps
sudo cp phfppl.nginx /etc/nginx/sites-available/phfppl
sudo ln -s /etc/nginx/sites-available/phfppl /etc/nginx/sites-enabled/phfppl
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d phfppl.dwemory.com
curl https://phfppl.dwemory.com/health
```

The API applies `server/schema.sql` idempotently at startup and creates or updates the auctioneer account from `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

## Optional GitHub Pages mirror

In GitHub → repository Settings → Secrets and variables → Actions → Variables, set:

```text
VITE_AUCTION_API_URL=https://phfppl.dwemory.com
```

Run the Pages workflow again. Never put `DATABASE_URL`, `POSTGRES_PASSWORD`, `JWT_SECRET` or `ADMIN_PASSWORD` in GitHub Pages variables or browser code.

## Backups

Run before the rehearsal, immediately before the live auction, and after it:

```bash
sh backup.sh
```

For automated daily backups, call the same script from root's cron and copy the resulting encrypted backup to storage outside the EC2 instance.

## Auction behavior

- Visitors can only read the public snapshot.
- Only the password-authenticated auctioneer can mutate auction state.
- Each admin operation runs inside a PostgreSQL transaction and is logged in `auction_audit`.
- A bid is provisional. Only **Sold** deducts from the winner's purse.
- WebSocket notifications refresh connected screens immediately; 15-second polling remains as fallback.
- The database seeds the six announced teams and captains. Sravan Kumar is excluded from the player import.
