import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAuctionState } from "../server/auction-units.mjs";

test("legacy INR rehearsal values become canonical CR values", () => {
  const state = normalizeAuctionState({
    config: { default_base_price: 10_000_000, minimum_increment: 10_000_000, increment_threshold: 50, increment_above_threshold: 20, money_label: "₹" },
    teams: [{ purse: 280_000_000, spent: 30_000_000 }],
    players: [{ base_price: 10_000_000, current_bid: 20_000_000, sold_price: 30_000_000 }],
    events: [{ amount: 30_000_000 }],
  });
  assert.equal(state.config.money_label, "CR");
  assert.equal(state.config.default_base_price, 1);
  assert.equal(state.config.minimum_increment, 1);
  assert.equal(state.config.increment_threshold, 10);
  assert.equal(state.config.increment_above_threshold, 2);
  assert.deepEqual(state.teams[0], { purse: 28, spent: 3 });
  assert.equal(state.players[0].sold_price, 3);
  assert.equal(state.events[0].amount, 3);
});

test("canonical CR state is unchanged", () => {
  const state = { config: { default_base_price: 1, money_label: "CR" }, teams: [{ purse: 28, spent: 2 }], players: [], events: [] };
  assert.deepEqual(normalizeAuctionState(state), state);
});
