import type { AuctionConfig, AuctionPlayer, AuctionTeam } from "./auction-client";

export function nextBid(player: AuctionPlayer | undefined, config: AuctionConfig | null): number | null {
  if (!player || !config) return null;
  if (player.current_bid !== null) {
    const currentBid = Number(player.current_bid);
    const threshold = config.increment_threshold === null ? null : Number(config.increment_threshold);
    const standardIncrement = Number(config.minimum_increment ?? 0);
    const higherIncrement = Number(config.increment_above_threshold ?? standardIncrement);
    const increment = threshold !== null && currentBid >= threshold ? higherIncrement : standardIncrement;
    return Math.round((currentBid + increment) * 100) / 100;
  }
  const openingBid = player.base_price ?? config.default_base_price;
  return openingBid === null ? null : Number(openingBid);
}

export function squadSize(players: AuctionPlayer[], teamId: string): number {
  return players.filter((player) => player.team_id === teamId && (player.status === "captain" || player.status === "sold")).length;
}

export function maxBidAllowed(team: AuctionTeam, players: AuctionPlayer[], config: AuctionConfig | null): number {
  if (!config || config.default_base_price === null) return 0;
  const targetSquadSize = Number(config.max_squad_size ?? config.min_squad_size);
  const openSlotsNeeded = Math.max(0, targetSquadSize - squadSize(players, team.id) - 1);
  return Math.max(0, Number(team.purse) - Number(team.spent) - openSlotsNeeded * Number(config.default_base_price));
}

export function provisionalPurse(team: AuctionTeam, current: AuctionPlayer | undefined): number {
  return Number(team.purse) - Number(team.spent) - (current?.current_bid_team_id === team.id ? Number(current.current_bid ?? 0) : 0);
}

export function canBid(team: AuctionTeam, players: AuctionPlayer[], current: AuctionPlayer | undefined, config: AuctionConfig | null): boolean {
  const next = nextBid(current, config);
  return Boolean(config && current && next !== null && squadSize(players, team.id) < (config.max_squad_size ?? 0) && next <= maxBidAllowed(team, players, config));
}
