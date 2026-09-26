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
const team = { id: "t1", purse: "30", spent: "0" };

test("numeric database strings do not concatenate when calculating the next bid", () => {
  assert.equal(nextBid({ current_bid: "1", base_price: null }, config), 2);
  assert.equal(nextBid({ current_bid: "5", base_price: null }, config), 7);
});

test("opening bid uses the 1 CR base price", () => {
  assert.equal(nextBid({ current_bid: null, base_price: null }, config), 1);
});

test("maximum bid reserves base price for every remaining full-squad slot", () => {
  assert.equal(maxBidAllowed(team, [captain], config), 17);
});

test("the leading bid is provisional and does not permanently reduce purse", () => {
  assert.equal(provisionalPurse(team, { current_bid_team_id: "t1", current_bid: "6" }), 24);
  assert.equal(provisionalPurse(team, { current_bid_team_id: "t2", current_bid: "6" }), 30);
});

test("bids above the reserve-safe maximum are disabled", () => {
  assert.equal(canBid(team, [captain], { current_bid: "15", base_price: null }, config), true);
  assert.equal(canBid(team, [captain], { current_bid: "17", base_price: null }, config), false);
});

test("bid steps are 0.20 CR below 5 CR and 0.50 CR from 5 CR", () => {
  const decimalConfig = { ...config, minimum_increment: 0.2, increment_threshold: 5, increment_above_threshold: 0.5 };
  assert.equal(nextBid({ current_bid: 4.8, base_price: null }, decimalConfig), 5);
  assert.equal(nextBid({ current_bid: 5, base_price: null }, decimalConfig), 5.5);
});
