export const AUCTION_ROUNDS = [
  { key: "batter", label: "Batters" },
  { key: "bowler", label: "Bowlers" },
  { key: "all-rounder", label: "All-rounders" },
  { key: "wicketkeeper", label: "Wicketkeepers" },
];

export function roleGroup(role = "") {
  const value = String(role).trim().toLowerCase().replace(/[ _-]/g, "");
  if (["batter", "batsman", "batsmen", "batswoman"].includes(value)) return "batter";
  if (["bowler", "bowlers"].includes(value)) return "bowler";
  if (value === "allrounder") return "all-rounder";
  if (["wicketkeeper", "wk", "keeper"].includes(value)) return "wicketkeeper";
  return "other";
}

export function activeAuctionRound(players = []) {
  const queued = players.filter((player) => player.status === "queued");
  const opener = queued.find((player) => player.id === "player-79");
  if (opener) return { key: "opening", label: "Opening player · Yogesh", players: [opener] };
  for (const round of AUCTION_ROUNDS) {
    const pool = queued.filter((player) => roleGroup(player.role) === round.key);
    if (pool.length) return { ...round, players: pool };
  }
  return queued.length ? { key: "other", label: "Other players", players: queued } : null;
}
