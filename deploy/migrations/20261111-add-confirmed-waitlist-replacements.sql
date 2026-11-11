begin;

do $$
begin
  if (select status from auction_config where id = 1) <> 'complete' then
    raise exception 'Squad replacements require a completed auction';
  end if;

  if exists (
    select 1 from auction_players
    where id in ('replacement-swejan', 'replacement-shrey')
      and replacement_for_player_id is null
  ) then
    raise exception 'A replacement ID already belongs to a non-replacement player';
  end if;

  if exists (
    select 1
    from (values
      ('player-82', 'PHF Amigos'),
      ('player-81', 'PHF Super Kings'),
      ('player-77', 'PHF Amigos')
    ) expected(player_id, team_name)
    left join auction_players player on player.id = expected.player_id
    left join auction_teams team on team.id = player.team_id
    where team.name is distinct from expected.team_name
  ) then
    raise exception 'Outgoing player team does not match the confirmed replacement assignment';
  end if;
end $$;

update auction_players
set status = 'unsold', current_bid = null, current_bid_team_id = null, updated_at = now()
where id in ('player-82', 'player-81', 'player-77');

insert into auction_players (id, name, role, photo, status, team_id, sold_price, current_bid,
  current_bid_team_id, base_price, replacement_for_player_id)
select incoming.id, incoming.name, outgoing.role, null, 'sold', outgoing.team_id, null, null,
  null, null, outgoing.id
from (values
  ('replacement-swejan', 'Swejan', 'player-82'),
  ('replacement-shrey', 'Shrey', 'player-81')
) as incoming(id, name, outgoing_id)
join auction_players outgoing on outgoing.id = incoming.outgoing_id
on conflict (id) do update set
  name = excluded.name,
  role = excluded.role,
  photo = excluded.photo,
  status = 'sold',
  team_id = excluded.team_id,
  sold_price = null,
  current_bid = null,
  current_bid_team_id = null,
  base_price = null,
  replacement_for_player_id = excluded.replacement_for_player_id,
  updated_at = now()
where auction_players.replacement_for_player_id = excluded.replacement_for_player_id;

do $$
begin
  if (select count(*) from auction_players
    where id in ('replacement-swejan', 'replacement-shrey')
      and replacement_for_player_id in ('player-82', 'player-81')
      and status = 'sold') <> 2 then
    raise exception 'Confirmed replacement rows were not created safely';
  end if;
end $$;

insert into auction_audit(actor_id, action, details)
values (null, 'post_auction_replacement_update', jsonb_build_object(
  'confirmed_replacements', jsonb_build_array(
    jsonb_build_object('outgoing', 'player-82', 'incoming', 'replacement-swejan', 'team', 'PHF Amigos'),
    jsonb_build_object('outgoing', 'player-81', 'incoming', 'replacement-shrey', 'team', 'PHF Super Kings')
  ),
  'pending_replacements', jsonb_build_array(
    jsonb_build_object('outgoing', 'player-77', 'candidate', 'Indraneel', 'status', 'awaiting confirmation')
  )
));

commit;
