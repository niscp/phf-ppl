"use client";

import { useEffect, useMemo, useState } from "react";
import { announcedTeams } from "./season5-teams";
import SiteHeader from "./site-header";
import { auctionClient, getAuctionSnapshot, getTournamentSnapshot, preAuctionSnapshot, type AuctionSnapshot, type TournamentSnapshot } from "./auction-client";

export default function Home() {
  const [auction, setAuction] = useState<AuctionSnapshot>(preAuctionSnapshot);
  const [auctionOnline, setAuctionOnline] = useState(false);
  const [tournament, setTournament] = useState<TournamentSnapshot>({ matches: [], standings: [], player_stats: [] });

  // Old bookmarks and cached navigation used /#fixtures. Send that legacy link
  // to the dedicated match schedule instead of leaving visitors on the homepage.
  useEffect(() => {
    const openFixturesFromLegacyHash = () => {
      if (window.location.hash.toLowerCase() !== "#fixtures") return;
      const base = window.location.pathname.startsWith("/phf-ppl/") ? "/phf-ppl/" : "/";
      window.location.replace(`${base}fixtures.html`);
    };
    openFixturesFromLegacyHash();
    window.addEventListener("hashchange", openFixturesFromLegacyHash);
    return () => window.removeEventListener("hashchange", openFixturesFromLegacyHash);
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const next = await getAuctionSnapshot();
        if (active) { setAuction(next); setAuctionOnline(Boolean(next.config)); }
      } catch { if (active) setAuctionOnline(false); }
    };
    void refresh();
    const timer = window.setInterval(refresh, 5000);
    const client = auctionClient;
    const channel = client?.channel("home-auction-live").on("auction_updated", {}, () => { void refresh(); }).subscribe();
    return () => { active = false; window.clearInterval(timer); if (client && channel) void client.removeChannel(channel); };
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = async () => { try { const next = await getTournamentSnapshot(); if (active) setTournament(next); } catch { /* The pre-tournament shell remains useful offline. */ } };
    void refresh();
    const timer = window.setInterval(refresh, 10000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const command = useMemo(() => {
    const currentState = auction.players.find((player) => player.id === auction.config?.current_player_id);
    const current = currentState ?? null;
    const sold = auction.players.filter((player) => player.status === "sold").length;
    return { current, sold, status: auction.config?.status ?? "preparing", id: auction.auction?.id ?? "" };
  }, [auction]);

  const homeTeams = useMemo(() => auction.teams.length ? auction.teams : announcedTeams, [auction.teams]);

  return (
    <main>
      <SiteHeader active="home" overlay />

      <section className="cinema-hero" id="top">
        <div className="hero-shade" />
        <div className="hero-v" aria-hidden="true">V</div>
        <div className="cinema-hero-copy">
          <p className="broadcast-kicker"><span>PHF Premier League</span><b>Cricket · Season 5</b></p>
          <h1><span>Five years.</span><strong>One legacy.</strong></h1>
          <p className="hero-statement">The lights come on. The rivalries return. PHF cricket enters its biggest season yet.</p>
          <div className="hero-ctas">
            <a className="gold-button" href="./players.html">Meet the players <span>↗</span></a>
          </div>
        </div>
        <a className="hero-fixture" href="./fixtures.html"><span>Season 5 fixtures</span><b>15 league matches</b><small>Nov 21, 22, 28, 29 · Dec 5, 6</small></a>
        <div className="hero-edition"><span>Edition</span><b>05</b></div>
      </section>

      <div className="broadcast-strip"><div>THE LEAGUE RETURNS <i>◆</i> DAYTIME CRICKET <i>◆</i> IPL-STYLE ROUND ROBIN <i>◆</i> AUCTION BASED <i>◆</i> THE LEAGUE RETURNS <i>◆</i> ONE MATCH PER PLAYER PER DAY <i>◆</i></div></div>

      <section className="command-centre" aria-label="Season 5 command centre">
        <div className="command-title">
          <p>Season 5 command centre</p>
          <h2>Everything happening.<br/><em>Right now.</em></h2>
        </div>
        <div className="command-live">
          <div className={`command-signal ${auctionOnline ? "connected" : "standby"}`}><i/>{auctionOnline ? "Connected to auction room" : "Auction room on standby"}</div>
          <span className="command-state">{command.status}</span>
          <h3>{command.current ? command.current.name : command.status === "complete" ? "The squads are ready" : "The hammer awaits"}</h3>
          <p>{command.current ? `${command.current.role ?? "Player"} is currently on the block.` : "Follow every bid, sale and squad update from one live board."}</p>
          <div className="command-numbers"><div><b>{command.sold}</b><span>Players sold</span></div><div><b>{auction.teams.length || 6}</b><span>Teams</span></div><div><b>{auctionOnline ? auction.players.length : "80+"}</b><span>Player pool</span></div></div>
          <div className="command-actions"><a href={command.status === "complete" ? `./highlights.html${command.id ? `?auction=${command.id}` : ""}` : `./auction.html${command.id ? `?auction=${command.id}` : ""}`}>{command.status === "complete" ? "See auction highlights" : "Open live board"}</a><a href={`./teams.html${command.id ? `?auction=${command.id}` : ""}`}>View squads</a></div>
        </div>
        <div className="command-links">
          <a href="./players.html"><span>Player directory</span><strong>Photos, roles &amp; career stats</strong><i>↗</i></a>
          <a href="./teams.html"><span>Six franchises</span><strong>Captains, crests &amp; squads</strong><i>↗</i></a>
          <a href="./highlights.html"><span>Official auction results</span><strong>Biggest buys &amp; final ledgers</strong><i>↗</i></a>
          <a href="./fixtures.html"><span>Fixtures</span><strong>Browse all matchdays and filter by team</strong><i>↗</i></a>
        </div>
      </section>

      <section className="league-centre" id="league-centre" aria-label="Live league centre">
        <div className="league-centre-heading">
          <div className="section-intro"><p>Live league centre</p><h2>The table<br/><em>starts here.</em></h2></div>
          <div className="table-status"><i/>Pre-tournament table<strong>Updates after every result</strong></div>
        </div>
        <div className="league-centre-grid">
          <article className="points-panel">
            <div className="table-head"><span>Pos</span><span>Team</span><span>P</span><span>W</span><span>L</span><span>Pts</span><span>NRR</span></div>
            {(tournament.standings.length ? tournament.standings : homeTeams.map((team) => ({ team_id: team.id, team_name: team.name, played: 0, wins: 0, losses: 0, points: 0, nrr: 0 }))).map((row, index) => <div className="table-row" key={row.team_id}><b>{String(index + 1).padStart(2, "0")}</b><strong>{row.team_name}</strong><span>{row.played}</span><span>{row.wins}</span><span>{row.losses}</span><em>{row.points}</em><span>{row.played ? row.nrr.toFixed(2) : "—"}</span></div>)}
            <p className="table-note">Every team plays five league matches. Points and net run rate update automatically after the administrator records a result.</p>
          </article>
          <article className="next-match-panel schedule-callout">
            <div className="next-match-kicker"><span>Season 5 schedule</span><b>2026</b></div>
            <h3>Every day<br/><em>moves the table.</em></h3>
            <p>Six teams. Fifteen league matches. The final and bronze match close the season on December 6.</p>
            <div className="schedule-callout-dates"><span>Nov 21 · 22 · 28 · 29</span><span>Dec 5 · Finals Dec 6</span></div>
            <a href="./fixtures.html">Browse fixtures ↗</a>
          </article>
        </div>
        <div className="leaderboard-strip">
          <div className="leaderboard-title"><span>Player leaderboard</span><strong>{tournament.player_stats.length ? "The season's first movers." : "The race starts on match day."}</strong></div>
          {tournament.player_stats.length ? <><div className="leaderboard-card"><span>Orange cap watch</span><strong>{[...tournament.player_stats].sort((a, b) => b.runs - a.runs)[0]?.name}</strong><b>{[...tournament.player_stats].sort((a, b) => b.runs - a.runs)[0]?.runs} runs</b></div><div className="leaderboard-card"><span>Purple cap watch</span><strong>{[...tournament.player_stats].sort((a, b) => b.wickets - a.wickets)[0]?.name}</strong><b>{[...tournament.player_stats].sort((a, b) => b.wickets - a.wickets)[0]?.wickets} wickets</b></div></> : <div className="leaderboard-empty">Player runs, wickets, catches and Player-of-the-Match awards will appear automatically after the first scorecard.</div>}
        </div>
      </section>

      <section className="sponsor-banner-section" id="sponsors" aria-label="Season 5 sponsors">
        <div className="sponsor-banner-title"><span>PHF Premier League · Season 5</span><h2>Presented with our partners</h2></div>
        <div className="sponsor-banner-rail">
          <article className="sponsor-banner presenting"><span>Presenting sponsor</span><strong>Kotak Mahindra Bank</strong></article>
          <article className="sponsor-banner"><span>Proud partner</span><strong>The Aartah School</strong></article>
          <article className="sponsor-banner"><span>Proud partner</span><strong>Viseshta Avenues</strong></article>
          <article className="sponsor-banner"><span>Proud partner</span><strong>Palm Valley</strong><small>Wealth in every acre</small></article>
          <article className="sponsor-banner"><span>Beverage partner</span><strong>Monin</strong></article>
          <article className="sponsor-banner"><span>Mobility partner</span><strong>GetMeCab</strong></article>
        </div>
      </section>

      <footer className="cinema-footer"><div className="phf-mark"><b>PHF</b><span>Premier League</span></div><p>Season 5 · November–December 2026</p><a href="./index.html">Back to top ↑</a></footer>
    </main>
  );
}
