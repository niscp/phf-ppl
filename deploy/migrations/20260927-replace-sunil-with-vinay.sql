begin;

update auction_players
set name = 'Vinay Bhardwaj',
    role = 'All-rounder',
    photo = null,
    updated_at = now()
where id = 'player-40'
  and status = 'queued';

update auction_instances instance
set state_data = jsonb_set(
      instance.state_data,
      '{players}',
      (
        select jsonb_agg(
          case
            when player.value->>'id' = 'player-40'
             and player.value->>'status' = 'queued'
            then player.value || jsonb_build_object(
              'name', 'Vinay Bhardwaj',
              'role', 'All-rounder',
              'photo', null
            )
            else player.value
          end
          order by player.ordinality
        )
        from jsonb_array_elements(instance.state_data->'players')
             with ordinality as player(value, ordinality)
      ),
      false
    ),
    updated_at = now()
where archived = false
  and jsonb_typeof(instance.state_data->'players') = 'array'
  and exists (
    select 1
    from jsonb_array_elements(instance.state_data->'players') player
    where player->>'id' = 'player-40'
      and player->>'status' = 'queued'
  );

do $$
begin
  if (select count(*) from auction_players) <> 90 then
    raise exception 'Expected exactly 90 registered players';
  end if;
  if (select count(*) from auction_players where id = 'player-40' and name = 'Vinay Bhardwaj' and role = 'All-rounder') <> 1 then
    raise exception 'Expected Vinay Bhardwaj at player-40; the player may no longer be queued';
  end if;
  if exists (select 1 from auction_players where lower(name) = lower('Sunil Boddula')) then
    raise exception 'Sunil Boddula is still present in the active roster';
  end if;
end $$;

commit;
