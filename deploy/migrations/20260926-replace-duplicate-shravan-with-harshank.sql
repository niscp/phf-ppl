begin;

do $$
begin
  if not exists (
    select 1
    from auction_players
    where id = 'player-90'
      and (status = 'queued' or name = 'Harshank')
  ) then
    raise exception 'player-90 must exist and remain queued before replacing the duplicate registration';
  end if;
end $$;

update auction_players
set name = 'Harshank',
    role = 'All-rounder',
    photo = '/season5-players/player-90.jpg',
    updated_at = now()
where id = 'player-90'
  and status = 'queued'
  and name <> 'Harshank';

update auction_instances
set state_data = jsonb_set(
      jsonb_set(
        state_data,
        '{players}',
        (
          select jsonb_agg(
            case
              when player->>'id' = 'player-90' then
                player || jsonb_build_object(
                  'name', 'Harshank',
                  'role', 'All-rounder',
                  'photo', '/season5-players/player-90.jpg'
                )
              else player
            end
            order by position
          )
          from jsonb_array_elements(state_data->'players') with ordinality entries(player, position)
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
  and exists (
    select 1
    from jsonb_array_elements(state_data->'players') player
    where player->>'id' = 'player-90'
      and player->>'status' = 'queued'
  );

update auction_config
set min_squad_size = 15,
    max_squad_size = 15,
    updated_at = now()
where id = 1;

do $$
begin
  if (select count(*) from auction_players) <> 90 then
    raise exception 'Expected exactly 90 registered players';
  end if;
  if (select count(*) from auction_players where id = 'player-90' and name = 'Harshank') <> 1 then
    raise exception 'Expected Harshank to replace duplicate player-90';
  end if;
  if (select min_squad_size from auction_config where id = 1) <> 15
     or (select max_squad_size from auction_config where id = 1) <> 15 then
    raise exception 'Expected exact 15-player squad rules';
  end if;
end $$;

commit;
