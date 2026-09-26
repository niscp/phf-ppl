begin;

update auction_teams
set purse = 30
where id in (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
  '66666666-6666-4666-8666-666666666666'
);

update auction_instances
set state_data = jsonb_set(
      state_data,
      '{teams}',
      (
        select jsonb_agg(team || jsonb_build_object('purse', 30) order by position)
        from jsonb_array_elements(state_data->'teams') with ordinality as current_team(team, position)
      )
    ),
    updated_at = now()
where archived = false
  and jsonb_typeof(state_data->'teams') = 'array';

do $$
begin
  if (select count(*) from auction_teams where purse = 30) <> 6 then
    raise exception 'Expected all six PHF teams to have a 30 CR purse';
  end if;
end $$;

commit;
