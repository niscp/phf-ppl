import assert from "node:assert/strict";
import test from "node:test";
import { manuallyAssignInState, undoSaleInState } from "../server/auction-corrections.mjs";

function state() {
  return {
    config: { status: "paused", current_player_id: null, default_base_price: 1, min_squad_size: 14, max_squad_size: 15 },
    teams: [
      { id: "a", purse: 30, spent: 4 },
      { id: "b", purse: 30, spent: 0 },
    ],
    players: [
      { id: "captain-a", status: "captain", team_id: "a", sold_price: 0 },
      { id: "captain-b", status: "captain", team_id: "b", sold_price: 0 },
      { id: "p1", status: "sold", team_id: "a", sold_price: 4, current_bid: 4, current_bid_team_id: "a" },
      { id: "p2", status: "queued", team_id: null, sold_price: null, current_bid: null, current_bid_team_id: null },
    ],
    events: [],
  };
}

test("undo sale refunds the team and returns any sold player to the queue", () => {
  const value = state();
  undoSaleInState(value, "p1");
  assert.equal(value.teams[0].spent, 0);
  assert.equal(value.players[2].status, "queued");
  assert.equal(value.players[2].team_id, null);
  assert.equal(value.events.at(-1).event_type, "sale_undone");
});

test("manual assignment records a custom amount and updates the target purse", () => {
  const value = state();
  manuallyAssignInState(value, "p2", "b", 3.25);
  assert.equal(value.teams[1].spent, 3.25);
  assert.equal(value.players[3].status, "sold");
  assert.equal(value.players[3].sold_price, 3.25);
  assert.equal(value.events.at(-1).event_type, "manual_assigned");
});

test("manual correction transfers a sold player without double charging", () => {
  const value = state();
  manuallyAssignInState(value, "p1", "b", 2.5);
  assert.equal(value.teams[0].spent, 0);
  assert.equal(value.teams[1].spent, 2.5);
  assert.equal(value.players[2].team_id, "b");
});

test("manual assignment preserves the full-squad purse reserve", () => {
  const value = state();
  assert.throws(() => manuallyAssignInState(value, "p2", "b", 18), /too little purse/);
  manuallyAssignInState(value, "p2", "b", 17);
  assert.equal(value.teams[1].spent, 17);
});
