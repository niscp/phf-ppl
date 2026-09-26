import { normalizeAuctionState } from './auction-units.mjs';
import { activeAuctionRound } from './auction-rounds.mjs';

const round2 = (value) => Math.round(Number(value) * 100) / 100;
const squadSize = (state, teamId) => state.players.filter((p) => p.team_id === teamId && ['captain', 'sold'].includes(p.status)).length;

export function undoLastBid(state, config) {
  const player = state.players.find((item) => item.id === config.current_player_id);
  if (!player || !['live', 'paused'].includes(config.status)) throw new Error('No current player to update');
  let lastBidIndex = -1;
  for (let index = state.events.length - 1; index >= 0; index -= 1) {
    const event = state.events[index];
    if (event.event_type === 'bid' && event.player_id === player.id) { lastBidIndex = index; break; }
  }
  if (lastBidIndex < 0) throw new Error('No bid to undo');
  const [removed] = state.events.splice(lastBidIndex, 1);
  const previous = [...state.events].reverse().find((event) => event.event_type === 'bid' && event.player_id === player.id);
  player.current_bid = previous?.amount ?? null;
  player.current_bid_team_id = previous?.team_id ?? null;
  state.events.push({ event_type: 'bid_undone', player_id: player.id, team_id: removed.team_id, amount: removed.amount, created_at: new Date().toISOString() });
  return { removed, previous: previous ?? null };
}

export async function runInstanceAction(db, actorId, auctionId, name, p = {}) {
  const result = await db.query('select * from auction_instances where id=$1 and archived=false for update', [auctionId]);
  const room = result.rows[0];
  if (!room) throw new Error('Auction not found');
  const state = normalizeAuctionState(room.state_data || {});
  const config = state.config;
  if (!config) throw new Error('Auction is not configured');
  let data = null;

  switch (name) {
    case 'auction_set_status': {
      const next = p.p_status;
      // Mobile networks can retry a completed request after losing its response.
      // Treat setting the current status as a successful no-op instead of showing
      // an invalid-transition error when the first request already succeeded.
      if (config.status === next) break;
      const valid = (config.status === 'preparing' && next === 'live') ||
        (config.status === 'live' && next === 'paused') ||
        (config.status === 'paused' && ['live', 'complete'].includes(next));
      if (!valid) throw new Error('Invalid auction status transition');
      if (next === 'live' && config.status === 'preparing') {
        const captains = state.players.filter((player) => player.status === 'captain').length;
        if (!state.teams.length || captains !== state.teams.length) throw new Error('Assign one captain to every team before starting');
        if (state.players.length < state.teams.length * config.min_squad_size) throw new Error('Not enough players to complete minimum squads');
      }
      if (next === 'complete' && (config.current_player_id || state.players.some((player) => !['captain', 'sold'].includes(player.status)))) throw new Error('Allocate every player before completing the auction');
      config.status = next;
      break;
    }
    case 'auction_start_random_player': {
      if (config.status !== 'live' || config.current_player_id) throw new Error('Finish the current player or resume the auction');
      const round = activeAuctionRound(state.players.filter((player) => player.status === 'queued'));
      if (!round) throw new Error('No queued players remain');
      const selected = round.players[Math.floor(Math.random() * round.players.length)];
      const player = state.players.find((item) => item.id === selected.id);
      player.status = 'up'; config.current_player_id = player.id;
      state.events.push({ event_type: 'called', player_id: player.id, team_id: null, amount: null, created_at: new Date().toISOString() });
      data = { player_id: player.id, round: round.key };
      break;
    }
    case 'auction_place_bid': {
      if (config.status !== 'live' || !config.current_player_id) throw new Error('No live player on the block');
      const player = state.players.find((item) => item.id === config.current_player_id);
      const team = state.teams.find((item) => item.id === p.p_team_id);
      if (!team) throw new Error('Choose a team');
      const increment = player.current_bid != null && Number(player.current_bid) >= Number(config.increment_threshold)
        ? Number(config.increment_above_threshold) : Number(config.minimum_increment);
      const minimum = player.current_bid == null ? Number(player.base_price ?? config.default_base_price) : round2(Number(player.current_bid) + increment);
      const value = round2(p.p_amount);
      const reserveTarget = Number(config.max_squad_size ?? config.min_squad_size);
      const reserve = Math.max(0, reserveTarget - squadSize(state, team.id) - 1) * Number(config.default_base_price);
      if (!Number.isFinite(value) || value < minimum) throw new Error('Bid is below the next valid amount');
      if (squadSize(state, team.id) >= Number(config.max_squad_size)) throw new Error('Team squad is full');
      if (value > Number(team.purse) - Number(team.spent) - reserve) throw new Error('Bid would leave too little purse to complete a full squad');
      player.current_bid = value; player.current_bid_team_id = team.id;
      state.events.push({ event_type: 'bid', player_id: player.id, team_id: team.id, amount: value, created_at: new Date().toISOString() });
      break;
    }
    case 'auction_sell_current': {
      if (config.status !== 'live' || !config.current_player_id) throw new Error('No live player');
      const player = state.players.find((item) => item.id === config.current_player_id);
      const team = state.teams.find((item) => item.id === player.current_bid_team_id);
      if (!team || player.current_bid == null) throw new Error('Record a bid first');
      if (Number(team.spent) + Number(player.current_bid) > Number(team.purse)) throw new Error('Team cannot complete this purchase');
      team.spent = round2(Number(team.spent) + Number(player.current_bid));
      player.status = 'sold'; player.team_id = team.id; player.sold_price = player.current_bid;
      config.current_player_id = null;
      state.events.push({ event_type: 'sold', player_id: player.id, team_id: team.id, amount: player.current_bid, created_at: new Date().toISOString() });
      break;
    }
    case 'auction_mark_unsold': {
      if (config.status !== 'live' || !config.current_player_id) throw new Error('No live player');
      const player = state.players.find((item) => item.id === config.current_player_id);
      player.status = 'unsold'; player.current_bid = null; player.current_bid_team_id = null;
      config.current_player_id = null;
      state.events.push({ event_type: 'unsold', player_id: player.id, team_id: null, amount: null, created_at: new Date().toISOString() });
      break;
    }
    case 'auction_reset_current_bids': {
      const player = state.players.find((item) => item.id === config.current_player_id);
      if (!player) throw new Error('No current player to reset');
      player.current_bid = null; player.current_bid_team_id = null;
      break;
    }
    case 'auction_undo_last_bid': {
      undoLastBid(state, config);
      break;
    }
    default: throw new Error('Action is not supported for concurrent auction rooms');
  }

  await db.query('update auction_instances set state_data=$1,updated_at=now() where id=$2', [state, auctionId]);
  await db.query('insert into auction_audit(actor_id,action,details) values($1,$2,$3)', [actorId, name, { auction_id: auctionId, ...p }]);
  return data;
}
