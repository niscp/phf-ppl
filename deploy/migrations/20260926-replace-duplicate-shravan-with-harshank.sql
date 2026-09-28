begin;

do $$
begin
  if not exists (
    select 1
    from auction_players
    where id = 'player-90'
      and name = 'Shravan'
  ) then
    raise exception 'Expected the retained Shravan registration at player-90';
  end if;
end $$;

insert into auction_players(id, name, role, photo, status)
values ('player-65', 'Harshank', 'All-rounder', '/season5-players/player-65.jpg', 'queued')
on conflict (id) do update
set name = excluded.name,
    role = excluded.role,
    photo = excluded.photo,
    updated_at = now()
where auction_players.status = 'queued';

update auction_instances
set state_data = jsonb_set(
      jsonb_set(
        state_data,
        '{players}',
        (state_data->'players') || jsonb_build_array(
          jsonb_build_object(
            'id', 'player-65',
            'name', 'Harshank',
            'role', 'All-rounder',
            'photo', '/season5-players/player-65.jpg',
            'status', 'queued',
            'team_id', null,
            'sold_price', null,
            'current_bid', null,
            'current_bid_team_id', null,
            'base_price', null
          )
        )
      ),
      '{config}',
      (state_data->'config') || jsonb_build_object(
        'min_squad_size', 15,
        'max_squad_size', 15
      )
    ),
    updated_at = now()
where archived = false
  and jsonb_typeof(state_data->'players') = 'array'
  and jsonb_typeof(state_data->'config') = 'object'
  and not exists (
    select 1
    from jsonb_array_elements(state_data->'players') player
    where player->>'id' = 'player-65'
  );

update auction_config
set min_squad_size = 15,
    max_squad_size = 15,
    updated_at = now()
where id = 1;

do $$
begin
  if (select count(*) from auction_players) <> 90 then
    raise exception 'Expected exactly 90 registered players after adding Harshank';
  end if;
  if (select count(*) from auction_players where id = 'player-65' and name = 'Harshank') <> 1 then
    raise exception 'Expected Harshank at the freed player-65 slot';
  end if;
  if (select count(*) from auction_players where id = 'player-90' and name = 'Shravan') <> 1 then
    raise exception 'Expected Shravan to remain at player-90';
  end if;
  if (select min_squad_size from auction_config where id = 1) <> 15
     or (select max_squad_size from auction_config where id = 1) <> 15 then
    raise exception 'Expected exact 15-player squad rules';
  end if;
end $$;

commit;
