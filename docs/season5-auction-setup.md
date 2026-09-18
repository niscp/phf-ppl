# Season 5 auction setup

The public [auction room](../auction.html) is part of the GitHub Pages site. It shows the registered player pool before the auction. Live bids, team budgets, and sold players require a Supabase project; GitHub Pages alone cannot store or secure those changes.

## Activate the backend

1. Create a Supabase project owned by the PHF organizers. Keep database and Auth access restricted to trusted organizers.
2. In the Supabase SQL Editor, apply [`202609180001_season5_auction.sql`](../supabase/migrations/202609180001_season5_auction.sql) once to a new project. It creates the auction tables, read-only public policies, audited auctioneer functions, and realtime updates.
3. In Supabase Authentication, create an email/password user for the auctioneer. Get their user UUID from the Users page. In the SQL Editor run `insert into public.auction_admins(user_id) values ('THE-USER-UUID');` with the actual UUID. Never share the password in this repository.
4. In the GitHub repository Settings → Secrets and variables → Actions → Variables, add `VITE_SUPABASE_URL` (Supabase Project URL) and `VITE_SUPABASE_ANON_KEY` (publishable/anon key). These are public browser configuration, not secret server credentials. **Never add the service-role key.**
5. Re-run the GitHub Pages workflow (or push a commit). Verify `/auction.html` shows the backend state and `/auction-admin.html` accepts the auctioneer login.

## Before going live

- Import the 85 registered players, add six official team names, and assign one playing captain to each team. Captains count toward squad size and have no auction bid.
- Confirm the actual rules with all captains. Current draft: virtual ₹1,00,000 per team, ₹2,000 player base, ₹1,000 minimum bid increase, 14–15 players per team. The INR figures are **auction values only**, not payments or fees.
- The system reserves enough budget for each team to reach the minimum squad size. It blocks purchases above the maximum squad size. Completion is blocked until all six squads have at least the minimum and the largest and smallest squads differ by no more than one player.
- Rehearse a few bids with the captains before opening the real event. A fresh project is best for a rehearsal; this first version does not include a reset button or a sold-player undo. Back up the database before the live auction.
- Confirm the live date and announce it separately. The website intentionally does not claim an auction date until organizers confirm one.

Only an authenticated user listed in `auction_admins` can run the auction. Visitors can read the board but cannot bid directly. The auctioneer records the captains' bids. Public pages poll every 15 seconds as a fallback to realtime.
