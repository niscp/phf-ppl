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
with ranked_active as (
  select id,row_number() over(order by updated_at desc,id) position
  from auction_instances where active=true
)
update auction_instances set active=false
where id in (select id from ranked_active where position>1);
create unique index if not exists auction_instances_one_active on auction_instances(active) where active=true;

create table if not exists auction_config (
  id integer primary key default 1 check (id = 1),
  status text not null default 'preparing' check (status in ('preparing','live','paused','complete')),
  current_player_id text,
  default_base_price numeric(12,2),
  minimum_increment numeric(12,2),
  increment_threshold numeric(12,2),
  increment_above_threshold numeric(12,2),
  min_squad_size integer not null default 15,
  max_squad_size integer default 15,
  money_label text not null default 'CR',
  updated_at timestamptz not null default now()
);
insert into auction_config(id) values (1) on conflict do nothing;
alter table auction_config add column if not exists increment_threshold bigint;
alter table auction_config add column if not exists increment_above_threshold bigint;
alter table auction_config alter column default_base_price type numeric(12,2) using default_base_price::numeric;
alter table auction_config alter column minimum_increment type numeric(12,2) using minimum_increment::numeric;
alter table auction_config alter column increment_threshold type numeric(12,2) using increment_threshold::numeric;
alter table auction_config alter column increment_above_threshold type numeric(12,2) using increment_above_threshold::numeric;

create table if not exists auction_teams (
  id uuid primary key,
  name text not null,
  logo_url text,
  purse numeric(12,2) not null check (purse > 0),
  spent numeric(12,2) not null default 0 check (spent >= 0 and spent <= purse),
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
  sold_price numeric(12,2),
  current_bid numeric(12,2),
  current_bid_team_id uuid references auction_teams(id),
  base_price numeric(12,2),
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
  amount numeric(12,2),
  created_at timestamptz not null default now()
);

create table if not exists auction_audit (
  id bigserial primary key,
  actor_id bigint references auction_admins(id),
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists auction_sync_outbox (
  auction_id uuid primary key references auction_instances(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists auction_sync_status (
  id integer primary key default 1 check (id = 1),
  last_success_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);
insert into auction_sync_status(id) values (1) on conflict do nothing;

alter table auction_teams alter column purse type numeric(12,2) using purse::numeric;
alter table auction_teams alter column spent type numeric(12,2) using spent::numeric;
alter table auction_players alter column sold_price type numeric(12,2) using sold_price::numeric;
alter table auction_players alter column current_bid type numeric(12,2) using current_bid::numeric;
alter table auction_players alter column base_price type numeric(12,2) using base_price::numeric;
alter table auction_events alter column amount type numeric(12,2) using amount::numeric;

insert into auction_teams(id, name, logo_url, purse) values
 ('11111111-1111-4111-8111-111111111111','PHF Blasterz','/team-logos/phf-blasterz.jpg',30),
 ('22222222-2222-4222-8222-222222222222','Prestige Super Giants','/team-logos/prestige-super-giants.jpg',30),
 ('33333333-3333-4333-8333-333333333333','Super PHF Kings','/team-logos/super-phf-kings.jpg',30),
 ('44444444-4444-4444-8444-444444444444','High Flyers','/team-logos/high-flyers.jpg',30),
 ('55555555-5555-4555-8555-555555555555','PHF Avengers','/team-logos/phf-avengers.jpg',30),
 ('66666666-6666-4666-8666-666666666666','PHF Amigos','/team-logos/phf-amigos.jpg',30)
on conflict (id) do update set name=excluded.name, logo_url=excluded.logo_url;

-- Keep already-created concurrent auction rooms aligned with announced team branding.
update auction_instances
set state_data = jsonb_set(
  state_data,
  '{teams}',
  (
    select jsonb_agg(
      case when team->>'id' = '22222222-2222-4222-8222-222222222222'
        then team || jsonb_build_object(
          'name', 'Prestige Super Giants',
          'logo_url', '/team-logos/prestige-super-giants.jpg'
        )
        else team
      end
    )
    from jsonb_array_elements(state_data->'teams') team
  )
)
where jsonb_typeof(state_data->'teams') = 'array'
  and exists (
    select 1 from jsonb_array_elements(state_data->'teams') team
    where team->>'id' = '22222222-2222-4222-8222-222222222222'
  );

insert into auction_players(id,name,role,photo,status,team_id,sold_price) values
 ('player-11','Nikhil Miryala','All-rounder','/season5-players/player-11.jpg','captain','11111111-1111-4111-8111-111111111111',0),
 ('player-2','Sohan Lath','All-rounder','/season5-players/player-2.jpg','captain','22222222-2222-4222-8222-222222222222',0),
 ('player-24','Abhishek S','All-rounder','/season5-players/player-24.jpg','captain','33333333-3333-4333-8333-333333333333',0),
 ('player-17','Aditya Ambikesh','Batter','/season5-players/player-17.jpg','captain','44444444-4444-4444-8444-444444444444',0),
 ('player-7','Saurabh Gupta','All-rounder','/season5-players/player-7.jpg','captain','55555555-5555-4555-8555-555555555555',0),
 ('player-15','Srikanth Kavuri','All-rounder','/season5-players/player-15.jpg','captain','66666666-6666-4666-8666-666666666666',0)
on conflict (id) do update set name=excluded.name,role=excluded.role,photo=excluded.photo;
