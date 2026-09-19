import { createClient } from "@supabase/supabase-js";
import { announcedCaptains, announcedTeams } from "./season5-teams";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Only the publishable/anon key belongs in the browser. Never use a service-role key here.
export const auctionClient = url && key ? createClient(url, key) : null;

export type AuctionStatus = "preparing" | "live" | "paused" | "complete";
export type PlayerStatus = "queued" | "captain" | "up" | "sold" | "unsold";

export type AuctionConfig = {
  status: AuctionStatus;
  current_player_id: string | null;
  minimum_increment: number | null;
  default_base_price: number | null;
  min_squad_size: number;
  max_squad_size: number | null;
  money_label: string | null;
};

export type AuctionTeam = {
  id: string;
  name: string;
  logo_url: string | null;
  purse: number;
  spent: number;
};

export type AuctionPlayer = {
  id: string;
  name: string;
  role: string;
  photo: string | null;
  status: PlayerStatus;
  team_id: string | null;
  sold_price: number | null;
  current_bid: number | null;
  current_bid_team_id: string | null;
  base_price: number | null;
};

export type AuctionEvent = {
  id: number;
  event_type: string;
  player_id: string;
  team_id: string | null;
  amount: number | null;
  created_at: string;
};

export type AuctionSnapshot = {
  config: AuctionConfig | null;
  teams: AuctionTeam[];
  players: AuctionPlayer[];
  events: AuctionEvent[];
};

export const preAuctionSnapshot: AuctionSnapshot = { config: null, teams: announcedTeams, players: announcedCaptains, events: [] };

export async function getAuctionSnapshot(): Promise<AuctionSnapshot> {
  if (!auctionClient) return preAuctionSnapshot;
  const [config, teams, players, events] = await Promise.all([
    auctionClient.from("auction_config").select("status,current_player_id,minimum_increment,default_base_price,min_squad_size,max_squad_size,money_label").eq("id", 1).maybeSingle(),
    auctionClient.from("auction_teams").select("id,name,logo_url,purse,spent").order("name"),
    auctionClient.from("auction_players").select("id,name,role,photo,status,team_id,sold_price,current_bid,current_bid_team_id,base_price").order("name"),
    auctionClient.from("auction_events").select("id,event_type,player_id,team_id,amount,created_at").order("id", { ascending: false }).limit(12),
  ]);
  const error = config.error ?? teams.error ?? players.error ?? events.error;
  if (error) throw error;
  return {
    config: config.data as AuctionConfig | null,
    teams: (teams.data ?? []) as AuctionTeam[],
    players: (players.data ?? []) as AuctionPlayer[],
    events: (events.data ?? []) as AuctionEvent[],
  };
}
