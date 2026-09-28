import test from "node:test";
import assert from "node:assert/strict";
import { canViewAuctionInstance } from "../server/app.mjs";

const AUCTION_ID = "4d6e235c-9ba3-45d3-8287-ca591f5f6e5e";

function archivedAuction(status) {
  return {
    id: AUCTION_ID,
    name: "Season 5 Official Auction",
    kind: "official",
    active: false,
    archived: true,
    state_data: { config: { status } },
  };
}

test("completed archived auctions remain available as permanent public results", async () => {
  assert.equal(canViewAuctionInstance(archivedAuction("complete")), true);
});

test("unfinished archived auctions stay private", async () => {
  assert.equal(canViewAuctionInstance(archivedAuction("paused")), false);
  assert.equal(canViewAuctionInstance(null), false);
});
