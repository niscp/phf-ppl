import test from "node:test";
import assert from "node:assert/strict";
import { canBid, maxBidAllowed, nextBid, provisionalPurse } from "../app/auction-math.ts";

const config = {
  status: "live",
  current_player_id: "p1",
  minimum_increment: "1",
  increment_threshold: "5",
  increment_above_threshold: "2",
  default_base_price: "1",
  min_squad_size: 14,
  max_squad_size: 15,
  money_label: "CR",
};

const captain = { id: "captain", status: "captain", team_id: "t1" };
const team = { id: "t1", purse: "28", spent: "0" };

test("numeric database strings do not concatenate when calculating the next bid", () => {
  assert.equal(nextBid({ current_bid: "1", base_price: null }, config), 2);
  assert.equal(nextBid({ current_bid: "5", base_price: null }, config), 7);
});

test("opening bid uses the 1 CR base price", () => {
  assert.equal(nextBid({ current_bid: null, base_price: null }, config), 1);
});

test("maximum bid reserves base price for every remaining minimum-squad slot", () => {
  assert.equal(maxBidAllowed(team, [captain], config), 16);
});

test("the leading bid is provisional and does not permanently reduce purse", () => {
  assert.equal(provisionalPurse(team, { current_bid_team_id: "t1", current_bid: "6" }), 22);
  assert.equal(provisionalPurse(team, { current_bid_team_id: "t2", current_bid: "6" }), 28);
});

test("bids above the reserve-safe maximum are disabled", () => {
  assert.equal(canBid(team, [captain], { current_bid: "14", base_price: null }, config), true);
  assert.equal(canBid(team, [captain], { current_bid: "16", base_price: null }, config), false);
});
