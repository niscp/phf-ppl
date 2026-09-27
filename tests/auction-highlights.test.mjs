import test from "node:test";
import assert from "node:assert/strict";
import { buildAuctionHighlights, roleLabel } from "../app/auction-highlights.ts";

const snapshot = {
  config: { status: "complete" },
  teams: [
    { id: "a", name: "Alpha", purse: 30, spent: 7, logo_url: null },
    { id: "b", name: "Bravo", purse: 30, spent: 2, logo_url: null },
  ],
  players: [
    { id: "ca", name: "Captain A", role: "Batter", status: "captain", team_id: "a", sold_price: 0 },
    { id: "cb", name: "Captain B", role: "All-rounder", status: "captain", team_id: "b", sold_price: 0 },
    { id: "p1", name: "Player One", role: "Bowler", status: "sold", team_id: "a", sold_price: 6 },
    { id: "p2", name: "Player Two", role: "All - Rounder", status: "sold", team_id: "a", sold_price: 1 },
    { id: "p3", name: "Player Three", role: "WK", status: "sold", team_id: "b", sold_price: 2 },
  ],
  events: [],
};

test("highlights rank purchases and calculate totals from completed sales", () => {
  const result = buildAuctionHighlights(snapshot);
  assert.equal(result.complete, true);
  assert.equal(result.highestSale?.name, "Player One");
  assert.equal(result.totalSpend, 9);
  assert.equal(result.averageSale, 3);
  assert.equal(result.squadCount, 5);
  assert.equal(result.teams[0].name, "Alpha");
  assert.equal(result.teams[0].remaining, 23);
});

test("role aliases produce stable public labels", () => {
  assert.equal(roleLabel("All - Rounder"), "All-rounders");
  assert.equal(roleLabel("Batsman"), "Batters");
  assert.equal(roleLabel("WK"), "Wicketkeepers");
});
