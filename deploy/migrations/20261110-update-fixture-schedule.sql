begin;

alter table tournament_matches
  add column if not exists report_time text not null default '';

update tournament_matches as tm
set report_time = schedule.report_time,
    match_time = schedule.match_time,
    updated_at = now()
from (values
  (1, '6:45 AM', '7:00 AM'),
  (2, '10:00 AM', '10:15 AM'),
  (3, '1:30 PM', '1:45 PM'),
  (4, '6:45 AM', '7:00 AM'),
  (5, '10:00 AM', '10:15 AM'),
  (6, '1:30 PM', '1:45 PM'),
  (7, '6:45 AM', '7:00 AM'),
  (8, '10:00 AM', '10:15 AM'),
  (9, '1:30 PM', '1:45 PM'),
  (10, '6:45 AM', '7:00 AM'),
  (11, '10:00 AM', '10:15 AM'),
  (12, '1:30 PM', '1:45 PM'),
  (13, '6:45 AM', '7:00 AM'),
  (14, '10:00 AM', '10:15 AM'),
  (15, '1:30 PM', '1:45 PM')
) as schedule(match_number, report_time, match_time)
where tm.match_number = schedule.match_number
  and tm.status = 'scheduled';

commit;
