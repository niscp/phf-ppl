import { announcedCaptains, announcedTeams } from "./season5-teams";

const apiUrl = (import.meta.env.VITE_AUCTION_API_URL || "").replace(/\/$/, "");
const tokenKey = "phf-auction-token";

export type AuctionSession = { access_token: string; user: { id: string; email: string } };
type AuthListener = (event: string, session: AuctionSession | null) => void;
const authListeners = new Set<AuthListener>();

function storedSession(): AuctionSession | null {
  if (typeof window === "undefined") return null;
  const token = window.localStorage.getItem(tokenKey);
  const userJson = window.localStorage.getItem(`${tokenKey}-user`);
  if (!token || !userJson) return null;
  try { return { access_token: token, user: JSON.parse(userJson) }; } catch { return null; }
}

async function request(path: string, init: RequestInit = {}) {
  if (!apiUrl) throw new Error("Auction API is not configured");
  const session = storedSession();
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}), ...init.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

export const auctionClient = apiUrl ? {
  auth: {
    async getSession() { return { data: { session: storedSession() } }; },
    onAuthStateChange(listener: AuthListener) { authListeners.add(listener); return { data: { subscription: { unsubscribe: () => { authListeners.delete(listener); } } } }; },
    async signInWithPassword(credentials: { email: string; password: string }) {
      try {
        const body = await request("/api/auth/login", { method: "POST", body: JSON.stringify({ username: credentials.email, password: credentials.password }) });
        window.localStorage.setItem(tokenKey, body.token); window.localStorage.setItem(`${tokenKey}-user`, JSON.stringify(body.user));
        const session = storedSession(); authListeners.forEach((listener) => listener("SIGNED_IN", session));
        return { data: { session }, error: null };
      } catch (error) { return { data: { session: null }, error: error as Error }; }
    },
    async signOut() {
      window.localStorage.removeItem(tokenKey); window.localStorage.removeItem(`${tokenKey}-user`);
      authListeners.forEach((listener) => listener("SIGNED_OUT", null)); return { error: null };
    },
  },
  async rpc(name: string, args: Record<string, unknown> = {}) {
    try {
      if (name === "is_auction_admin") {
        const body = await request("/api/auth/me"); return { data: body.admin === true, error: null };
      }
      const body = await request("/api/admin/action", { method: "POST", body: JSON.stringify({ name, args }) });
      return { data: body.data, error: null };
    } catch (error) { return { data: null, error: error as Error }; }
  },
  async listAuctions() {
    try { const body = await request("/api/admin/auctions"); return { data: body.auctions as AuctionInstance[], error: null }; }
    catch (error) { return { data: [] as AuctionInstance[], error: error as Error }; }
  },
  channel(_name?: string) {
    let callback: (() => void) | null = null;
    return {
      on(_event: string, _filter: unknown, listener: () => void) { callback = listener; return this; },
      subscribe() {
        const wsUrl = apiUrl.replace(/^http/, "ws");
        const socket = new WebSocket(`${wsUrl}/ws`);
        socket.onmessage = () => callback?.();
        return { socket };
      },
    };
  },
  async removeChannel(channel: { socket?: WebSocket }) { channel.socket?.close(); },
} : null;

export type AuctionStatus = "preparing" | "live" | "paused" | "complete";
export type AuctionInstance = { id: string; name: string; kind: "official" | "demo"; active: boolean; archived: boolean; status: AuctionStatus; player_count: number; created_at: string; updated_at: string };
export type PlayerStatus = "queued" | "captain" | "up" | "sold" | "unsold";
export type AuctionConfig = { status: AuctionStatus; current_player_id: string | null; minimum_increment: number | null; increment_threshold: number | null; increment_above_threshold: number | null; default_base_price: number | null; min_squad_size: number; max_squad_size: number | null; money_label: string | null };
export type AuctionTeam = { id: string; name: string; logo_url: string | null; purse: number; spent: number };
export type AuctionPlayer = { id: string; name: string; role: string; photo: string | null; status: PlayerStatus; team_id: string | null; sold_price: number | null; current_bid: number | null; current_bid_team_id: string | null; base_price: number | null };
export type AuctionEvent = { id: number; event_type: string; player_id: string; team_id: string | null; amount: number | null; created_at: string };
export type AuctionSnapshot = { auction?: { id: string; name: string; kind: "official" | "demo" } | null; config: AuctionConfig | null; teams: AuctionTeam[]; players: AuctionPlayer[]; events: AuctionEvent[] };

export const preAuctionSnapshot: AuctionSnapshot = { config: null, teams: announcedTeams, players: announcedCaptains, events: [] };
export async function getAuctionSnapshot(): Promise<AuctionSnapshot> {
  if (!auctionClient) return preAuctionSnapshot;
  return request("/api/auction") as Promise<AuctionSnapshot>;
}
