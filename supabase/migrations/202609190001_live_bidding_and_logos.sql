-- Run after 202609180001_season5_auction.sql.
-- A bid is a temporary hold in the UI. Only auction_sell_current() changes spent.

alter table public.auction_teams add column if not exists logo_url text;

insert into public.auction_teams(id, name, logo_url, purse)
values
  ('11111111-1111-4111-8111-111111111111', 'PHF Blasterz', '/team-logos/phf-blasterz.jpg', 100000),
  ('22222222-2222-4222-8222-222222222222', 'The Ball Breakers', '/team-logos/the-ball-breakers.jpg', 100000),
  ('33333333-3333-4333-8333-333333333333', 'Super PHF Kings', '/team-logos/super-phf-kings.jpg', 100000),
  ('44444444-4444-4444-8444-444444444444', 'High Flyers', '/team-logos/high-flyers.jpg', 100000),
  ('55555555-5555-4555-8555-555555555555', 'PHF Avengers', '/team-logos/phf-avengers.jpg', 100000),
  ('66666666-6666-4666-8666-666666666666', 'PHF Amigos', '/team-logos/phf-amigos.jpg', 100000)
on conflict (id) do update set name = excluded.name, logo_url = excluded.logo_url;

insert into public.auction_players(id, name, role, photo, status, team_id, sold_price)
values
  ('player-11', 'Nikhil Miryala', 'All-rounder', '/season5-players/player-11.jpg', 'captain', '11111111-1111-4111-8111-111111111111', 0),
  ('player-2', 'Sohan Lath', 'All-rounder', '/season5-players/player-2.jpg', 'captain', '22222222-2222-4222-8222-222222222222', 0),
  ('player-24', 'Abhishek S', 'All-rounder', '/season5-players/player-24.jpg', 'captain', '33333333-3333-4333-8333-333333333333', 0),
  ('player-17', 'Aditya Ambikesh', 'Batter', '/season5-players/player-17.jpg', 'captain', '44444444-4444-4444-8444-444444444444', 0),
  ('player-7', 'Saurabh Gupta', 'All-rounder', '/season5-players/player-7.jpg', 'captain', '55555555-5555-4555-8555-555555555555', 0),
  ('player-15', 'Srikanth Kavuri', 'All-rounder', '/season5-players/player-15.jpg', 'captain', '66666666-6666-4666-8666-666666666666', 0)
on conflict (id) do update set name = excluded.name, role = excluded.role, photo = excluded.photo,
  status = excluded.status, team_id = excluded.team_id, sold_price = 0, updated_at = now();

-- Sravan Kumar Sriramoju is not part of the Season 5 auction pool.
delete from public.auction_players where id = 'player-65';

create or replace function public.auction_set_team_logo(p_team_id uuid, p_logo_url text) returns void
language plpgsql security definer set search_path = public as $$
declare clean_url text;
begin
  if not public.is_auction_admin() then raise exception 'Auctioneer access required'; end if;
  clean_url := nullif(trim(p_logo_url), '');
  if clean_url is not null and (length(clean_url) > 500 or clean_url !~ '^(https://|/[A-Za-z0-9_./-]+$)') then
    raise exception 'Use an HTTPS or site-local logo URL';
  end if;
  update public.auction_teams set logo_url = clean_url where id = p_team_id;
  if not found then raise exception 'Team not found'; end if;
  insert into public.auction_audit(actor_id, action, details)
  values (auth.uid(), 'set_team_logo', jsonb_build_object('team_id', p_team_id, 'logo_url', clean_url));
end $$;

create or replace function public.auction_reset_current_bids() returns void
language plpgsql security definer set search_path = public as $$
declare c public.auction_config%rowtype;
begin
  if not public.is_auction_admin() then raise exception 'Auctioneer access required'; end if;
  select * into c from public.auction_config where id = 1 for update;
  if c.status not in ('live', 'paused') or c.current_player_id is null then
    raise exception 'No current player to reset';
  end if;
  update public.auction_players
    set current_bid = null, current_bid_team_id = null, updated_at = now()
    where id = c.current_player_id;
  insert into public.auction_audit(actor_id, action, details)
  values (auth.uid(), 'reset_current_bids', jsonb_build_object('player_id', c.current_player_id));
end $$;

revoke execute on function public.auction_set_team_logo(uuid,text), public.auction_reset_current_bids() from public, anon;
grant execute on function public.auction_set_team_logo(uuid,text), public.auction_reset_current_bids() to authenticated;
