-- PHF Season 5: admin-operated auction. Apply once to a new Supabase project.
-- No service-role credential is used in the public website.

create table public.auction_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table public.auction_config (
  id integer primary key default 1 check (id = 1),
  status text not null default 'preparing' check (status in ('preparing', 'live', 'paused', 'complete')),
  current_player_id text,
  default_base_price bigint check (default_base_price >= 0),
  minimum_increment bigint check (minimum_increment > 0),
  min_squad_size integer not null default 14 check (min_squad_size > 0),
  max_squad_size integer check (max_squad_size >= min_squad_size),
  money_label text default '₹',
  updated_at timestamptz not null default now()
);
insert into public.auction_config(id) values (1);

create table public.auction_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 60),
  purse bigint not null check (purse > 0),
  spent bigint not null default 0 check (spent >= 0 and spent <= purse),
  created_at timestamptz not null default now()
);
create unique index auction_teams_name_lower on public.auction_teams(lower(name));

create table public.auction_players (
  id text primary key,
  name text not null,
  role text not null,
  photo text,
  status text not null default 'queued' check (status in ('queued', 'captain', 'up', 'sold', 'unsold')),
  team_id uuid references public.auction_teams(id),
  sold_price bigint check (sold_price >= 0),
  current_bid bigint check (current_bid >= 0),
  current_bid_team_id uuid references public.auction_teams(id),
  base_price bigint check (base_price >= 0),
  updated_at timestamptz not null default now()
);
create unique index auction_one_captain_per_team on public.auction_players(team_id) where status = 'captain';
alter table public.auction_config add constraint auction_current_player_fk foreign key (current_player_id) references public.auction_players(id);

create table public.auction_events (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in ('captain', 'called', 'bid', 'sold', 'unsold', 'requeued')),
  player_id text not null references public.auction_players(id),
  team_id uuid references public.auction_teams(id),
  amount bigint,
  created_at timestamptz not null default now()
);

create table public.auction_audit (
  id bigint generated always as identity primary key,
  actor_id uuid not null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_auction_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.auction_admins where user_id = auth.uid()) $$;

alter table public.auction_admins enable row level security;
alter table public.auction_config enable row level security;
alter table public.auction_teams enable row level security;
alter table public.auction_players enable row level security;
alter table public.auction_events enable row level security;
alter table public.auction_audit enable row level security;

revoke all on public.auction_admins, public.auction_config, public.auction_teams, public.auction_players, public.auction_events, public.auction_audit from anon, authenticated;
grant select on public.auction_config, public.auction_teams, public.auction_players, public.auction_events to anon, authenticated;
create policy auction_config_public_read on public.auction_config for select to anon, authenticated using (true);
create policy auction_teams_public_read on public.auction_teams for select to anon, authenticated using (true);
create policy auction_players_public_read on public.auction_players for select to anon, authenticated using (true);
create policy auction_events_public_read on public.auction_events for select to anon, authenticated using (true);

create or replace function public.auction_import_players(p_players jsonb) returns integer
language plpgsql security definer set search_path = public as $$
declare p jsonb; imported integer := 0;
begin
  if not public.is_auction_admin() then raise exception 'Auctioneer access required'; end if;
  perform 1 from public.auction_config where id = 1 and status = 'preparing' for update;
  if not found then raise exception 'Player import is closed'; end if;
  if jsonb_typeof(p_players) <> 'array' or jsonb_array_length(p_players) > 200 then raise exception 'Invalid player import'; end if;
  for p in select value from jsonb_array_elements(p_players) loop
    if coalesce(p->>'id', '') !~ '^player-[0-9]+$' or length(coalesce(p->>'name', '')) < 2 then raise exception 'Invalid player entry'; end if;
    insert into public.auction_players(id, name, role, photo) values (p->>'id', p->>'name', coalesce(p->>'role', 'Player'), p->>'photo')
    on conflict (id) do update set name = excluded.name, role = excluded.role, photo = excluded.photo, updated_at = now()
      where public.auction_players.status = 'queued';
    imported := imported + 1;
  end loop;
  insert into public.auction_audit(actor_id, action, details) values(auth.uid(), 'import_players', jsonb_build_object('submitted', imported));
  return imported;
end $$;

create or replace function public.auction_add_team(p_name text, p_purse bigint) returns uuid
language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if not public.is_auction_admin() then raise exception 'Auctioneer access required'; end if;
  perform 1 from public.auction_config where id = 1 and status = 'preparing' for update;
  if not found then raise exception 'Teams are locked'; end if;
  if (select count(*) from public.auction_teams) >= 6 then raise exception 'Six teams already exist'; end if;
  if p_purse <= 0 then raise exception 'Purse must be positive'; end if;
  insert into public.auction_teams(name, purse) values(trim(p_name), p_purse) returning id into new_id;
  insert into public.auction_audit(actor_id, action, details) values(auth.uid(), 'add_team', jsonb_build_object('team_id', new_id, 'name', p_name, 'purse', p_purse));
  return new_id;
end $$;

create or replace function public.auction_assign_captain(p_player_id text, p_team_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_auction_admin() then raise exception 'Auctioneer access required'; end if;
  perform 1 from public.auction_config where id = 1 and status = 'preparing' for update;
  if not found then raise exception 'Captain assignments are locked'; end if;
  if not exists(select 1 from public.auction_teams where id = p_team_id) then raise exception 'Team not found'; end if;
  if exists(select 1 from public.auction_players where team_id = p_team_id and status = 'captain') then raise exception 'This team already has a captain'; end if;
  update public.auction_players set status = 'captain', team_id = p_team_id, sold_price = 0, updated_at = now()
    where id = p_player_id and status = 'queued';
  if not found then raise exception 'Choose a queued player'; end if;
  insert into public.auction_events(event_type, player_id, team_id, amount) values('captain', p_player_id, p_team_id, 0);
  insert into public.auction_audit(actor_id, action, details) values(auth.uid(), 'assign_captain', jsonb_build_object('player_id', p_player_id, 'team_id', p_team_id));
end $$;

create or replace function public.auction_unassign_captain(p_player_id text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_auction_admin() then raise exception 'Auctioneer access required'; end if;
  perform 1 from public.auction_config where id = 1 and status = 'preparing' for update;
  if not found then raise exception 'Captain assignments are locked'; end if;
  update public.auction_players set status = 'queued', team_id = null, sold_price = null, updated_at = now()
    where id = p_player_id and status = 'captain';
  if not found then raise exception 'Choose an assigned captain'; end if;
  delete from public.auction_events where player_id = p_player_id and event_type = 'captain';
  insert into public.auction_audit(actor_id, action, details) values(auth.uid(), 'unassign_captain', jsonb_build_object('player_id', p_player_id));
end $$;

create or replace function public.auction_set_rules(p_base_price bigint, p_increment bigint, p_min_squad_size integer, p_max_squad_size integer, p_money_label text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_auction_admin() then raise exception 'Auctioneer access required'; end if;
  if p_base_price < 0 or p_increment <= 0 or p_min_squad_size < 1 or p_max_squad_size < p_min_squad_size or length(trim(p_money_label)) not between 1 and 12 then raise exception 'Invalid auction rules'; end if;
  update public.auction_config set default_base_price = p_base_price, minimum_increment = p_increment,
    min_squad_size = p_min_squad_size, max_squad_size = p_max_squad_size, money_label = trim(p_money_label), updated_at = now()
    where id = 1 and status = 'preparing';
  if not found then raise exception 'Rules are locked once the auction starts'; end if;
  insert into public.auction_audit(actor_id, action, details) values(auth.uid(), 'set_rules', jsonb_build_object('base', p_base_price, 'increment', p_increment, 'min_squad', p_min_squad_size, 'max_squad', p_max_squad_size, 'unit', p_money_label));
end $$;

create or replace function public.auction_set_status(p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare c public.auction_config%rowtype; min_size integer; max_size integer;
begin
  if not public.is_auction_admin() then raise exception 'Auctioneer access required'; end if;
  select * into c from public.auction_config where id = 1 for update;
  if p_status = 'live' and c.status = 'preparing' then
    if (select count(*) from public.auction_teams) <> 6 then raise exception 'Add exactly six teams'; end if;
    if (select count(*) from public.auction_players) < 6 then raise exception 'Import the player pool'; end if;
    if (select count(*) from public.auction_players where status = 'captain') <> 6 then raise exception 'Assign one playing captain per team'; end if;
    if c.default_base_price is null or c.minimum_increment is null or c.max_squad_size is null then raise exception 'Set the auction rules first'; end if;
  elsif p_status = 'live' and c.status = 'paused' then null;
  elsif p_status = 'paused' and c.status = 'live' then null;
  elsif p_status = 'complete' and c.status = 'paused' then
    if c.current_player_id is not null then raise exception 'Finish the current player first'; end if;
    select min(n), max(n) into min_size, max_size from (
      select count(p.id) n from public.auction_teams t left join public.auction_players p on p.team_id = t.id and p.status in ('captain','sold') group by t.id
    ) sizes;
    if min_size < c.min_squad_size or max_size - min_size > 1 then raise exception 'Squads must meet the minimum size and differ by at most one player'; end if;
  else raise exception 'Invalid auction status transition';
  end if;
  update public.auction_config set status = p_status, updated_at = now() where id = 1;
  insert into public.auction_audit(actor_id, action, details) values(auth.uid(), 'set_status', jsonb_build_object('from', c.status, 'to', p_status));
end $$;

create or replace function public.auction_start_player(p_player_id text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_auction_admin() then raise exception 'Auctioneer access required'; end if;
  perform 1 from public.auction_config where id = 1 and status = 'live' and current_player_id is null for update;
  if not found then raise exception 'Finish the current player or resume the auction'; end if;
  update public.auction_players set status = 'up', updated_at = now() where id = p_player_id and status = 'queued';
  if not found then raise exception 'Choose a queued player'; end if;
  update public.auction_config set current_player_id = p_player_id, updated_at = now() where id = 1;
  insert into public.auction_events(event_type, player_id) values('called', p_player_id);
  insert into public.auction_audit(actor_id, action, details) values(auth.uid(), 'call_player', jsonb_build_object('player_id', p_player_id));
end $$;

create or replace function public.auction_place_bid(p_team_id uuid, p_amount bigint) returns void
language plpgsql security definer set search_path = public as $$
declare c public.auction_config%rowtype; p public.auction_players%rowtype; t public.auction_teams%rowtype; squad_count integer; reserve_amount bigint;
begin
  if not public.is_auction_admin() then raise exception 'Auctioneer access required'; end if;
  select * into c from public.auction_config where id = 1 for update;
  if c.status <> 'live' or c.current_player_id is null then raise exception 'No live player on the block'; end if;
  select * into p from public.auction_players where id = c.current_player_id for update;
  select * into t from public.auction_teams where id = p_team_id for update;
  if t.id is null then raise exception 'Choose a team'; end if;
  select count(*) into squad_count from public.auction_players where team_id = p_team_id and status in ('captain','sold');
  if squad_count >= c.max_squad_size then raise exception 'Team squad is full'; end if;
  if p_amount < coalesce(p.current_bid + c.minimum_increment, p.base_price, c.default_base_price) then raise exception 'Bid is below the next valid amount'; end if;
  reserve_amount := greatest(0, c.min_squad_size - squad_count - 1) * c.default_base_price;
  if p_amount > t.purse - t.spent - reserve_amount then raise exception 'Bid would leave too little purse to complete the minimum squad'; end if;
  update public.auction_players set current_bid = p_amount, current_bid_team_id = p_team_id, updated_at = now() where id = p.id;
  insert into public.auction_events(event_type, player_id, team_id, amount) values('bid', p.id, p_team_id, p_amount);
  insert into public.auction_audit(actor_id, action, details) values(auth.uid(), 'bid', jsonb_build_object('player_id', p.id, 'team_id', p_team_id, 'amount', p_amount));
end $$;

create or replace function public.auction_sell_current() returns void
language plpgsql security definer set search_path = public as $$
declare c public.auction_config%rowtype; p public.auction_players%rowtype; t public.auction_teams%rowtype; squad_count integer;
begin
  if not public.is_auction_admin() then raise exception 'Auctioneer access required'; end if;
  select * into c from public.auction_config where id = 1 for update;
  if c.status <> 'live' or c.current_player_id is null then raise exception 'No live player'; end if;
  select * into p from public.auction_players where id = c.current_player_id for update;
  if p.current_bid_team_id is null or p.current_bid is null then raise exception 'Record a bid first'; end if;
  select * into t from public.auction_teams where id = p.current_bid_team_id for update;
  select count(*) into squad_count from public.auction_players where team_id = t.id and status in ('captain','sold');
  if squad_count >= c.max_squad_size or t.spent + p.current_bid > t.purse then raise exception 'Team cannot complete this purchase'; end if;
  update public.auction_teams set spent = spent + p.current_bid where id = t.id;
  update public.auction_players set status = 'sold', team_id = t.id, sold_price = p.current_bid, updated_at = now() where id = p.id;
  update public.auction_config set current_player_id = null, updated_at = now() where id = 1;
  insert into public.auction_events(event_type, player_id, team_id, amount) values('sold', p.id, t.id, p.current_bid);
  insert into public.auction_audit(actor_id, action, details) values(auth.uid(), 'sell', jsonb_build_object('player_id', p.id, 'team_id', t.id, 'amount', p.current_bid));
end $$;

create or replace function public.auction_mark_unsold() returns void
language plpgsql security definer set search_path = public as $$
declare c public.auction_config%rowtype;
begin
  if not public.is_auction_admin() then raise exception 'Auctioneer access required'; end if;
  select * into c from public.auction_config where id = 1 for update;
  if c.status <> 'live' or c.current_player_id is null then raise exception 'No live player'; end if;
  update public.auction_players set status = 'unsold', current_bid = null, current_bid_team_id = null, updated_at = now() where id = c.current_player_id;
  update public.auction_config set current_player_id = null, updated_at = now() where id = 1;
  insert into public.auction_events(event_type, player_id) values('unsold', c.current_player_id);
  insert into public.auction_audit(actor_id, action, details) values(auth.uid(), 'unsold', jsonb_build_object('player_id', c.current_player_id));
end $$;

create or replace function public.auction_requeue_unsold(p_player_id text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_auction_admin() then raise exception 'Auctioneer access required'; end if;
  perform 1 from public.auction_config where id = 1 and status in ('live','paused') for update;
  if not found then raise exception 'Auction is not open'; end if;
  update public.auction_players set status = 'queued', updated_at = now() where id = p_player_id and status = 'unsold';
  if not found then raise exception 'Choose an unsold player'; end if;
  insert into public.auction_events(event_type, player_id) values('requeued', p_player_id);
  insert into public.auction_audit(actor_id, action, details) values(auth.uid(), 'requeue', jsonb_build_object('player_id', p_player_id));
end $$;

revoke execute on function public.auction_import_players(jsonb), public.auction_add_team(text,bigint), public.auction_assign_captain(text,uuid), public.auction_unassign_captain(text), public.auction_set_rules(bigint,bigint,integer,integer,text), public.auction_set_status(text), public.auction_start_player(text), public.auction_place_bid(uuid,bigint), public.auction_sell_current(), public.auction_mark_unsold(), public.auction_requeue_unsold(text) from public, anon;
grant execute on function public.is_auction_admin(), public.auction_import_players(jsonb), public.auction_add_team(text,bigint), public.auction_assign_captain(text,uuid), public.auction_unassign_captain(text), public.auction_set_rules(bigint,bigint,integer,integer,text), public.auction_set_status(text), public.auction_start_player(text), public.auction_place_bid(uuid,bigint), public.auction_sell_current(), public.auction_mark_unsold(), public.auction_requeue_unsold(text) to authenticated;

alter publication supabase_realtime add table public.auction_config, public.auction_teams, public.auction_players, public.auction_events;
