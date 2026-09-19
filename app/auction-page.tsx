"use client";

/* eslint-disable react/no-unescaped-entities */

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import registeredPlayers from "./season5-players.json";
import { auctionClient, getAuctionSnapshot, preAuctionSnapshot, type AuctionSnapshot, type AuctionTeam } from "./auction-client";
import { canBid, maxBidAllowed, nextBid, provisionalPurse, squadSize } from "./auction-math";
import { auctionExcludedPlayerIds } from "./season5-teams";

type RegisteredPlayer = {
  id: string;
  name: string;
  role: string;
  photo: string | null;
  stats: { batting?: { innings?: number | null; runs?: number | null; average?: string | null; strikeRate?: string | null }; bowling?: { matches?: number | null; wickets?: number | null; economy?: string | null; best?: string | null } } | null;
  statsSource?: string;
};

const roster = registeredPlayers as RegisteredPlayer[];
const playerPool = roster.filter((player) => !auctionExcludedPlayerIds.has(player.id));
const roleFilters = ["All roles", "All-rounder", "Batter", "Bowler"];
const statusFilters = ["All players", "Captain", "Queued", "Sold", "Unsold"];

function asset(path: string | null) {
  if (!path) return "";
  const base = typeof window !== "undefined" && window.location.pathname.startsWith("/phf-ppl/") ? "/phf-ppl" : "";
  return `${base}${path}`;
}

function localLink(path: string) {
  return typeof window !== "undefined" && window.location.pathname.startsWith("/phf-ppl/") ? `/phf-ppl/${path}` : `/${path}`;
}

function amount(value: number | null | undefined, unit: string | null | undefined) {
  if (value === null || value === undefined) return "—";
  return unit === "₹" || unit === "INR" ? `₹${value.toLocaleString("en-IN")}` : `${value.toLocaleString("en-IN")} ${unit || "points"}`;
}

function PlayerImage({ player, className = "" }: { player: Pick<RegisteredPlayer, "name" | "photo">; className?: string }) {
  return player.photo
    ? <img className={className} src={asset(player.photo)} alt={player.name} loading="lazy" />
    : <div className={`auction-no-photo ${className}`} aria-label={`No photo for ${player.name}`}>{player.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("")}</div>;
}

function StatLine({ player }: { player: RegisteredPlayer }) {
  const batting = player.stats?.batting;
  const bowling = player.stats?.bowling;
  if (!player.statsSource) return <p className="auction-stats-empty">CricHeroes career stats not verified</p>;
  return <div className="auction-stat-line">
    <span><b>{batting?.runs ?? "—"}</b><small>Career runs</small></span>
    <span><b>{batting?.strikeRate ?? "—"}</b><small>Strike rate</small></span>
    <span><b>{bowling?.wickets ?? "—"}</b><small>Wickets</small></span>
    <span><b>{bowling?.matches ?? "—"}</b><small>Bowling matches</small></span>
  </div>;
}

function TeamCrest({ team }: { team: AuctionTeam }) {
  const initials = team.name.split(/\s+/).map((word) => word[0]).slice(0, 2).join("");
  const logo = team.logo_url?.startsWith("/") ? asset(team.logo_url) : team.logo_url;
  return <span className="auction-crest">{logo ? <img src={logo} alt={`${team.name} logo`} /> : <b aria-label={`${team.name} crest placeholder`}>{initials}</b>}</span>;
}

function AuctionLiveBoard({ snapshot, current, admin = false, busy = false, onBid, onSell, onReset, onUnsold }: {
  snapshot: AuctionSnapshot;
  current: RegisteredPlayer | undefined;
  admin?: boolean;
  busy?: boolean;
  onBid?: (teamId: string, value: number) => void;
  onSell?: () => void;
  onReset?: () => void;
  onUnsold?: () => void;
}) {
  const state = snapshot.players.find((player) => player.id === current?.id);
  const config = snapshot.config;
  const leading = snapshot.teams.find((team) => team.id === state?.current_bid_team_id);
  const next = nextBid(state, config);
  const unit = config?.money_label ?? "₹";
  return <div className={`auction-live-board${admin ? " auction-live-admin" : ""}`}>
    <div className="auction-board-player">
      {current ? <><div className="auction-board-photo"><PlayerImage player={current} /></div><div className="auction-board-player-info"><span>{current.role}</span><h3>{current.name}</h3><StatLine player={current} />{current.statsSource && <a href={current.statsSource} target="_blank" rel="noopener noreferrer">CricHeroes profile ↗</a>}</div></>
        : <div className="auction-board-empty"><span className="auction-board-ball" aria-hidden="true"/><h3>{config?.status === "complete" ? "Squads formed" : "Next player awaits"}</h3><p>{config?.status === "preparing" || !config ? "The auction has not started yet." : "The auctioneer will call the next player."}</p></div>}
    </div>
    <div className="auction-board-right">
      <div className="auction-board-teams">{snapshot.teams.length ? snapshot.teams.map((team) => {
        const lead = state?.current_bid_team_id === team.id;
        const valid = canBid(team, snapshot.players, state, config);
        const card = <><div className="auction-bid-card-head"><TeamCrest team={team} /><strong>{team.name}</strong>{lead && <em>Leading</em>}</div><dl><div><dt>Purse left</dt><dd>{amount(team.purse - team.spent, unit)}</dd></div><div><dt>Available now</dt><dd>{amount(provisionalPurse(team, state), unit)}</dd></div><div><dt>Max bid</dt><dd>{amount(maxBidAllowed(team, snapshot.players, config), unit)}</dd></div></dl><small>{squadSize(snapshot.players, team.id)} / {config?.max_squad_size ?? 15} players</small></>;
        return onBid ? <button className={`auction-bid-card${lead ? " leading" : ""}`} type="button" key={team.id} disabled={busy || !admin || !current || !valid || config?.status !== "live"} onClick={() => next !== null && onBid(team.id, next)} aria-label={`Bid ${amount(next, unit)} for ${team.name}`}>{card}<span className="auction-bid-prompt">Bid {amount(next, unit)}</span></button>
          : <article className={`auction-bid-card${lead ? " leading" : ""}`} key={team.id}>{card}</article>;
      }) : <p className="auction-board-no-teams">Six teams and their logos will appear here when the captains are confirmed.</p>}</div>
      <div className="auction-board-control"><div className="auction-board-totals"><div><span>Current bid</span><strong>{amount(state?.current_bid, unit)}</strong></div><div><span>Next bid</span><strong>{amount(next, unit)}</strong></div><div><span>Leading team</span><strong>{leading?.name ?? "No bid"}</strong></div></div>
        {admin && <div className="auction-board-buttons"><button className="auction-sold-button" type="button" disabled={busy || config?.status !== "live" || !state?.current_bid_team_id} onClick={onSell}>Sold to {leading?.name ?? "team"}</button><button type="button" disabled={busy || !current || !state?.current_bid} onClick={onReset}>Undo bids</button><button type="button" disabled={busy || config?.status !== "live" || !current} onClick={onUnsold}>Unsold</button></div>}
        <p>Only a sale permanently deducts from the winning team. Changing the leading team releases the previous provisional hold.</p>
      </div>
    </div>
  </div>;
}

function PublicAuction({ snapshot, loading, error }: { snapshot: AuctionSnapshot; loading: boolean; error: string }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("All roles");
  const [status, setStatus] = useState("All players");
  const [visibleCount, setVisibleCount] = useState(24);
  const config = snapshot.config;
  const state = config?.status ?? "preparing";
  const playerStates = useMemo(() => new Map(snapshot.players.map((player) => [player.id, player])), [snapshot.players]);
  const current = roster.find((player) => player.id === config?.current_player_id);
  const sold = snapshot.players.filter((player) => player.status === "sold").length;
  const filtered = playerPool.filter((player) => {
    const playerStatus = playerStates.get(player.id)?.status ?? "queued";
    return player.name.toLowerCase().includes(query.trim().toLowerCase())
      && (role === "All roles" || player.role === role)
      && (status === "All players" || playerStatus === status.toLowerCase());
  });
  const teamById = new Map(snapshot.teams.map((team) => [team.id, team]));

  return <main className="auction-page">
    <header className="auction-header"><a className="auction-brand" href={localLink("")}><b>PHF</b><span>Premier League</span></a><nav><a href={localLink("")}>Home</a><a href={localLink("players.html")}>Players</a><a href={localLink("teams.html")}>Teams</a><span>Season 5 auction</span></nav></header>
    <section className="auction-hero">
      <div className="auction-hero-copy">
        <p className="auction-overline">PHF Premier League · Season 5</p>
        <h1>The<br/><span>auction.</span></h1>
        <div className={`auction-phase ${state}`}><i aria-hidden="true" />{state === "preparing" ? "Invitations closed · Auction preparation" : state === "live" ? "Live auction" : state === "paused" ? "Auction paused" : "Auction complete"}</div>
        <p className="auction-hero-deck">Six captains. One player pool. The teams that will shape the next season are about to be made.</p><p className="auction-value-note">All ₹ bids shown here are virtual auction values, not payments.</p>
      </div>
      <div className="auction-hero-montage" aria-label="Season 5 registered players">{roster.filter((player) => player.photo).slice(7, 10).map((player) => <PlayerImage key={player.id} player={player} />)}<strong>05</strong></div>
      <div className="auction-hero-bottom"><span><b>{playerPool.length}</b> auction players</span><span><b>06</b> captain-led teams</span><span><b>{sold}</b> sold so far</span></div>
    </section>

    {error && <p className="auction-alert" role="status">Live updates are unavailable right now. Showing the registered player pool. {error}</p>}
    <section className="auction-stage-main" aria-label="Auction room">
      <div className="auction-section-heading"><div><p className="auction-overline">Auction room</p><h2>{current ? "On the block" : state === "complete" ? "The hammer has fallen" : "The room is getting ready"}</h2></div><span>{loading ? "Checking live status…" : state === "live" ? "Live now" : "Awaiting auction"}</span></div>
      <AuctionLiveBoard snapshot={snapshot} current={current} />
    </section>

    <section className="auction-teams-section" aria-label="Team budgets"><div className="auction-section-heading"><div><p className="auction-overline">Captain-led squads</p><h2>Six teams. One trophy.</h2></div></div>
      {snapshot.teams.length ? <div className="auction-teams">{snapshot.teams.map((team, index) => { const players = snapshot.players.filter((player) => player.team_id === team.id && (player.status === "sold" || player.status === "captain")); return <a href={`${localLink("teams.html")}#${team.id}`} key={team.id} className="auction-team"><span className="auction-team-no">{String(index + 1).padStart(2, "0")}</span><TeamCrest team={team} /><h3>{team.name}</h3><div><span>Squad <b>{players.length} / {config?.max_squad_size ?? 15}</b></span><span>Remaining <b>{amount(team.purse - team.spent, config?.money_label)}</b></span></div>{players.length > 0 && <p>{players.map((player) => player.status === "captain" ? `${player.name} (C)` : player.name).join(" · ")}</p>}</a>; })}</div>
        : <div className="auction-team-placeholder">The six team identities will appear here when the captains are confirmed. No teams or prices are being guessed.</div>}
    </section>

    <section className="auction-pool-section" aria-label="Auction player pool"><div className="auction-section-heading"><div><p className="auction-overline">The player pool</p><h2>Every name matters.</h2></div><span>{filtered.length} players</span></div>
      <div className="auction-filters"><label>Find a player<input value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(24); }} type="search" placeholder="Search by name" /></label><label>Role<select value={role} onChange={(event) => { setRole(event.target.value); setVisibleCount(24); }}>{roleFilters.map((option) => <option key={option}>{option}</option>)}</select></label><label>Auction status<select value={status} onChange={(event) => { setStatus(event.target.value); setVisibleCount(24); }}>{statusFilters.map((option) => <option key={option}>{option}</option>)}</select></label></div>
      <div className="auction-pool-grid">{filtered.slice(0, visibleCount).map((player) => { const auction = playerStates.get(player.id); const playerStatus = auction?.status ?? "queued"; const team = auction?.team_id ? teamById.get(auction.team_id) : null; return <article className="auction-pool-player" key={player.id}><PlayerImage player={player} /><div><strong>{player.name}</strong><span>{player.role}</span></div><div className={`auction-player-status ${playerStatus}`}><b>{playerStatus === "queued" ? "Awaiting call" : playerStatus === "up" ? "On the block" : playerStatus === "captain" ? `${team?.name ?? "Team"} captain` : playerStatus === "sold" ? team?.name ?? "Sold" : "Unsold"}</b>{playerStatus === "sold" && <small>{amount(auction?.sold_price, config?.money_label)}</small>}</div></article>; })}</div>
      {visibleCount < filtered.length && <button className="auction-more" onClick={() => setVisibleCount((count) => count + 24)}>Show more players</button>}
      <p className="auction-source">Player names, photos and roles come from Season 5 registrations. Career stats are shown only where a CricHeroes profile was verified. Auction prices and teams appear only after the auctioneer records them.</p>
    </section>

    {snapshot.events.length > 0 && <section className="auction-results" aria-label="Recent auction activity"><div className="auction-section-heading"><div><p className="auction-overline">From the auction room</p><h2>Latest calls.</h2></div></div><div>{snapshot.events.filter((event) => event.event_type === "sold" || event.event_type === "unsold").slice(0, 8).map((event) => <p key={event.id}><strong>{roster.find((player) => player.id === event.player_id)?.name ?? "Player"}</strong><span>{event.event_type === "sold" ? `Sold to ${teamById.get(event.team_id ?? "")?.name ?? "team"} · ${amount(event.amount, config?.money_label)}` : "Unsold"}</span></p>)}</div></section>}
    <footer className="auction-footer"><a href={localLink("")}>PHF Premier League</a><span>Season 5 · 2026</span><a href={localLink("auction-admin.html")}>Auctioneer access</a></footer>
  </main>;
}

function AdminAuction({ snapshot, refresh }: { snapshot: AuctionSnapshot; refresh: () => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamPurse, setTeamPurse] = useState("100000");
  const [captainPlayer, setCaptainPlayer] = useState("");
  const [captainTeam, setCaptainTeam] = useState("");
  const [logoTeam, setLogoTeam] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [nextPlayer, setNextPlayer] = useState("");
  const [rules, setRules] = useState({ base: "2000", increment: "1000", minSquad: "14", squad: "15", unit: "₹" });

  useEffect(() => {
    if (!auctionClient) return;
    const client = auctionClient;
    client.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!auctionClient || !session) return;
    auctionClient.rpc("is_auction_admin").then(({ data }) => setIsAdmin(data === true));
  }, [session]);

  useEffect(() => {
    // This form intentionally follows the authoritative rules loaded from the database.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (snapshot.config) setRules({ base: String(snapshot.config.default_base_price ?? 2000), increment: String(snapshot.config.minimum_increment ?? 1000), minSquad: String(snapshot.config.min_squad_size ?? 14), squad: String(snapshot.config.max_squad_size ?? 15), unit: snapshot.config.money_label ?? "₹" });
  }, [snapshot.config?.default_base_price, snapshot.config?.minimum_increment, snapshot.config?.min_squad_size, snapshot.config?.max_squad_size, snapshot.config?.money_label]);

  async function action(name: string, args: Record<string, unknown>): Promise<boolean> {
    if (!auctionClient || busy) return false;
    setBusy(true); setFeedback("");
    try {
      const { error } = await auctionClient.rpc(name, args);
      if (error) { setFeedback(error.message); return false; }
      setFeedback("Saved. The public board is updating.");
      await refresh();
      return true;
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "The action could not be saved.");
      return false;
    } finally { setBusy(false); }
  }

  async function signIn(event: FormEvent) {
    event.preventDefault();
    if (!auctionClient) return;
    const { error } = await auctionClient.auth.signInWithPassword({ email, password });
    setFeedback(error ? error.message : "Signed in. Checking auctioneer access…");
  }

  const current = roster.find((player) => player.id === snapshot.config?.current_player_id);
  const currentState = snapshot.players.find((player) => player.id === current?.id);
  const queued = snapshot.players.filter((player) => player.status === "queued");
  const live = snapshot.config?.status === "live";
  const unit = snapshot.config?.money_label ?? "₹";
  const captainCount = snapshot.players.filter((player) => player.status === "captain").length;
  const assignedCaptainTeams = new Set(snapshot.players.filter((player) => player.status === "captain").map((player) => player.team_id));
  const unassignedCaptainCandidates = snapshot.players.filter((player) => player.status === "queued");
  const unsoldPlayers = snapshot.players.filter((player) => player.status === "unsold");
  const squadCounts = snapshot.teams.map((team) => snapshot.players.filter((player) => player.team_id === team.id && (player.status === "captain" || player.status === "sold")).length);
  const squadGap = squadCounts.length ? Math.max(...squadCounts) - Math.min(...squadCounts) : 0;

  return <main className="auction-page auction-admin-page"><header className="auction-header"><a className="auction-brand" href={localLink("auction.html")}><b>PHF</b><span>Auctioneer</span></a><nav><a href={localLink("auction.html")}>Public board</a><span>Private console</span></nav></header>
    <div className="auction-admin-wrap"><p className="auction-overline">Season 5 · Auction operations</p><h1>Auctioneer console</h1>
      {!auctionClient ? <div className="auction-admin-notice"><h2>Supabase connection needed</h2><p>The public auction preparation page is ready. To activate this private console, create a Supabase project, apply the auction migration, and add the project URL and publishable key to the GitHub Pages build. Do not put the service-role key in the website.</p></div>
        : !session ? <form className="auction-admin-form" onSubmit={signIn}><h2>Sign in</h2><p>Only approved auctioneers can change the live board.</p><label>Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Password<input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label><button>Sign in</button></form>
          : !isAdmin ? <div className="auction-admin-notice"><h2>Access not granted</h2><p>Your account is signed in, but it is not on the auctioneer list. Ask the organizer to add your Supabase user ID to auction_admins.</p><button onClick={() => auctionClient?.auth.signOut()}>Sign out</button></div>
            : <><div className="auction-admin-top"><span>Board: <b>{snapshot.config?.status ?? "not initialized"}</b></span><span>Teams: <b>{snapshot.teams.length} / 6</b></span><span>Captains: <b>{captainCount} / 6</b></span><span>Auction pool: <b>{snapshot.players.filter((player) => player.status !== "captain").length} / {playerPool.length}</b></span><button onClick={() => auctionClient?.auth.signOut()}>Sign out</button></div>
              {feedback && <p className="auction-feedback" role="status">{feedback}</p>}
              <section className="auction-admin-panel"><h2>1. Prepare the room</h2><p>Import the frozen Season 5 auction pool, then add all six teams. Captains are assigned directly to squads and are not auctioned.</p><button disabled={busy || snapshot.config?.status !== "preparing"} onClick={() => action("auction_import_players", { p_players: playerPool.map((player) => ({ id: player.id, name: player.name, role: player.role, photo: player.photo })) })}>Import {playerPool.length} auction players</button><form onSubmit={(event) => { event.preventDefault(); action("auction_add_team", { p_name: teamName.trim(), p_purse: Number(teamPurse) }).then(() => setTeamName("")); }}><label>Team name<input required value={teamName} onChange={(event) => setTeamName(event.target.value)} /></label><label>Starting purse<input type="number" min="1" required value={teamPurse} onChange={(event) => setTeamPurse(event.target.value)} /></label><button disabled={busy || snapshot.teams.length >= 6 || snapshot.config?.status !== "preparing"}>Add team</button></form><ul>{snapshot.teams.map((team) => <li key={team.id}>{team.name} · {amount(team.purse, unit)}</li>)}</ul></section>
              <section className="auction-admin-panel"><h2>Team logos</h2><p>Use each team's official HTTPS image URL or an uploaded site-local path. Until then, the team-name crest is shown.</p><form onSubmit={async (event) => { event.preventDefault(); if (await action("auction_set_team_logo", { p_team_id: logoTeam, p_logo_url: logoUrl.trim() })) setLogoUrl(""); }}><label>Team<select required value={logoTeam} onChange={(event) => setLogoTeam(event.target.value)}><option value="">Select team</option>{snapshot.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><label>Logo URL<input value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} placeholder="https://…/team-logo.png" /></label><button disabled={busy || !logoTeam}>Save logo</button></form></section>
              <section className="auction-admin-panel"><h2>2. Assign six playing captains</h2><p>Each captain occupies one squad slot. Assign exactly one registered player to each team before opening the auction.</p><form onSubmit={(event) => { event.preventDefault(); void action("auction_assign_captain", { p_player_id: captainPlayer, p_team_id: captainTeam }); }}><label>Captain<select required value={captainPlayer} onChange={(event) => setCaptainPlayer(event.target.value)}><option value="">Select registered player</option>{unassignedCaptainCandidates.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label><label>Team<select required value={captainTeam} onChange={(event) => setCaptainTeam(event.target.value)}><option value="">Select team</option>{snapshot.teams.filter((team) => !assignedCaptainTeams.has(team.id)).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><button disabled={busy || snapshot.config?.status !== "preparing" || captainCount >= 6}>Assign captain</button></form><ul>{snapshot.players.filter((player) => player.status === "captain").map((player) => <li key={player.id}>{snapshot.teams.find((team) => team.id === player.team_id)?.name} · {player.name} <button disabled={busy || snapshot.config?.status !== "preparing"} onClick={() => { if (window.confirm(`Remove ${player.name} as captain?`)) void action("auction_unassign_captain", { p_player_id: player.id }); }}>Remove</button></li>)}</ul></section>
              <section className="auction-admin-panel"><h2>3. Set the official rules</h2><p>Suggested values are drafts. Confirm them with the captains. Bids are virtual INR, not payments.</p><form onSubmit={(event) => { event.preventDefault(); void action("auction_set_rules", { p_base_price: Number(rules.base), p_increment: Number(rules.increment), p_min_squad_size: Number(rules.minSquad), p_max_squad_size: Number(rules.squad), p_money_label: rules.unit.trim() }); }}><label>Player base price<input type="number" min="0" value={rules.base} onChange={(event) => setRules({ ...rules, base: event.target.value })} /></label><label>Minimum increment<input type="number" min="1" value={rules.increment} onChange={(event) => setRules({ ...rules, increment: event.target.value })} /></label><label>Minimum squad<input type="number" min="1" value={rules.minSquad} onChange={(event) => setRules({ ...rules, minSquad: event.target.value })} /></label><label>Maximum squad<input type="number" min="1" value={rules.squad} onChange={(event) => setRules({ ...rules, squad: event.target.value })} /></label><label>Bid unit<input value={rules.unit} onChange={(event) => setRules({ ...rules, unit: event.target.value })} /></label><button disabled={busy || snapshot.config?.status !== "preparing"}>Save rules</button></form><p>Final squads must each have at least {snapshot.config?.min_squad_size ?? 14} players and differ by no more than one player.</p><div className="auction-admin-actions"><button disabled={busy || snapshot.config?.status !== "preparing" || snapshot.teams.length !== 6 || captainCount !== 6 || snapshot.players.filter((player) => player.status !== "captain").length !== playerPool.length || !snapshot.config?.minimum_increment || snapshot.config?.default_base_price === null} onClick={() => { if (window.confirm("Start the live auction? Public viewers will see live bids and sales.")) void action("auction_set_status", { p_status: "live" }); }}>Open live auction</button>{(live || snapshot.config?.status === "paused") && <button disabled={busy} onClick={() => void action("auction_set_status", { p_status: live ? "paused" : "live" })}>{live ? "Pause bidding" : "Resume bidding"}</button>}{snapshot.config?.status === "paused" && <button disabled={busy} onClick={() => { if (window.confirm("Complete the auction? This cannot be resumed from the console.")) void action("auction_set_status", { p_status: "complete" }); }}>Complete auction</button>}</div></section>
              <section className="auction-admin-panel auction-admin-room"><h2>4. Run the auction</h2><p>Tap a team card to place the next valid bid. A leading team's displayed available purse is provisional until Sold.</p><form onSubmit={async (event) => { event.preventDefault(); if (await action("auction_start_player", { p_player_id: nextPlayer })) setNextPlayer(""); }}><label>Next player<select value={nextPlayer} onChange={(event) => setNextPlayer(event.target.value)} required><option value="">Select a player</option>{queued.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label><button disabled={busy || !live || !!current}>Call player</button></form><AuctionLiveBoard snapshot={snapshot} current={current} admin busy={busy} onBid={(teamId, value) => void action("auction_place_bid", { p_team_id: teamId, p_amount: value })} onSell={() => { if (window.confirm(`Sell ${current?.name} to ${snapshot.teams.find((team) => team.id === currentState?.current_bid_team_id)?.name ?? "the leading team"} for ${amount(currentState?.current_bid, unit)}?`)) void action("auction_sell_current", {}); }} onReset={() => { if (window.confirm(`Clear all bids for ${current?.name} and start bidding again?`)) void action("auction_reset_current_bids", {}); }} onUnsold={() => { if (window.confirm(`Mark ${current?.name} unsold?`)) void action("auction_mark_unsold", {}); }} /></section>
              <section className="auction-admin-panel"><h2>Squad balance</h2><p>Current spread: {squadGap} player{squadGap === 1 ? "" : "s"}. Final squads must differ by at most one.</p><ul>{snapshot.teams.map((team, index) => <li key={team.id}>{team.name}: {squadCounts[index]} / {snapshot.config?.max_squad_size ?? 15} players · {amount(team.purse - team.spent, unit)} remaining</li>)}</ul>{unsoldPlayers.length > 0 && <><p>Return an unsold player to the pool if more players are needed to complete balanced squads.</p><div className="auction-admin-actions">{unsoldPlayers.map((player) => <button key={player.id} disabled={busy || !(live || snapshot.config?.status === "paused")} onClick={() => void action("auction_requeue_unsold", { p_player_id: player.id })}>Requeue {player.name}</button>)}</div></>}</section>
              <section className="auction-admin-panel"><h2>Recent activity</h2><ul>{snapshot.events.map((event) => <li key={event.id}>{event.event_type} · {roster.find((player) => player.id === event.player_id)?.name ?? event.player_id} · {amount(event.amount, unit)}</li>)}</ul></section>
            </>}
    </div></main>;
}


function useAuctionLive() {
  const [snapshot, setSnapshot] = useState<AuctionSnapshot>(preAuctionSnapshot);
  const [loading, setLoading] = useState(Boolean(auctionClient));
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try { setSnapshot(await getAuctionSnapshot()); setError(""); }
    catch { setError("Please refresh to try again."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!auctionClient) return;
    const client = auctionClient;
    // Fetch once when the live data source becomes available, then subscribe.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 15000);
    const channel = client.channel("auction-room").on("postgres_changes", { event: "*", schema: "public", table: "auction_config" }, () => { void refresh(); }).on("postgres_changes", { event: "*", schema: "public", table: "auction_players" }, () => { void refresh(); }).on("postgres_changes", { event: "*", schema: "public", table: "auction_teams" }, () => { void refresh(); }).subscribe();
    return () => { window.clearInterval(timer); void client.removeChannel(channel); };
  }, [refresh]);

  return { snapshot, loading, error, refresh };
}

export function TeamsPage() {
  const { snapshot, loading, error } = useAuctionLive();
  const [selectedId, setSelectedId] = useState(() => typeof window === "undefined" ? "" : window.location.hash.slice(1));
  const selected = snapshot.teams.find((team) => team.id === selectedId) ?? snapshot.teams[0];
  const squad = selected ? snapshot.players.filter((player) => player.team_id === selected.id && (player.status === "captain" || player.status === "sold")).sort((a, b) => a.status === "captain" ? -1 : b.status === "captain" ? 1 : a.name.localeCompare(b.name)) : [];
  return <main className="auction-page auction-squads-page"><header className="auction-header"><a className="auction-brand" href={localLink("")}><b>PHF</b><span>Premier League</span></a><nav><a href={localLink("")}>Home</a><a href={localLink("auction.html")}>Auction room</a><span>Teams</span></nav></header>
    <div className="auction-squads-wrap"><div className="auction-section-heading"><div><p className="auction-overline">Season 5 · Live squads</p><h1>Six teams. One trophy.</h1></div><span>{loading ? "Loading…" : "Updates live"}</span></div>
      {error && <p className="auction-alert" role="status">Team updates are unavailable. {error}</p>}
      {snapshot.teams.length ? <><div className="auction-squad-selector" aria-label="Choose a team">{snapshot.teams.map((team) => <button key={team.id} type="button" className={selected?.id === team.id ? "selected" : ""} onClick={() => { setSelectedId(team.id); window.history.replaceState(null, "", `#${team.id}`); }}><TeamCrest team={team} /><strong>{team.name}</strong><span>{squadSize(snapshot.players, team.id)} players</span></button>)}</div>
        {selected && <section className="auction-squad-detail" aria-label={`${selected.name} squad`}><div className="auction-squad-title"><TeamCrest team={selected} /><div><span>Current squad</span><h2>{selected.name}</h2></div><div><span>Players</span><b>{squad.length} / {snapshot.config?.max_squad_size ?? 15}</b></div><div><span>Purse left</span><b>{amount(selected.purse - selected.spent, snapshot.config?.money_label)}</b></div></div><div className="auction-squad-grid">{squad.length ? squad.map((player) => { const profile = roster.find((item) => item.id === player.id) ?? { id: player.id, name: player.name, role: player.role, photo: player.photo, stats: null }; return <article key={player.id}><PlayerImage player={profile} /><div><span>{player.status === "captain" ? "Captain" : profile.role}</span><h3>{player.name}</h3><b>{player.status === "captain" ? "Playing captain" : amount(player.sold_price, snapshot.config?.money_label)}</b></div></article>; }) : <p>The captain and players will appear here as the auction progresses.</p>}</div></section>}</>
        : <div className="auction-team-placeholder">Team names and official logos have not been announced yet. This screen will update once the auctioneer adds them.</div>}
    </div><footer className="auction-footer"><a href={localLink("")}>PHF Premier League</a><span>Season 5 · 2026</span><a href={localLink("auction.html")}>Auction room</a></footer>
  </main>;
}

export default function AuctionPage({ admin = false }: { admin?: boolean }) {
  const { snapshot, loading, error, refresh } = useAuctionLive();
  return admin ? <AdminAuction snapshot={snapshot} refresh={refresh} /> : <PublicAuction snapshot={snapshot} loading={loading} error={error} />;
}
