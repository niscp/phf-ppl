const round2 = (value) => Math.round(Number(value) * 100) / 100;

function requireOpenAuction(config) {
  if (!config || !["live", "paused"].includes(config.status)) throw new Error("Pause or open the auction before making corrections");
}

function assignedSquadSize(state, teamId, excludedPlayerId = null) {
  return state.players.filter((player) => player.id !== excludedPlayerId && player.team_id === teamId && ["captain", "sold"].includes(player.status)).length;
}

export function undoSaleInState(state, playerId) {
  const config = state.config;
  requireOpenAuction(config);
  const player = state.players.find((item) => item.id === playerId);
  if (!player || player.status !== "sold" || !player.team_id || player.sold_price == null) throw new Error("Choose a sold player");
  const team = state.teams.find((item) => item.id === player.team_id);
  if (!team) throw new Error("The player's team no longer exists");

  const previous = { team_id: player.team_id, amount: Number(player.sold_price) };
  team.spent = round2(Math.max(0, Number(team.spent) - previous.amount));
  player.status = "queued";
  player.team_id = null;
  player.sold_price = null;
  player.current_bid = null;
  player.current_bid_team_id = null;
  state.events.push({ event_type: "sale_undone", player_id: player.id, team_id: previous.team_id, amount: previous.amount, created_at: new Date().toISOString() });
  return previous;
}

export function manuallyAssignInState(state, playerId, teamId, rawAmount) {
  const config = state.config;
  requireOpenAuction(config);
  const player = state.players.find((item) => item.id === playerId);
  const target = state.teams.find((item) => item.id === teamId);
  if (!player || player.status === "captain") throw new Error("Choose an auction player");
  if (!target) throw new Error("Choose a team");

  const amount = round2(rawAmount);
  const base = Number(player.base_price ?? config.default_base_price);
  if (!Number.isFinite(amount) || Math.round(amount * 100) !== amount * 100 || amount < base) throw new Error(`Manual amount must be at least ${base} CR`);

  const previousTeam = player.status === "sold" ? state.teams.find((item) => item.id === player.team_id) : null;
  const previousAmount = player.status === "sold" ? Number(player.sold_price || 0) : 0;
  const targetSpentBefore = round2(Number(target.spent) - (previousTeam?.id === target.id ? previousAmount : 0));
  const squad = assignedSquadSize(state, target.id, player.id);
  const maxSquad = Number(config.max_squad_size ?? config.min_squad_size);
  if (squad >= maxSquad) throw new Error("Team squad is full");
  const reserve = Math.max(0, maxSquad - squad - 1) * Number(config.default_base_price);
  if (amount > Number(target.purse) - targetSpentBefore - reserve) throw new Error("Amount would leave too little purse to complete a full squad");

  if (previousTeam) previousTeam.spent = round2(Math.max(0, Number(previousTeam.spent) - previousAmount));
  target.spent = round2(Number(target.spent) + amount);
  player.status = "sold";
  player.team_id = target.id;
  player.sold_price = amount;
  player.current_bid = amount;
  player.current_bid_team_id = target.id;
  if (config.current_player_id === player.id) config.current_player_id = null;
  state.events.push({ event_type: "manual_assigned", player_id: player.id, team_id: target.id, amount, created_at: new Date().toISOString() });
  return { previous_team_id: previousTeam?.id ?? null, previous_amount: previousAmount || null, team_id: target.id, amount };
}
