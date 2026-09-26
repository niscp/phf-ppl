const RUPEES_PER_CR = 10_000_000;

function cr(value) {
  if (value === null || value === undefined) return value;
  return Math.round((Number(value) / RUPEES_PER_CR) * 100) / 100;
}

export function normalizeAuctionState(input = {}) {
  const state = structuredClone(input || {});
  const config = state.config || {};
  const teams = Array.isArray(state.teams) ? state.teams : [];
  const legacy = [config.default_base_price, ...teams.map((team) => team.purse)].some((value) => Number(value) >= RUPEES_PER_CR);
  if (!legacy) return state;
  for (const key of ["default_base_price", "minimum_increment"]) config[key] = cr(config[key]);
  // The old rehearsal stored these two settings as display numbers while the
  // purse/base were raw rupees. Give migrated auctions clean, safe CR steps.
  config.increment_threshold = Number(config.increment_threshold) < RUPEES_PER_CR ? 10 : cr(config.increment_threshold);
  config.increment_above_threshold = Number(config.increment_above_threshold) < RUPEES_PER_CR ? 2 : cr(config.increment_above_threshold);
  config.money_label = "CR";
  state.config = config;
  state.teams = teams.map((team) => ({ ...team, purse: cr(team.purse), spent: cr(team.spent) }));
  state.players = (state.players || []).map((player) => ({ ...player, base_price: cr(player.base_price), current_bid: cr(player.current_bid), sold_price: cr(player.sold_price) }));
  state.events = (state.events || []).map((event) => ({ ...event, amount: cr(event.amount) }));
  return state;
}

export async function migrateActiveAuctionToCr(db) {
  const { rows } = await db.query("select default_base_price::float8 base,money_label from auction_config where id=1");
  if (!rows[0] || Number(rows[0].base) < RUPEES_PER_CR) return false;
  await db.query("begin");
  try {
    await db.query(`update auction_config set
      default_base_price=round(default_base_price::numeric/$1),
      minimum_increment=round(minimum_increment::numeric/$1),
      increment_threshold=case when increment_threshold<$1 then 10 else round(increment_threshold::numeric/$1) end,
      increment_above_threshold=case when increment_above_threshold<$1 then 2 else round(increment_above_threshold::numeric/$1) end,
      money_label='CR',updated_at=now() where id=1`, [RUPEES_PER_CR]);
    await db.query("update auction_teams set purse=round(purse::numeric/$1),spent=round(spent::numeric/$1)", [RUPEES_PER_CR]);
    await db.query("update auction_players set base_price=round(base_price::numeric/$1),current_bid=round(current_bid::numeric/$1),sold_price=round(sold_price::numeric/$1)", [RUPEES_PER_CR]);
    await db.query("update auction_events set amount=round(amount::numeric/$1)", [RUPEES_PER_CR]);
    await db.query("commit");
    return true;
  } catch (error) {
    await db.query("rollback");
    throw error;
  }
}
