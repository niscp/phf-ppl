import type { AuctionPlayer, AuctionSnapshot, AuctionTeam } from "./auction-client";

export type RoleCount = { label: string; count: number };
export type HighlightPurchase = AuctionPlayer & { team: AuctionTeam };
export type HighlightTeam = AuctionTeam & {
  captain: AuctionPlayer | null;
  squad: AuctionPlayer[];
  purchases: HighlightPurchase[];
  topPurchase: HighlightPurchase | null;
  calculatedSpent: number;
  remaining: number;
  roles: RoleCount[];
};

export type AuctionHighlights = {
  complete: boolean;
  soldCount: number;
  squadCount: number;
  totalSpend: number;
  averageSale: number;
  highestSale: HighlightPurchase | null;
  purchases: HighlightPurchase[];
  teams: HighlightTeam[];
  roles: RoleCount[];
};

const roleOrder = ["All-rounders", "Batters", "Bowlers", "Wicketkeepers", "Other"];

export function roleLabel(role: string) {
  const normalized = role.toLowerCase().replace(/[ _-]/g, "");
  if (["allrounder", "allrounders"].includes(normalized)) return "All-rounders";
  if (["batter", "batsman", "batsmen", "batswoman"].includes(normalized)) return "Batters";
  if (["bowler", "bowlers"].includes(normalized)) return "Bowlers";
  if (["wicketkeeper", "wicketkeepers", "wk", "keeper"].includes(normalized)) return "Wicketkeepers";
  return "Other";
}

function roleCounts(players: AuctionPlayer[]): RoleCount[] {
  const counts = new Map(roleOrder.map((label) => [label, 0]));
  players.forEach((player) => counts.set(roleLabel(player.role), (counts.get(roleLabel(player.role)) ?? 0) + 1));
  return roleOrder.map((label) => ({ label, count: counts.get(label) ?? 0 })).filter((item) => item.count > 0);
}

export function buildAuctionHighlights(snapshot: AuctionSnapshot): AuctionHighlights {
  const teamById = new Map(snapshot.teams.map((team) => [team.id, team]));
  const purchases = snapshot.players
    .filter((player) => player.status === "sold" && player.team_id && player.sold_price !== null && teamById.has(player.team_id))
    .map((player) => ({ ...player, team: teamById.get(player.team_id!)! }))
    .sort((a, b) => Number(b.sold_price) - Number(a.sold_price) || a.name.localeCompare(b.name));
  const assigned = snapshot.players.filter((player) => ["captain", "sold"].includes(player.status) && player.team_id);
  const teams = snapshot.teams.map((team) => {
    const squad = assigned
      .filter((player) => player.team_id === team.id)
      .sort((a, b) => a.status === "captain" ? -1 : b.status === "captain" ? 1 : Number(b.sold_price ?? 0) - Number(a.sold_price ?? 0) || a.name.localeCompare(b.name));
    const teamPurchases = purchases.filter((player) => player.team_id === team.id);
    const calculatedSpent = teamPurchases.reduce((sum, player) => sum + Number(player.sold_price ?? 0), 0);
    return {
      ...team,
      captain: squad.find((player) => player.status === "captain") ?? null,
      squad,
      purchases: teamPurchases,
      topPurchase: teamPurchases[0] ?? null,
      calculatedSpent,
      remaining: Number(team.purse) - calculatedSpent,
      roles: roleCounts(squad),
    };
  }).sort((a, b) => b.calculatedSpent - a.calculatedSpent || a.name.localeCompare(b.name));
  const totalSpend = purchases.reduce((sum, player) => sum + Number(player.sold_price ?? 0), 0);
  return {
    complete: snapshot.config?.status === "complete",
    soldCount: purchases.length,
    squadCount: assigned.length,
    totalSpend,
    averageSale: purchases.length ? totalSpend / purchases.length : 0,
    highestSale: purchases[0] ?? null,
    purchases,
    teams,
    roles: roleCounts(assigned),
  };
}
