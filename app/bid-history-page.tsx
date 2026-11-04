"use client";

import SiteHeader from "./site-header";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import rosterJson from "./season5-players.json";
import { officialSeasonFiveAuctionId } from "./season5-auction";

type EventRow = { id: number; event_type: string; player_id: string; team_id: string | null; amount: number | null; created_at: string };
type History = { auction: { id: string; name: string; kind: string }; player: { id: string; name: string; role: string }; teams: { id: string; name: string }[]; money_label: string; events: EventRow[] };
type RegisteredPlayer = { id: string; name: string; role: string };
const roster = rosterJson as RegisteredPlayer[];

function localLink(path: string) {
  return typeof window !== "undefined" && window.location.pathname.startsWith("/phf-ppl/") ? `/phf-ppl/${path}` : `/${path}`;
}
function formatAmount(value: number | null, unit: string) {
  if (value === null) return "—";
  return `${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })} ${unit || "CR"}`;
}
function eventLabel(type: string) {
  return ({ bid: "Bid placed", bid_undone: "Bid undone", sold: "Player sold", unsold: "Marked unsold", sale_undone: "Sale reversed", manual_assigned: "Assigned", requeued: "Returned to pool", called: "Called to the table" } as Record<string, string>)[type] ?? type.replaceAll("_", " ");
}
function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Time not recorded" : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(date);
}

export default function BidHistoryPage() {
  const [search, setSearch] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [auctionId, setAuctionId] = useState(officialSeasonFiveAuctionId);
  const [history, setHistory] = useState<History | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setPlayerId(params.get("player") ?? "");
    setAuctionId(params.get("auction") || officialSeasonFiveAuctionId);
  }, []);

  useEffect(() => {
    if (!playerId) { setHistory(null); return; }
    let active = true;
    setLoading(true); setError(""); setTeamFilter("all"); setShowAll(false);
    const query = new URLSearchParams({ playerId, auctionId });
    fetch(`/api/auction/bid-history?${query.toString()}`, { cache: "no-store" })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Bid history could not be loaded"); return data as History; })
      .then((data) => { if (active) setHistory(data); })
      .catch((reason: unknown) => { if (active) { setHistory(null); setError(reason instanceof Error ? reason.message : "Bid history could not be loaded"); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [playerId, auctionId]);

  const playerOptions = useMemo(() => roster.filter((player) => player.name.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 10), [search]);
  const teamNames = useMemo(() => new Map((history?.teams ?? []).map((team) => [team.id, team.name])), [history]);
  const events = history?.events ?? [];
  const bidEvents = events.filter((event) => event.event_type === "bid");
  const maxBid = bidEvents.reduce<number | null>((highest, event) => event.amount !== null && (highest === null || event.amount > highest) ? event.amount : highest, null);
  const outcome = [...events].reverse().find((event) => ["sold", "manual_assigned", "unsold"].includes(event.event_type));
  const filteredEvents = events.filter((event) => teamFilter === "all" || event.team_id === teamFilter);
  const displayedEvents = showAll ? filteredEvents : filteredEvents.slice(-30);
  const selectedPlayer = roster.find((player) => player.id === playerId);

  function choosePlayer(id: string) {
    setPlayerId(id); setSearch("");
    const params = new URLSearchParams(window.location.search);
    params.set("player", id); params.set("auction", auctionId);
    window.history.replaceState({}, "", `${window.location.pathname}?${params}`);
  }
  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const match = roster.find((player) => player.id === search.trim()) ?? roster.find((player) => player.name.toLowerCase() === search.trim().toLowerCase());
    if (match) choosePlayer(match.id);
    else setError("Choose a player from the suggestions to open their history.");
  }

  return <main className="auction-page bid-history-page">
    <SiteHeader active="history" />

    <section className="bid-history-hero"><p className="auction-overline">Season 5 · Official ledger</p><h1>Every bid.<br/><span>In order.</span></h1><p>Follow how the bidding moved for each player, from the opening offer to the final call.</p></section>
    <section className="bid-history-content">
      <form className="bid-history-search" onSubmit={submitSearch}><label htmlFor="bid-player-search">Find a player</label><div><input id="bid-player-search" type="search" list="bid-player-options" placeholder="Type a player name" value={search} onChange={(event) => setSearch(event.target.value)} /><datalist id="bid-player-options">{playerOptions.map((player) => <option key={player.id} value={player.name}>{player.role}</option>)}</datalist><button type="submit">Show history</button></div><small>Search the Season 5 registered player list.</small></form>
      {selectedPlayer && <p className="bid-history-selected">Selected player: <b>{selectedPlayer.name}</b> · {selectedPlayer.role}</p>}
      {error && <p className="bid-history-error" role="alert">{error}</p>}
      {loading && <div className="bid-history-empty"><span className="highlights-loader"/><h2>Reading the auction ledger</h2></div>}
      {!loading && history && <>
        <div className="bid-history-title"><div><p className="auction-overline">{history.auction.name}</p><h2>{history.player.name}</h2><span>{history.player.role} · {bidEvents.length} bids recorded</span></div><select aria-label="Filter bids by team" value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}><option value="all">All teams</option>{history.teams.map((team) => <option value={team.id} key={team.id}>{team.name}</option>)}</select></div>
        <div className="bid-history-stats"><article><span>Total bids</span><b>{bidEvents.length}</b></article><article><span>Highest bid</span><b>{formatAmount(maxBid, history.money_label)}</b></article><article><span>Final result</span><b>{outcome ? outcome.event_type === "unsold" ? "Unsold" : `${teamNames.get(outcome.team_id ?? "") ?? "Team"} · ${formatAmount(outcome.amount, history.money_label)}` : "No result recorded"}</b></article></div>
        {events.length === 0 ? <div className="bid-history-empty"><h2>No event history recorded</h2><p>This player has no bids or auction outcomes in this auction ledger.</p></div> : <div className="bid-history-ledger"><div className="bid-history-ledger-head"><span>Sequence</span><span>Team</span><span>Event</span><span>Amount</span><span>Time (IST)</span></div><ol>{displayedEvents.map((event, index) => <li className={`bid-event bid-event-${event.event_type}`} key={`${event.id}-${index}`}><span className="bid-event-number">{String(filteredEvents.indexOf(event) + 1).padStart(2, "0")}</span><strong>{teamNames.get(event.team_id ?? "") ?? (event.team_id ? "Team" : "—")}</strong><span className="bid-event-label">{eventLabel(event.event_type)}</span><b>{formatAmount(event.amount, history.money_label)}</b><time dateTime={event.created_at}>{dateLabel(event.created_at)}</time></li>)}</ol>{filteredEvents.length > 30 && !showAll && <button className="bid-history-more" type="button" onClick={() => setShowAll(true)}>Show all {filteredEvents.length} events</button>}</div>}
        <p className="bid-history-note">This timeline reflects the auction’s recorded event log. If a bid was undone or a sale corrected, both the original action and its correction remain visible.</p>
      </>}
      {!loading && !history && !error && <div className="bid-history-empty"><h2>Pick a player to begin</h2><p>The full sequence includes bid amounts, bidding teams, corrections and the final result.</p></div>}
    </section>
    <footer className="auction-footer"><a href={localLink("")}>PHF Premier League</a><span>Season 5 · 2026</span><a href={localLink("highlights.html")}>Auction highlights</a></footer>
  </main>;
}
