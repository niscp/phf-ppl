begin;

update auction_teams
set name = 'PHF Super Kings'
where id = '33333333-3333-4333-8333-333333333333';

update auction_instances
set state_data = jsonb_set(
  state_data,
  '{teams}',
  (
    select jsonb_agg(
      case
        when team.value->>'id' = '33333333-3333-4333-8333-333333333333'
          then team.value || jsonb_build_object('name', 'PHF Super Kings', 'logo_url', '/team-logos/super-phf-kings.jpg')
        else team.value
      end
      order by team.ordinality
    )
    from jsonb_array_elements(state_data->'teams') with ordinality as team(value, ordinality)
  ),
  false
),
updated_at = now()
where jsonb_typeof(state_data->'teams') = 'array'
  and exists (
    select 1 from jsonb_array_elements(state_data->'teams') team
    where team->>'id' = '33333333-3333-4333-8333-333333333333'
  );

commit;
