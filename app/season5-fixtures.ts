export const fixtureTeamOrder = [
  "22222222-2222-4222-8222-222222222222", // Prestige Super Giants
  "44444444-4444-4444-8444-444444444444", // High Flyers
  "66666666-6666-4666-8666-666666666666", // PHF Amigos
  "55555555-5555-4555-8555-555555555555", // PHF Avengers
  "11111111-1111-4111-8111-111111111111", // PHF Blasterz
  "33333333-3333-4333-8333-333333333333", // PHF Super Kings
] as const;

export const seasonFiveFixtures = [
  { match_number: 1, date: "2026-11-21", reportTime: "6:45 AM", time: "7:00 AM", home_slot: 1, away_slot: 6 },
  { match_number: 2, date: "2026-11-21", reportTime: "10:00 AM", time: "10:15 AM", home_slot: 2, away_slot: 5 },
  { match_number: 3, date: "2026-11-21", reportTime: "1:30 PM", time: "1:45 PM", home_slot: 3, away_slot: 4 },
  { match_number: 4, date: "2026-11-22", reportTime: "6:45 AM", time: "7:00 AM", home_slot: 1, away_slot: 5 },
  { match_number: 5, date: "2026-11-22", reportTime: "10:00 AM", time: "10:15 AM", home_slot: 6, away_slot: 4 },
  { match_number: 6, date: "2026-11-22", reportTime: "1:30 PM", time: "1:45 PM", home_slot: 2, away_slot: 3 },
  { match_number: 7, date: "2026-11-28", reportTime: "6:45 AM", time: "7:00 AM", home_slot: 6, away_slot: 2 },
  { match_number: 8, date: "2026-11-28", reportTime: "10:00 AM", time: "10:15 AM", home_slot: 1, away_slot: 4 },
  { match_number: 9, date: "2026-11-28", reportTime: "1:30 PM", time: "1:45 PM", home_slot: 5, away_slot: 3 },
  { match_number: 10, date: "2026-11-29", reportTime: "6:45 AM", time: "7:00 AM", home_slot: 4, away_slot: 2 },
  { match_number: 11, date: "2026-11-29", reportTime: "10:00 AM", time: "10:15 AM", home_slot: 1, away_slot: 3 },
  { match_number: 12, date: "2026-11-29", reportTime: "1:30 PM", time: "1:45 PM", home_slot: 5, away_slot: 6 },
  { match_number: 13, date: "2026-12-05", reportTime: "6:45 AM", time: "7:00 AM", home_slot: 3, away_slot: 6 },
  { match_number: 14, date: "2026-12-05", reportTime: "10:00 AM", time: "10:15 AM", home_slot: 4, away_slot: 5 },
  { match_number: 15, date: "2026-12-05", reportTime: "1:30 PM", time: "1:45 PM", home_slot: 1, away_slot: 2 },
] as const;

export const seasonFiveFixtureDays = [
  { date: "21 Nov", matches: seasonFiveFixtures.slice(0, 3) },
  { date: "22 Nov", matches: seasonFiveFixtures.slice(3, 6) },
  { date: "28 Nov", matches: seasonFiveFixtures.slice(6, 9) },
  { date: "29 Nov", matches: seasonFiveFixtures.slice(9, 12) },
  { date: "05 Dec", matches: seasonFiveFixtures.slice(12, 15) },
];

export function teamNameForSlot(slot: number, teams: Array<{ id: string; name: string }>) {
  const id = fixtureTeamOrder[slot - 1];
  return teams.find((team) => team.id === id)?.name ?? `Team ${slot}`;
}
