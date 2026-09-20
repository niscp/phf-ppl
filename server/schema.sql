create extension if not exists pgcrypto;

create table if not exists auction_admins (
  id bigserial primary key,
  email text not null,
  password_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists auction_admins_email_lower on auction_admins(lower(email));

create table if not exists auction_instances (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'demo' check (kind in ('official','demo')),
  state_data jsonb,
  active boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists auction_instances_one_active on auction_instances(active) where active;
insert into auction_instances(name,kind,active)
select 'Season 5 Official Auction','official',true
where not exists (select 1 from auction_instances);

create table if not exists auction_config (
  id integer primary key default 1 check (id = 1),
  status text not null default 'preparing' check (status in ('preparing','live','paused','complete')),
  current_player_id text,
  default_base_price bigint,
  minimum_increment bigint,
  increment_threshold bigint,
  increment_above_threshold bigint,
  min_squad_size integer not null default 14,
  max_squad_size integer default 15,
  money_label text not null default '₹',
  updated_at timestamptz not null default now()
);
insert into auction_config(id) values (1) on conflict do nothing;
alter table auction_config add column if not exists increment_threshold bigint;
alter table auction_config add column if not exists increment_above_threshold bigint;

create table if not exists auction_teams (
  id uuid primary key,
  name text not null,
  logo_url text,
  purse bigint not null check (purse > 0),
  spent bigint not null default 0 check (spent >= 0 and spent <= purse),
  created_at timestamptz not null default now()
);
create unique index if not exists auction_teams_name_lower on auction_teams(lower(name));

create table if not exists auction_players (
  id text primary key,
  name text not null,
  role text not null,
  photo text,
  status text not null default 'queued' check (status in ('queued','captain','up','sold','unsold')),
  team_id uuid references auction_teams(id),
  sold_price bigint,
  current_bid bigint,
  current_bid_team_id uuid references auction_teams(id),
  base_price bigint,
  updated_at timestamptz not null default now()
);
create unique index if not exists auction_one_captain_per_team on auction_players(team_id) where status = 'captain';

do $$ begin
  alter table auction_config add constraint auction_current_player_fk foreign key (current_player_id) references auction_players(id);
exception when duplicate_object then null; end $$;

create table if not exists auction_events (
  id bigserial primary key,
  event_type text not null,
  player_id text not null references auction_players(id),
  team_id uuid references auction_teams(id),
  amount bigint,
  created_at timestamptz not null default now()
);

create table if not exists auction_audit (
  id bigserial primary key,
  actor_id bigint references auction_admins(id),
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into auction_teams(id, name, logo_url, purse) values
 ('11111111-1111-4111-8111-111111111111','PHF Blasterz','/team-logos/phf-blasterz.jpg',100000),
 ('22222222-2222-4222-8222-222222222222','The Ball Breakers','/team-logos/the-ball-breakers.jpg',100000),
 ('33333333-3333-4333-8333-333333333333','Super PHF Kings','/team-logos/super-phf-kings.jpg',100000),
 ('44444444-4444-4444-8444-444444444444','High Flyers','/team-logos/high-flyers.jpg',100000),
 ('55555555-5555-4555-8555-555555555555','PHF Avengers','/team-logos/phf-avengers.jpg',100000),
 ('66666666-6666-4666-8666-666666666666','PHF Amigos','/team-logos/phf-amigos.jpg',100000)
on conflict (id) do update set name=excluded.name, logo_url=excluded.logo_url;

insert into auction_players(id,name,role,photo,status,team_id,sold_price) values
 ('player-11','Nikhil Miryala','All-rounder','/season5-players/player-11.jpg','captain','11111111-1111-4111-8111-111111111111',0),
 ('player-2','Sohan Lath','All-rounder','/season5-players/player-2.jpg','captain','22222222-2222-4222-8222-222222222222',0),
 ('player-24','Abhishek S','All-rounder','/season5-players/player-24.jpg','captain','33333333-3333-4333-8333-333333333333',0),
 ('player-17','Aditya Ambikesh','Batter','/season5-players/player-17.jpg','captain','44444444-4444-4444-8444-444444444444',0),
 ('player-7','Saurabh Gupta','All-rounder','/season5-players/player-7.jpg','captain','55555555-5555-4555-8555-555555555555',0),
 ('player-15','Srikanth Kavuri','All-rounder','/season5-players/player-15.jpg','captain','66666666-6666-4666-8666-666666666666',0)
on conflict (id) do update set name=excluded.name,role=excluded.role,photo=excluded.photo,status='captain',team_id=excluded.team_id,sold_price=0;
