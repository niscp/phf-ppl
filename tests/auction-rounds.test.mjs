import test from "node:test";
import assert from "node:assert/strict";
import { activeAuctionRound, roleGroup } from "../server/auction-rounds.mjs";

test("role aliases map to the four auction rounds", () => {
  assert.equal(roleGroup("Batsman"), "batter");
  assert.equal(roleGroup("Bowler"), "bowler");
  assert.equal(roleGroup("All - Rounder"), "all-rounder");
  assert.equal(roleGroup("WK"), "wicketkeeper");
});

test("the first unfinished role round wins regardless of input order", () => {
  const players = [
    { id: "a", role: "All-rounder", status: "queued" },
    { id: "b", role: "Bowler", status: "queued" },
    { id: "c", role: "Batter", status: "sold" },
    { id: "d", role: "Wicketkeeper", status: "queued" },
  ];
  assert.equal(activeAuctionRound(players)?.key, "bowler");
  players[1].status = "sold";
  assert.equal(activeAuctionRound(players)?.key, "all-rounder");
});

test("empty wicketkeeper round is skipped", () => {
  assert.equal(activeAuctionRound([{ id: "a", role: "All-rounder", status: "queued" }])?.key, "all-rounder");
});

test("Yogesh is always the opening player before role rounds", () => {
  const round = activeAuctionRound([{ id: "player-1", role: "Batter", status: "queued" }, { id: "player-79", role: "All-rounder", status: "queued" }]);
  assert.equal(round?.key, "opening");
  assert.equal(round?.players[0].id, "player-79");
});
