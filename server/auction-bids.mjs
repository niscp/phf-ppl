const BID_PRECISION = 100;
const FLOATING_POINT_TOLERANCE = 1e-9;

export function normalizeAuctionAmount(input) {
  const raw = Number(input);
  if (!Number.isFinite(raw)) return null;

  const normalized = Math.round(raw * BID_PRECISION) / BID_PRECISION;
  if (Math.abs(raw - normalized) > FLOATING_POINT_TOLERANCE) return null;

  return normalized;
}

export const normalizeBidAmount = normalizeAuctionAmount;
