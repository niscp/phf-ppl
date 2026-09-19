import type { AuctionConfig, AuctionPlayer, AuctionTeam } from "./auction-client";

export function nextBid(player: AuctionPlayer | undefined, config: AuctionConfig | null): number | null {
  if (!player || !config) return null;
  if (player.current_bid !== null) return player.current_bid + (config.minimum_increment ?? 0);
  return player.base_price ?? config.default_base_price;
}

export function squadSize(players: AuctionPlayer[], teamId: string): number {
  return players.filter((player) => player.team_id === teamId && (player.status === "captain" || player.status === "sold")).length;
}

export function maxBidAllowed(team: AuctionTeam, players: AuctionPlayer[], config: AuctionConfig | null): number {
  if (!config || config.default_base_price === null) return 0;
  const openSlotsNeeded = Math.max(0, config.min_squad_size - squadSize(players, team.id) - 1);
  return Math.max(0, team.purse - team.spent - openSlotsNeeded * config.default_base_price);
}

export function provisionalPurse(team: AuctionTeam, current: AuctionPlayer | undefined): number {
  return team.purse - team.spent - (current?.current_bid_team_id === team.id ? current.current_bid ?? 0 : 0);
}

export function canBid(team: AuctionTeam, players: AuctionPlayer[], current: AuctionPlayer | undefined, config: AuctionConfig | null): boolean {
  const next = nextBid(current, config);
  return Boolean(config && current && next !== null && squadSize(players, team.id) < (config.max_squad_size ?? 0) && next <= maxBidAllowed(team, players, config));
}
