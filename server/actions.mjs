import { normalizeAuctionState } from "./auction-units.mjs";
import { activeAuctionRound, roleGroup } from "./auction-rounds.mjs";

const allowedStatuses = new Set(["live", "paused", "complete"]);

async function audit(db, actorId, action, details = {}) {
  await db.query("insert into auction_audit(actor_id,action,details) values($1,$2,$3)", [actorId, action, details]);
}

async function configForUpdate(db) {
  const { rows } = await db.query("select * from auction_config where id=1 for update");
  return rows[0];
}

async function currentState(db) {
  const [config, teams, players, events] = await Promise.all([
    db.query("select * from auction_config where id=1"),
    db.query("select * from auction_teams order by name"),
    db.query("select * from auction_players order by name"),
    db.query("select event_type,player_id,team_id,amount,created_at from auction_events order by id"),
  ]);
  return { config: config.rows[0], teams: teams.rows, players: players.rows, events: events.rows };
}

export async function saveActiveState(db) {
  const active = (await db.query("select id from auction_instances where active=true for update")).rows[0];
  if (!active) return null;
  await db.query("update auction_instances set state_data=$1,updated_at=now() where id=$2", [await currentState(db), active.id]);
  return active.id;
}

function resetState(source, rules = {}) {
  source = normalizeAuctionState(source);
  const purse = Number(rules.purse || source.teams?.[0]?.purse || 30);
  return {
    config: {
      status: "preparing", current_player_id: null,
      default_base_price: Number(rules.base || source.config?.default_base_price || 1),
      minimum_increment: Number(rules.increment || source.config?.minimum_increment || 1),
      increment_threshold: Number(rules.threshold || source.config?.increment_threshold || 28),
      increment_above_threshold: Number(rules.incrementAbove || source.config?.increment_above_threshold || 1),
      min_squad_size: Number(rules.minSquad || source.config?.min_squad_size || 14),
      max_squad_size: Number(rules.maxSquad || source.config?.max_squad_size || 15),
      money_label: String(rules.moneyLabel || source.config?.money_label || "CR"),
    },
    teams: (source.teams || []).map((team) => ({ ...team, purse, spent: 0 })),
    players: (source.players || []).map((player) => ({ ...player, status: player.status === "captain" ? "captain" : "queued", team_id: player.status === "captain" ? player.team_id : null, sold_price: player.status === "captain" ? 0 : null, current_bid: null, current_bid_team_id: null, base_price: null })),
    events: [],
  };
}

async function loadState(db, state) {
  state = normalizeAuctionState(state);
  await db.query("update auction_config set current_player_id=null where id=1");
  await db.query("delete from auction_events");
  await db.query("delete from auction_players");
  await db.query("delete from auction_teams");
  for (const team of state.teams || []) await db.query("insert into auction_teams(id,name,logo_url,purse,spent) values($1,$2,$3,$4,$5)", [team.id, team.name, team.logo_url || null, team.purse, team.spent || 0]);
  for (const player of state.players || []) await db.query(`insert into auction_players(id,name,role,photo,status,team_id,sold_price,current_bid,current_bid_team_id,base_price) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [player.id, player.name, player.role, player.photo || null, player.status, player.team_id || null, player.sold_price, player.current_bid, player.current_bid_team_id || null, player.base_price]);
  const config = state.config || {};
  await db.query(`update auction_config set status=$1,current_player_id=$2,default_base_price=$3,minimum_increment=$4,increment_threshold=$5,increment_above_threshold=$6,min_squad_size=$7,max_squad_size=$8,money_label=$9,updated_at=now() where id=1`, [config.status || "preparing", config.current_player_id || null, config.default_base_price, config.minimum_increment, config.increment_threshold, config.increment_above_threshold, config.min_squad_size || 14, config.max_squad_size || 15, config.money_label || "CR"]);
  for (const event of state.events || []) await db.query("insert into auction_events(event_type,player_id,team_id,amount,created_at) values($1,$2,$3,$4,$5)", [event.event_type, event.player_id, event.team_id || null, event.amount, event.created_at || new Date()]);
}

export async function runAction(db, actorId, name, p = {}) {
  switch (name) {
    case "auction_create_instance": {
      const nameValue = String(p.p_name || "").trim();
      if (nameValue.length < 3 || nameValue.length > 80) throw new Error("Auction name must be 3–80 characters");
      const kind = p.p_kind === "official" ? "official" : "demo";
      const source = await currentState(db);
      const state = resetState(source, { purse: p.p_purse, base: p.p_base_price, increment: p.p_increment, threshold: p.p_increment_threshold, incrementAbove: p.p_increment_above_threshold, minSquad: p.p_min_squad_size, maxSquad: p.p_max_squad_size, moneyLabel: p.p_money_label });
      if (Array.isArray(p.p_players)) for (const player of p.p_players) {
        if (!/^player-[0-9]+$/.test(player.id || "") || String(player.name || "").trim().length < 2) throw new Error("Invalid player entry");
        if (!state.players.some((existing) => existing.id === player.id)) state.players.push({ id: player.id, name: String(player.name).trim(), role: player.role || "Player", photo: player.photo || null, status: "queued", team_id: null, sold_price: null, current_bid: null, current_bid_team_id: null, base_price: null });
      }
      const { rows } = await db.query("insert into auction_instances(name,kind,state_data) values($1,$2,$3) returning id", [nameValue, kind, state]);
      await audit(db, actorId, name, { auction_id: rows[0].id, auction_name: nameValue }); return rows[0].id;
    }
    case "auction_duplicate_instance": {
      const sourceRow = (await db.query("select * from auction_instances where id=$1 and archived=false", [p.p_id])).rows[0];
      if (!sourceRow) throw new Error("Auction not found");
      if (sourceRow.active) await saveActiveState(db);
      const fresh = (await db.query("select state_data from auction_instances where id=$1", [p.p_id])).rows[0].state_data;
      const copyName = String(p.p_name || `${sourceRow.name} copy`).trim();
      const { rows } = await db.query("insert into auction_instances(name,kind,state_data) values($1,'demo',$2) returning id", [copyName, resetState(fresh)]);
      await audit(db, actorId, name, { source_id: p.p_id, auction_id: rows[0].id }); return rows[0].id;
    }
    case "auction_open_instance": {
      const config = await configForUpdate(db);
      const target = (await db.query("select * from auction_instances where id=$1 and archived=false for update", [p.p_id])).rows[0];
      if (!target) throw new Error("Auction not found");
      if (target.active) return null;
      if (config.status === "live") throw new Error("Pause the live auction before switching");
      await saveActiveState(db);
      await loadState(db, target.state_data || resetState(await currentState(db)));
      await db.query("update auction_instances set active=false where active=true");
      await db.query("update auction_instances set active=true,updated_at=now() where id=$1", [target.id]);
      await audit(db, actorId, name, { auction_id: target.id }); return null;
    }
    case "auction_update_instance": {
      const nameValue = String(p.p_name || "").trim();
      if (nameValue.length < 3 || nameValue.length > 80) throw new Error("Auction name must be 3–80 characters");
      const { rowCount } = await db.query("update auction_instances set name=$1,kind=$2,updated_at=now() where id=$3 and archived=false", [nameValue, p.p_kind === "official" ? "official" : "demo", p.p_id]);
      if (!rowCount) throw new Error("Auction not found");
      await audit(db, actorId, name, { auction_id: p.p_id }); return null;
    }
    case "auction_archive_instance": {
      const { rowCount } = await db.query("update auction_instances set archived=true,updated_at=now() where id=$1 and active=false", [p.p_id]);
      if (!rowCount) throw new Error("Open another auction before archiving this one");
      await audit(db, actorId, name, { auction_id: p.p_id }); return null;
    }
    case "auction_delete_instance": {
      const { rowCount } = await db.query("delete from auction_instances where id=$1 and active=false and kind='demo'", [p.p_id]);
      if (!rowCount) throw new Error("Only an inactive demo auction can be deleted");
      await audit(db, actorId, name, { auction_id: p.p_id }); return null;
    }
    case "auction_import_players": {
      const config = await configForUpdate(db);
      if (config.status !== "preparing") throw new Error("Player import is closed");
      if (!Array.isArray(p.p_players) || p.p_players.length > 200) throw new Error("Invalid player import");
      for (const player of p.p_players) {
        if (!/^player-[0-9]+$/.test(player.id || "") || String(player.name || "").trim().length < 2) throw new Error("Invalid player entry");
        await db.query(`insert into auction_players(id,name,role,photo) values($1,$2,$3,$4)
          on conflict(id) do update set name=excluded.name,role=excluded.role,photo=excluded.photo,updated_at=now()
          where auction_players.status='queued'`, [player.id, String(player.name).trim(), player.role || "Player", player.photo || null]);
      }
      await db.query("delete from auction_players where id='player-65'");
      await audit(db, actorId, name, { submitted: p.p_players.length });
      return p.p_players.length;
    }
    case "auction_add_team": {
      const config = await configForUpdate(db);
      if (config.status !== "preparing") throw new Error("Teams are locked");
      const count = Number((await db.query("select count(*) from auction_teams")).rows[0].count);
      if (count >= 6) throw new Error("Six teams already exist");
      const purse = Number(p.p_purse);
      if (!Number.isFinite(purse) || purse <= 0 || Math.round(purse * 100) !== purse * 100) throw new Error("Purse must be a positive CR amount with at most two decimals");
      const { rows } = await db.query("insert into auction_teams(id,name,purse) values(gen_random_uuid(),$1,$2) returning id", [String(p.p_name || "").trim(), purse]);
      await audit(db, actorId, name, { team_id: rows[0].id });
      return rows[0].id;
    }
    case "auction_assign_captain": {
      const config = await configForUpdate(db);
      if (config.status !== "preparing") throw new Error("Captain assignments are locked");
      const { rowCount } = await db.query("update auction_players set status='captain',team_id=$1,sold_price=0,updated_at=now() where id=$2 and status='queued'", [p.p_team_id, p.p_player_id]);
      if (!rowCount) throw new Error("Choose a queued player");
      await db.query("insert into auction_events(event_type,player_id,team_id,amount) values('captain',$1,$2,0)", [p.p_player_id, p.p_team_id]);
      await audit(db, actorId, name, p); return null;
    }
    case "auction_unassign_captain": {
      const config = await configForUpdate(db);
      if (config.status !== "preparing") throw new Error("Captain assignments are locked");
      const { rowCount } = await db.query("update auction_players set status='queued',team_id=null,sold_price=null,updated_at=now() where id=$1 and status='captain'", [p.p_player_id]);
      if (!rowCount) throw new Error("Choose an assigned captain");
      await db.query("delete from auction_events where player_id=$1 and event_type='captain'", [p.p_player_id]);
      await audit(db, actorId, name, p); return null;
    }
    case "auction_set_rules": {
      const base = Number(p.p_base_price), increment = Number(p.p_increment), threshold = Number(p.p_increment_threshold), incrementAbove = Number(p.p_increment_above_threshold), min = Number(p.p_min_squad_size), max = Number(p.p_max_squad_size);
      const moneyValid = [base, increment, threshold, incrementAbove].every((value) => Number.isFinite(value) && Math.round(value * 100) === value * 100);
      if (!moneyValid || ![min, max].every(Number.isSafeInteger) || base < 1 || increment <= 0 || threshold < 0 || incrementAbove <= 0 || min < 1 || max < min) throw new Error("Invalid auction rules");
      const { rowCount } = await db.query(`update auction_config set default_base_price=$1,minimum_increment=$2,increment_threshold=$3,increment_above_threshold=$4,min_squad_size=$5,max_squad_size=$6,money_label=$7,updated_at=now() where id=1 and status='preparing'`, [base, increment, threshold, incrementAbove, min, max, String(p.p_money_label || "").trim()]);
      if (!rowCount) throw new Error("Rules are locked once the auction starts");
      await audit(db, actorId, name, p); return null;
    }
    case "auction_set_status": {
      const config = await configForUpdate(db); const next = p.p_status;
      if (!allowedStatuses.has(next)) throw new Error("Invalid auction status transition");
      // Status changes are idempotent so a mobile retry after a lost response does
      // not surface a false transition failure to the auctioneer.
      if (config.status === next) return null;
      if (next === "live" && config.status === "preparing") {
        const teamCount = Number((await db.query("select count(*) from auction_teams")).rows[0].count);
        const captainCount = Number((await db.query("select count(*) from auction_players where status='captain'")).rows[0].count);
        if (teamCount !== 6 || captainCount !== 6 || config.default_base_price === null || config.minimum_increment === null) throw new Error("Add six teams, six captains, players and auction rules first");
        const playerCount = Number((await db.query("select count(*) from auction_players")).rows[0].count);
        if (playerCount < teamCount * config.min_squad_size || playerCount > teamCount * config.max_squad_size) throw new Error("The player pool cannot form squads within the configured size range");
        const reserveTarget = Number(config.max_squad_size ?? config.min_squad_size);
        const underfunded = Number((await db.query("select count(*) from auction_teams where purse < $1", [(reserveTarget - 1) * Number(config.default_base_price)])).rows[0].count);
        if (underfunded) throw new Error("Every team purse must cover a full squad at base price");
      } else if (!(next === "live" && config.status === "paused") && !(next === "paused" && config.status === "live") && !(next === "complete" && config.status === "paused")) throw new Error("Invalid auction status transition");
      if (next === "complete") {
        if (config.current_player_id) throw new Error("Finish the current player first");
        const unallocated = Number((await db.query("select count(*) from auction_players where status not in ('captain','sold')")).rows[0].count);
        if (unallocated) throw new Error("Every registered player must be allocated before completing the auction");
        const { rows } = await db.query(`select min(n)::int min,max(n)::int max from (select count(p.id)::int n from auction_teams t left join auction_players p on p.team_id=t.id and p.status in ('captain','sold') group by t.id) s`);
        if (rows[0].min < config.min_squad_size || rows[0].max > config.max_squad_size || rows[0].max - rows[0].min > 1) throw new Error("Squads must stay within the configured size range and differ by at most one player");
      }
      await db.query("update auction_config set status=$1,updated_at=now() where id=1", [next]);
      await audit(db, actorId, name, { from: config.status, to: next }); return null;
    }
    case "auction_start_player": {
      const config = await configForUpdate(db);
      if (config.status !== "live" || config.current_player_id) throw new Error("Finish the current player or resume the auction");
      const queuedPlayers = (await db.query("select id,role,status from auction_players where status='queued'")).rows;
      const round = activeAuctionRound(queuedPlayers);
      const selected = queuedPlayers.find((player) => player.id === p.p_player_id);
      if (!selected || !round || (round.key === "opening" ? selected.id !== "player-79" : roleGroup(selected.role) !== round.key)) throw new Error(`Complete the ${round?.label || "current"} round first`);
      const { rowCount } = await db.query("update auction_players set status='up',updated_at=now() where id=$1 and status='queued'", [p.p_player_id]);
      if (!rowCount) throw new Error("Choose a queued player");
      await db.query("update auction_config set current_player_id=$1,updated_at=now() where id=1", [p.p_player_id]);
      await db.query("insert into auction_events(event_type,player_id) values('called',$1)", [p.p_player_id]);
      await audit(db, actorId, name, p); return null;
    }
    case "auction_start_random_player": {
      const config = await configForUpdate(db);
      if (config.status !== "live" || config.current_player_id) throw new Error("Finish the current player or resume the auction");
      const queuedPlayers = (await db.query("select id,role,status from auction_players where status='queued'")).rows;
      const round = activeAuctionRound(queuedPlayers);
      if (!round) throw new Error("No queued players remain");
      const selected = round.players[Math.floor(Math.random() * round.players.length)];
      await db.query("update auction_players set status='up',updated_at=now() where id=$1", [selected.id]);
      await db.query("update auction_config set current_player_id=$1,updated_at=now() where id=1", [selected.id]);
      await db.query("insert into auction_events(event_type,player_id) values('called',$1)", [selected.id]);
      await audit(db, actorId, name, { player_id: selected.id, round: round.key });
      return { player_id: selected.id, round: round.key };
    }
    case "auction_place_bid": {
      const config = await configForUpdate(db);
      if (config.status !== "live" || !config.current_player_id) throw new Error("No live player on the block");
      const player = (await db.query("select * from auction_players where id=$1 for update", [config.current_player_id])).rows[0];
      const team = (await db.query("select * from auction_teams where id=$1 for update", [p.p_team_id])).rows[0];
      if (!team) throw new Error("Choose a team");
      const squad = Number((await db.query("select count(*) from auction_players where team_id=$1 and status in ('captain','sold')", [team.id])).rows[0].count);
      const increment = config.increment_threshold !== null && Number(player.current_bid) >= Number(config.increment_threshold) ? Number(config.increment_above_threshold ?? config.minimum_increment) : Number(config.minimum_increment);
      const value = Math.round(Number(p.p_amount) * 100) / 100; const minimum = player.current_bid === null ? Number(player.base_price ?? config.default_base_price) : Math.round((Number(player.current_bid) + increment) * 100) / 100;
      const reserveTarget = Number(config.max_squad_size ?? config.min_squad_size);
      const reserve = Math.max(0, reserveTarget - squad - 1) * Number(config.default_base_price);
      if (!Number.isFinite(value) || Math.round(value * 100) !== value * 100 || value < minimum) throw new Error("Bid is below the next valid amount");
      if (squad >= config.max_squad_size) throw new Error("Team squad is full");
      if (value > Number(team.purse) - Number(team.spent) - reserve) throw new Error("Bid would leave too little purse to complete a full squad");
      await db.query("update auction_players set current_bid=$1,current_bid_team_id=$2,updated_at=now() where id=$3", [value, team.id, player.id]);
      await db.query("insert into auction_events(event_type,player_id,team_id,amount) values('bid',$1,$2,$3)", [player.id, team.id, value]);
      await audit(db, actorId, name, { player_id: player.id, team_id: team.id, amount: value }); return null;
    }
    case "auction_sell_current": {
      const config = await configForUpdate(db);
      if (config.status !== "live" || !config.current_player_id) throw new Error("No live player");
      const player = (await db.query("select * from auction_players where id=$1 for update", [config.current_player_id])).rows[0];
      if (!player.current_bid_team_id || player.current_bid === null) throw new Error("Record a bid first");
      const team = (await db.query("select * from auction_teams where id=$1 for update", [player.current_bid_team_id])).rows[0];
      if (Number(team.spent) + Number(player.current_bid) > Number(team.purse)) throw new Error("Team cannot complete this purchase");
      await db.query("update auction_teams set spent=spent+$1 where id=$2", [player.current_bid, team.id]);
      await db.query("update auction_players set status='sold',team_id=$1,sold_price=current_bid,updated_at=now() where id=$2", [team.id, player.id]);
      await db.query("update auction_config set current_player_id=null,updated_at=now() where id=1");
      await db.query("insert into auction_events(event_type,player_id,team_id,amount) values('sold',$1,$2,$3)", [player.id, team.id, player.current_bid]);
      await audit(db, actorId, name, { player_id: player.id, team_id: team.id, amount: player.current_bid }); return null;
    }
    case "auction_mark_unsold": {
      const config = await configForUpdate(db);
      if (config.status !== "live" || !config.current_player_id) throw new Error("No live player");
      await db.query("update auction_players set status='unsold',current_bid=null,current_bid_team_id=null,updated_at=now() where id=$1", [config.current_player_id]);
      await db.query("update auction_config set current_player_id=null,updated_at=now() where id=1");
      await db.query("insert into auction_events(event_type,player_id) values('unsold',$1)", [config.current_player_id]);
      await audit(db, actorId, name, { player_id: config.current_player_id }); return null;
    }
    case "auction_reset_current_bids": {
      const config = await configForUpdate(db);
      if (!config.current_player_id || !["live", "paused"].includes(config.status)) throw new Error("No current player to reset");
      await db.query("update auction_players set current_bid=null,current_bid_team_id=null,updated_at=now() where id=$1", [config.current_player_id]);
      await audit(db, actorId, name, { player_id: config.current_player_id }); return null;
    }
    case "auction_undo_last_bid": {
      const config = await configForUpdate(db);
      if (!config.current_player_id || !["live", "paused"].includes(config.status)) throw new Error("No current player to update");
      const last = (await db.query("select id,team_id,amount from auction_events where event_type='bid' and player_id=$1 order by id desc limit 1 for update", [config.current_player_id])).rows[0];
      if (!last) throw new Error("No bid to undo");
      await db.query("delete from auction_events where id=$1", [last.id]);
      const previous = (await db.query("select team_id,amount from auction_events where event_type='bid' and player_id=$1 order by id desc limit 1", [config.current_player_id])).rows[0];
      await db.query("update auction_players set current_bid=$1,current_bid_team_id=$2,updated_at=now() where id=$3", [previous?.amount ?? null, previous?.team_id ?? null, config.current_player_id]);
      await db.query("insert into auction_events(event_type,player_id,team_id,amount) values('bid_undone',$1,$2,$3)", [config.current_player_id, last.team_id, last.amount]);
      await audit(db, actorId, name, { player_id: config.current_player_id, removed_bid: last.amount, restored_bid: previous?.amount ?? null }); return null;
    }
    case "auction_undo_sale": {
      const config = await configForUpdate(db);
      if (!["live", "paused"].includes(config.status)) throw new Error("Pause or open the auction before making corrections");
      const player = (await db.query("select * from auction_players where id=$1 for update", [p.p_player_id])).rows[0];
      if (!player || player.status !== "sold" || !player.team_id || player.sold_price === null) throw new Error("Choose a sold player");
      const team = (await db.query("select * from auction_teams where id=$1 for update", [player.team_id])).rows[0];
      if (!team) throw new Error("The player's team no longer exists");
      await db.query("update auction_teams set spent=greatest(0,spent-$1) where id=$2", [player.sold_price, team.id]);
      await db.query("update auction_players set status='queued',team_id=null,sold_price=null,current_bid=null,current_bid_team_id=null,updated_at=now() where id=$1", [player.id]);
      await db.query("insert into auction_events(event_type,player_id,team_id,amount) values('sale_undone',$1,$2,$3)", [player.id, team.id, player.sold_price]);
      await audit(db, actorId, name, { player_id: player.id, team_id: team.id, amount: player.sold_price }); return null;
    }
    case "auction_manual_assign": {
      const config = await configForUpdate(db);
      if (!["live", "paused"].includes(config.status)) throw new Error("Pause or open the auction before making corrections");
      const player = (await db.query("select * from auction_players where id=$1 for update", [p.p_player_id])).rows[0];
      if (!player || player.status === "captain") throw new Error("Choose an auction player");
      const target = (await db.query("select * from auction_teams where id=$1 for update", [p.p_team_id])).rows[0];
      if (!target) throw new Error("Choose a team");
      const amount = Math.round(Number(p.p_amount) * 100) / 100;
      const base = Number(player.base_price ?? config.default_base_price);
      if (!Number.isFinite(amount) || Math.round(amount * 100) !== amount * 100 || amount < base) throw new Error(`Manual amount must be at least ${base} CR`);

      const previousTeamId = player.status === "sold" ? player.team_id : null;
      const previousAmount = player.status === "sold" ? Number(player.sold_price || 0) : 0;
      const targetSpentBefore = Number(target.spent) - (previousTeamId === target.id ? previousAmount : 0);
      const squad = Number((await db.query("select count(*) from auction_players where id<>$1 and team_id=$2 and status in ('captain','sold')", [player.id, target.id])).rows[0].count);
      const maxSquad = Number(config.max_squad_size ?? config.min_squad_size);
      const reserve = Math.max(0, maxSquad - squad - 1) * Number(config.default_base_price);
      if (squad >= maxSquad) throw new Error("Team squad is full");
      if (amount > Number(target.purse) - targetSpentBefore - reserve) throw new Error("Amount would leave too little purse to complete a full squad");

      if (previousTeamId) await db.query("update auction_teams set spent=greatest(0,spent-$1) where id=$2", [previousAmount, previousTeamId]);
      await db.query("update auction_teams set spent=spent+$1 where id=$2", [amount, target.id]);
      await db.query("update auction_players set status='sold',team_id=$1,sold_price=$2,current_bid=$2,current_bid_team_id=$1,updated_at=now() where id=$3", [target.id, amount, player.id]);
      if (config.current_player_id === player.id) await db.query("update auction_config set current_player_id=null,updated_at=now() where id=1");
      await db.query("insert into auction_events(event_type,player_id,team_id,amount) values('manual_assigned',$1,$2,$3)", [player.id, target.id, amount]);
      await audit(db, actorId, name, { player_id: player.id, previous_team_id: previousTeamId, previous_amount: previousAmount || null, team_id: target.id, amount }); return null;
    }
    case "auction_requeue_unsold": {
      const config = await configForUpdate(db);
      if (!["live", "paused"].includes(config.status)) throw new Error("Auction is not open");
      const { rowCount } = await db.query("update auction_players set status='queued',updated_at=now() where id=$1 and status='unsold'", [p.p_player_id]);
      if (!rowCount) throw new Error("Choose an unsold player");
      await db.query("insert into auction_events(event_type,player_id) values('requeued',$1)", [p.p_player_id]);
      await audit(db, actorId, name, p); return null;
    }
    case "auction_set_team_logo": {
      const logo = String(p.p_logo_url || "").trim() || null;
      if (logo && (logo.length > 500 || !/^(https:\/\/|\/[A-Za-z0-9_./-]+$)/.test(logo))) throw new Error("Use an HTTPS or site-local logo URL");
      const { rowCount } = await db.query("update auction_teams set logo_url=$1 where id=$2", [logo, p.p_team_id]);
      if (!rowCount) throw new Error("Team not found");
      await audit(db, actorId, name, p); return null;
    }
    default: throw new Error("Unknown auction action");
  }
}
