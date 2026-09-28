begin;

insert into auction_players(id, name, role, photo, status)
values
  ('player-87', 'Madhav Jain', 'All-rounder', '/season5-players/player-87.jpg', 'queued'),
  ('player-88', 'Vineet', 'All-rounder', '/season5-players/player-88.jpg', 'queued'),
  ('player-89', 'Kuchipudi Nisanth', 'All-rounder', '/season5-players/player-89.jpg', 'queued'),
  ('player-90', 'Shravan', 'All-rounder', '/season5-players/player-90.jpg', 'queued'),
  ('player-91', 'Divyansh Dubey', 'Bowler', '/season5-players/player-91.jpg', 'queued')
on conflict (id) do update
set name = excluded.name,
    role = excluded.role,
    photo = excluded.photo,
    updated_at = now()
where auction_players.status = 'queued';

update auction_instances
set state_data = jsonb_set(state_data, '{players}', (state_data->'players') || jsonb_build_array(
      jsonb_build_object('id', 'player-87', 'name', 'Madhav Jain', 'role', 'All-rounder', 'photo', '/season5-players/player-87.jpg', 'status', 'queued', 'team_id', null, 'sold_price', null, 'current_bid', null, 'current_bid_team_id', null, 'base_price', null)
    )),
    updated_at = now()
where archived = false
  and jsonb_typeof(state_data->'players') = 'array'
  and not exists (select 1 from jsonb_array_elements(state_data->'players') player where player->>'id' = 'player-87');

update auction_instances
set state_data = jsonb_set(state_data, '{players}', (state_data->'players') || jsonb_build_array(
      jsonb_build_object('id', 'player-88', 'name', 'Vineet', 'role', 'All-rounder', 'photo', '/season5-players/player-88.jpg', 'status', 'queued', 'team_id', null, 'sold_price', null, 'current_bid', null, 'current_bid_team_id', null, 'base_price', null)
    )),
    updated_at = now()
where archived = false
  and jsonb_typeof(state_data->'players') = 'array'
  and not exists (select 1 from jsonb_array_elements(state_data->'players') player where player->>'id' = 'player-88');

update auction_instances
set state_data = jsonb_set(state_data, '{players}', (state_data->'players') || jsonb_build_array(
      jsonb_build_object('id', 'player-89', 'name', 'Kuchipudi Nisanth', 'role', 'All-rounder', 'photo', '/season5-players/player-89.jpg', 'status', 'queued', 'team_id', null, 'sold_price', null, 'current_bid', null, 'current_bid_team_id', null, 'base_price', null)
    )),
    updated_at = now()
where archived = false
  and jsonb_typeof(state_data->'players') = 'array'
  and not exists (select 1 from jsonb_array_elements(state_data->'players') player where player->>'id' = 'player-89');

update auction_instances
set state_data = jsonb_set(state_data, '{players}', (state_data->'players') || jsonb_build_array(
      jsonb_build_object('id', 'player-90', 'name', 'Shravan', 'role', 'All-rounder', 'photo', '/season5-players/player-90.jpg', 'status', 'queued', 'team_id', null, 'sold_price', null, 'current_bid', null, 'current_bid_team_id', null, 'base_price', null)
    )),
    updated_at = now()
where archived = false
  and jsonb_typeof(state_data->'players') = 'array'
  and not exists (select 1 from jsonb_array_elements(state_data->'players') player where player->>'id' = 'player-90');

update auction_instances
set state_data = jsonb_set(state_data, '{players}', (state_data->'players') || jsonb_build_array(
      jsonb_build_object('id', 'player-91', 'name', 'Divyansh Dubey', 'role', 'Bowler', 'photo', '/season5-players/player-91.jpg', 'status', 'queued', 'team_id', null, 'sold_price', null, 'current_bid', null, 'current_bid_team_id', null, 'base_price', null)
    )),
    updated_at = now()
where archived = false
  and jsonb_typeof(state_data->'players') = 'array'
  and not exists (select 1 from jsonb_array_elements(state_data->'players') player where player->>'id' = 'player-91');

commit;
