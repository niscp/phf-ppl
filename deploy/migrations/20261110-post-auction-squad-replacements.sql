begin;

alter table auction_players
  add column if not exists replacement_for_player_id text references auction_players(id);

do $$
begin
  if (select status from auction_config where id = 1) <> 'complete' then
    raise exception 'Post-auction replacements require a completed auction';
  end if;

  if (select count(*) from auction_players where id in (
    'player-82', 'player-81', 'player-83', 'player-38', 'player-77',
    'player-39', 'player-57', 'player-22', 'player-50'
  )) <> 9 then
    raise exception 'Expected all nine outgoing players in the Season 5 auction ledger';
  end if;

  if exists (
    select 1
    from (values
      ('player-82', 'PHF Amigos'),
      ('player-81', 'PHF Super Kings'),
      ('player-83', 'High Flyers'),
      ('player-38', 'PHF Avengers'),
      ('player-77', 'PHF Amigos'),
      ('player-39', 'High Flyers'),
      ('player-57', 'PHF Avengers'),
      ('player-22', 'PHF Avengers'),
      ('player-50', 'PHF Avengers')
    ) expected(player_id, team_name)
    left join auction_players player on player.id = expected.player_id
    left join auction_teams team on team.id = player.team_id
    where team.name is distinct from expected.team_name
  ) then
    raise exception 'An outgoing player is no longer assigned to the expected squad';
  end if;

  if exists (
    select 1 from auction_players
    where id in ('replacement-ajay','replacement-kamal-anupam','replacement-mayank-dixit','replacement-ayush-naggar','replacement-rahul-sharan','replacement-urooj-kamal')
      and replacement_for_player_id is null
  ) then
    raise exception 'A replacement ID already belongs to a non-replacement player';
  end if;
end $$;

-- Keep auction prices, bid events, and player records intact. Mark the outgoing
-- players unavailable for current squads while retaining their historical team.
update auction_players
set status = 'unsold', current_bid = null, current_bid_team_id = null, updated_at = now()
where id in ('player-82','player-81','player-83','player-38','player-77','player-39','player-57','player-22','player-50');

-- Waiting-list replacements inherit the vacated player's team and role. They
-- have no auction price; their entries are not auction sales and do not change
-- team purse totals or the immutable auction-instance snapshot.
insert into auction_players (id, name, role, photo, status, team_id, sold_price, current_bid,
  current_bid_team_id, base_price, replacement_for_player_id)
select incoming.id, incoming.name, outgoing.role, null, 'sold', outgoing.team_id, null, null,
  null, null, outgoing.id
from (values
  ('replacement-ajay', 'Ajay', 'player-83'),
  ('replacement-kamal-anupam', 'Kamal Anupam', 'player-38'),
  ('replacement-mayank-dixit', 'Mayank Dixit', 'player-39'),
  ('replacement-ayush-naggar', 'Ayush Naggar', 'player-57'),
  ('replacement-rahul-sharan', 'Rahul Sharan', 'player-22'),
  ('replacement-urooj-kamal', 'Urooj Kamal', 'player-50')
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
  if (select count(*) from auction_players where replacement_for_player_id is not null
    and id in ('replacement-ajay','replacement-kamal-anupam','replacement-mayank-dixit','replacement-ayush-naggar','replacement-rahul-sharan','replacement-urooj-kamal')) <> 6 then
    raise exception 'Replacement rows could not be created safely';
  end if;
end $$;

insert into auction_audit(actor_id, action, details)
values (null, 'post_auction_squad_replacements', jsonb_build_object(
  'replacements', jsonb_build_array(
    jsonb_build_object('outgoing', 'player-83', 'incoming', 'replacement-ajay'),
    jsonb_build_object('outgoing', 'player-38', 'incoming', 'replacement-kamal-anupam'),
    jsonb_build_object('outgoing', 'player-39', 'incoming', 'replacement-mayank-dixit'),
    jsonb_build_object('outgoing', 'player-57', 'incoming', 'replacement-ayush-naggar'),
    jsonb_build_object('outgoing', 'player-22', 'incoming', 'replacement-rahul-sharan'),
    jsonb_build_object('outgoing', 'player-50', 'incoming', 'replacement-urooj-kamal')
  ),
  'removed_without_replacement', jsonb_build_array('player-82','player-81','player-77'),
  'auction_ledger_preserved', true
));

commit;
