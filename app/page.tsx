"use client";

import { useEffect, useMemo, useState } from "react";
import { announcedTeams } from "./season5-teams";
import { getAuctionSnapshot, preAuctionSnapshot, type AuctionSnapshot } from "./auction-client";

const termsUrl = "https://docs.google.com/spreadsheets/d/1eAHfI2BuzCkMxljWtC9tXvmM71T9or022M6GlxW48MI/edit?usp=drivesdk";
const venueUrl = "https://www.google.com/maps/search/?api=1&query=Melbourne+Cricket+Ground+Hyderabad";

const matchDays = [
  { day: "21", label: "League day 1" },
  { day: "22", label: "League day 2" },
  { day: "27", label: "League day 3" },
  { day: "28", label: "League day 4" },
  { day: "05", month: "Dec", label: "League day 5" },
  { day: "06", month: "Dec", label: "Championship day" },
];

const fixtures = [
  { date: "21 Nov", matches: [["7:15 AM", "Team 1", "Team 6"], ["10:30 AM", "Team 2", "Team 5"], ["2:00 PM", "Team 3", "Team 4"]] },
  { date: "22 Nov", matches: [["7:15 AM", "Team 1", "Team 5"], ["10:30 AM", "Team 6", "Team 4"], ["2:00 PM", "Team 2", "Team 3"]] },
  { date: "27 Nov", matches: [["7:15 AM", "Team 6", "Team 2"], ["10:30 AM", "Team 1", "Team 4"], ["2:00 PM", "Team 5", "Team 3"]] },
  { date: "28 Nov", matches: [["7:15 AM", "Team 4", "Team 2"], ["10:30 AM", "Team 1", "Team 3"], ["2:00 PM", "Team 5", "Team 6"]] },
  { date: "05 Dec", matches: [["7:15 AM", "Team 3", "Team 6"], ["10:30 AM", "Team 4", "Team 5"], ["2:00 PM", "Team 1", "Team 2"]] },
];

const finals = [
  { time: "10:30 AM", title: "Bronze match", teams: "3rd vs 4th" },
  { time: "2:00 PM", title: "Grand final", teams: "1st vs 2nd" },
];

const champions = [
  { season: "01", year: "2022", winner: "PHF Spartans", runner: "PHF Cobras", final: "Won by 11 runs", href: "https://cricheroes.in/tournament/522214/prestige-cricket-leaguephf-season-1/matches/past-matches" },
  { season: "02", year: "2023", winner: "PHF Cobras", runner: "PHF Master Blasters", final: "Won by 5 runs", href: "https://cricheroes.in/tournament/752988/prestige-cricket-leaguephf-season-2/matches/past-matches" },
  { season: "03", year: "2024", winner: "PHF Spartans 2.0", runner: "PHF Cobras", final: "Won by 4 wickets", href: "https://cricheroes.in/tournament/1160041/prestige-premier-league-season-3/matches/past-matches" },
  { season: "04", year: "2025", winner: "PHF Spartans 2.0", runner: "GARUDA", final: "15 matches · 8 teams · Won final by 6 wickets", href: "https://cricheroes.com/tournament/1680807/prestige-%28phf%29-premier-league-season-4/matches/past-matches" },
];

const tournamentHonours = [
  {
    season: "01", year: "2022", href: "https://cricheroes.com/tournament/522214/prestige-cricket-leaguephf-season-1/stats",
    mvp: { title: "MVP No. 1", player: "Ansuman Nayak", team: "PHF Spartans", value: "14.904", label: "MVP points", photo: "players/ansuman-nayak.jpeg", profile: "https://cricheroes.com/player-profile/10145421/ansuman-nayak/matches" },
    leaders: [
      { title: "Most runs", player: "Naman Saxena", team: "PHF Spartans", value: "44", detail: "4 innings · HS 17", photo: "players/naman-saxena.jpeg", profile: "https://cricheroes.com/player-profile/1030230/naman-saxena/matches" },
      { title: "Most wickets", player: "Ansuman Nayak", team: "PHF Spartans", value: "7", detail: "Economy 3.00 · Best 3 wickets", photo: "players/ansuman-nayak.jpeg", profile: "https://cricheroes.com/player-profile/10145421/ansuman-nayak/matches" },
    ],
  },
  {
    season: "02", year: "2023", href: "https://cricheroes.com/tournament/752988/prestige-cricket-leaguephf-season-2/stats",
    mvp: { title: "MVP No. 1", player: "Naman Saxena", team: "PHF Spartans", value: "33.845", label: "MVP points", photo: "players/naman-saxena.jpeg", profile: "https://cricheroes.com/player-profile/1030230/naman-saxena/matches" },
    leaders: [
      { title: "Most runs", player: "Waseem", team: "PHF OG", value: "266", detail: "6 innings · HS 88", photo: "players/waseem.jpg", profile: "https://cricheroes.com/player-profile/2179032/waseem/matches" },
      { title: "Most wickets", player: "Mayank", team: "PHF Cobras", value: "13", detail: "15 overs · Best 5 wickets", photo: "players/mayank.jpeg", profile: "https://cricheroes.com/player-profile/4489866/mayank/matches" },
    ],
  },
  {
    season: "03", year: "2024", href: "https://cricheroes.com/tournament/1160041/prestige-premier-league-season-3/stats",
    mvp: { title: "Player of the tournament", player: "Swethan Kurakula", team: "PHF Cobras", value: "26.760", label: "MVP points", photo: "players/swethan-kurakula.jpeg", profile: "https://cricheroes.com/player-profile/19421803/swethan-kurakula/matches" },
    leaders: [
      { title: "Best batter", player: "Arjun Paladi", team: "PHF Dabang", value: "193", detail: "5 innings · HS 91", photo: "players/arjun-paladi.jpg", profile: "https://cricheroes.com/player-profile/1222494/arjun-paladi/matches" },
      { title: "Best bowler", player: "Garvit", team: "PHF Spartans New", value: "8", detail: "12 overs · Economy 4.60", photo: "players/garvit.jpeg", profile: "https://cricheroes.com/player-profile/5917883/garvit/matches" },
    ],
  },
  {
    season: "04", year: "2025", href: "https://cricheroes.com/tournament/1680807/prestige-phf-premier-league-season-4/stats",
    mvp: { title: "MVP No. 1", player: "Srikanth K", team: "Warriors", value: "28.487", label: "MVP points", photo: "players/srikanth-k.png", profile: "https://cricheroes.com/player-profile/33453377/srikanth-k/matches" },
    leaders: [
      { title: "Orange Cap", player: "Praveen Mustepally", team: "Garuda", value: "160", detail: "5 innings · HS 64", photo: "players/praveen-mustepally.jpg", profile: "https://cricheroes.com/player-profile/381881/praveen-mustepally/matches" },
      { title: "Purple Cap", player: "Aditya Pandey", team: "PHF Spartans 2.0", value: "10", detail: "18 overs · Economy 4.00", photo: "players/aditya-pandey.jpeg", profile: "https://cricheroes.com/player-profile/15345610/aditya-pandey/matches" },
    ],
  },
];

const seasonFiveStages = [
  { label: "Closed", title: "Player registrations", detail: "The Season 5 player pool is in place.", state: "live" },
  { label: "27 Sep 2026", title: "Captain auction", detail: "Six captains will build balanced squads on auction day.", state: "next" },
  { label: "After auction", title: "Teams & squads", detail: "Official team names and player rosters will appear here.", state: "locked" },
  { label: "Published", title: "Fixtures", detail: "Fifteen league matches and Finals Day are now confirmed.", state: "live" },
];

const legacyPhotos = Array.from({ length: 30 }, (_, index) => ({
  src: `legacy-${index + 1}.jpg`,
  alt: `PHF Premier League legacy moment ${index + 1}`,
  className: index % 9 === 0 ? "cinema-wide" : index % 5 === 0 ? "cinema-tall" : "",
}));

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [auction, setAuction] = useState<AuctionSnapshot>(preAuctionSnapshot);
  const [auctionOnline, setAuctionOnline] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const next = await getAuctionSnapshot();
        if (active) { setAuction(next); setAuctionOnline(Boolean(next.config)); }
      } catch { if (active) setAuctionOnline(false); }
    };
    void refresh();
    const timer = window.setInterval(refresh, 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const command = useMemo(() => {
    const currentState = auction.players.find((player) => player.id === auction.config?.current_player_id);
    const current = currentState ?? null;
    const sold = auction.players.filter((player) => player.status === "sold").length;
    return { current, sold, status: auction.config?.status ?? "preparing", id: auction.auction?.id ?? "" };
  }, [auction]);

  return (
    <main>
      <header className="cinema-header">
        <a className="phf-mark" href="#top" aria-label="PHF Premier League home"><b>PHF</b><span>Premier League</span></a>
        <button className="cinema-menu" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label="Toggle navigation"><i/><i/></button>
        <nav className={menuOpen ? "cinema-nav open" : "cinema-nav"} aria-label="Main navigation">
          <a href="#fixtures" onClick={() => setMenuOpen(false)}>Fixtures</a>
          <a href="#season-five" onClick={() => setMenuOpen(false)}>Season 5</a>
          <a href="./players.html">Players</a>
          <div className="cinema-nav-teams"><a href="./teams.html">Teams</a><div className="cinema-team-menu" aria-label="Season 5 teams">{announcedTeams.map((team) => <a key={team.id} href={`./teams.html?team=${team.id}`}>{team.name}</a>)}</div></div>
          <a href="#records" onClick={() => setMenuOpen(false)}>Records</a>
          <a href="#sponsors" onClick={() => setMenuOpen(false)}>Sponsors</a>
          <a href="#legacy" onClick={() => setMenuOpen(false)}>Legacy</a>
          <a href="#champions" onClick={() => setMenuOpen(false)}>Champions</a>
          <a className="gold-link" href="./auction.html">Live auction ↗</a>
        </nav>
      </header>

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
        <div className="hero-fixture">
          <span>Match days</span><b>21 · 22 · 27 · 28 Nov</b><small>5 · 6 December 2026 · Melbourne Cricket Ground</small>
        </div>
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
          <div className="command-actions"><a href={`./auction.html${command.id ? `?auction=${command.id}` : ""}`}>Open live board</a><a href={`./teams.html${command.id ? `?auction=${command.id}` : ""}`}>View squads</a></div>
        </div>
        <div className="command-links">
          <a href="./players.html"><span>Player directory</span><strong>Photos, roles &amp; career stats</strong><i>↗</i></a>
          <a href="./teams.html"><span>Six franchises</span><strong>Captains, crests &amp; squads</strong><i>↗</i></a>
          <a href="#dates"><span>Tournament calendar</span><strong>Six matchdays at MCG</strong><i>↓</i></a>
        </div>
      </section>

      <section className="dates-stage" id="dates">
        <div className="section-intro"><p>The 2026 tournament</p><h2>Six days.<br/><em>One champion.</em></h2></div>
        <div className="date-grid">
          {matchDays.map((item, index) => <article className="date-tile" key={`${item.day}-${item.month ?? "Nov"}`}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.day}</strong><b>{item.month ?? "Nov"}</b><small>{item.label}</small></article>)}
        </div>
        <div className="event-rail">
          <div><span>Venue</span><b>Melbourne Cricket Ground</b><a href={venueUrl} target="_blank" rel="noreferrer">Map search ↗</a></div>
          <div><span>Format</span><b>IPL-style round robin</b><small>Every team plays every other team</small></div>
          <div><span>Playing policy</span><b>Day games only</b><small>One match per player per day</small></div>
          <div><span>Entry</span><b>₹2,000</b><small>Invitations closed</small></div>
          <div><span>Auction</span><b>27 September 2026</b><small>Six captain-led squads</small></div>
        </div>
      </section>

      <section className="fixtures-stage" id="fixtures">
        <div className="fixtures-lead">
          <div className="section-intro"><p>Official Season 5 schedule</p><h2>Fifteen battles.<br/><em>One final.</em></h2></div>
          <div className="fixtures-summary"><b>6</b><span>Teams</span><b>5</b><span>Games each</span><b>17</b><span>Total matches</span></div>
        </div>
        <div className="lottery-note">
          <span>Live lottery · 27 September</span>
          <p>Team numbers 1–6 will be drawn live on Auction Day. No choosing fixtures. No choosing opponents.</p>
        </div>
        <div className="fixture-board">
          {fixtures.map((day, dayIndex) => <article className="fixture-day" key={day.date}>
            <header><span>League day {dayIndex + 1}</span><strong>{day.date}</strong></header>
            <div>{day.matches.map(([time, home, away]) => <div className="fixture-row" key={`${day.date}-${time}`}><time>{time}</time><b>{home}</b><i>vs</i><b>{away}</b></div>)}</div>
          </article>)}
        </div>
        <div className="finals-board">
          <div className="finals-date"><span>Finals day</span><strong>06 Dec</strong></div>
          {finals.map((match) => <article key={match.title}><time>{match.time}</time><span>{match.title}</span><strong>{match.teams}</strong></article>)}
        </div>
        <p className="fixtures-footnote">Every match counts. Every point matters.</p>
      </section>

      <section className="auction-stage" id="season-five">
        <div className="auction-head">
          <div className="section-intro"><p>Season 5 status</p><h2>The auction room<br/><em>is taking shape.</em></h2></div>
          <div className="live-invite"><i/><span>Invitations closed</span><b>Pre-auction phase</b></div>
        </div>
        <p className="auction-copy">The Season 5 player pool is ready and invitations are closed. On 27 September 2026, six playing captains will form nearly equal squads before team numbers are decided by live lottery.</p>
        <a className="auction-roster-link" href="./players.html">Explore the player pool <span>↗</span></a>
        <div className="auction-track">
          {seasonFiveStages.map((stage, index) => <article className={`auction-step ${stage.state}`} key={stage.title}><span>{String(index + 1).padStart(2, "0")} / {stage.label}</span><strong>{stage.title}</strong><p>{stage.detail}</p>{stage.state === "live" ? <a href={stage.title === "Fixtures" ? "#fixtures" : "./players.html"}>{stage.title === "Fixtures" ? "View full schedule ↓" : "View registered players ↗"}</a> : <small>{stage.state === "next" ? "Details coming soon" : "Locked until announced"}</small>}</article>)}
        </div>
      </section>

      <section className="records-stage" id="records">
        <div className="records-lead">
          <div className="section-intro"><p>Official CricHeroes tournament records</p><h2>The league&apos;s<br/><em>hall of fame.</em></h2></div>
          <p>Every name and number below is taken from the complete tournament leaderboard—not a single match. Open a season or player to inspect the record on CricHeroes.</p>
        </div>
        <div className="honours-board">
          {tournamentHonours.map((item) => <article className="season-honours" key={item.season}>
            <div className="honours-season"><span>Season</span><b>{item.season}</b><small>{item.year}</small><a href={item.href} target="_blank" rel="noreferrer">Full leaderboard ↗</a></div>
            <a className="mvp-portrait" href={item.mvp.profile} target="_blank" rel="noreferrer">
              <img src={item.mvp.photo} alt={`${item.mvp.player}, ${item.mvp.title} for PHF Season ${item.season}`} loading="lazy"/>
              <span>{item.mvp.title}</span><strong>{item.mvp.player}</strong><small>{item.mvp.team}</small>
              <div><b>{item.mvp.value}</b><i>{item.mvp.label}</i></div>
            </a>
            <div className="season-leaders">
              {item.leaders.map((leader) => <a href={leader.profile} target="_blank" rel="noreferrer" className="leader-row" key={leader.title}>
                <img src={leader.photo} alt={`${leader.player}, ${leader.title} for PHF Season ${item.season}`} loading="lazy"/>
                <div><span>{leader.title}</span><strong>{leader.player}</strong><small>{leader.team}</small></div>
                <p><b>{leader.value}</b><small>{leader.detail}</small></p><i>↗</i>
              </a>)}
            </div>
          </article>)}
        </div>
        <div className="records-note"><span>Verified archive</span><p>Ranks reflect the completed Season 1–4 CricHeroes tournament leaderboards. Season 5 records will begin after the auction, squads and fixtures are announced.</p></div>
      </section>

      <section className="sponsors-stage" id="sponsors">
        <div className="sponsors-copy">
          <div className="section-intro"><p>Season 5 partners</p><h2>Backing the<br/><em>next chapter.</em></h2></div>
          <p className="sponsors-intro">The partners helping turn Season 5 into a bigger stage for our players, teams and community.</p>
          <div className="presenting-partner">
            <span>Presenting sponsor</span>
            <strong>Kotak Mahindra Bank</strong>
          </div>
          <div className="partner-list">
            <article><span>Proud partner</span><strong>The Aartah School</strong></article>
            <article><span>Proud partner</span><strong>Viseshta Avenues</strong></article>
            <article><span>Proud partner</span><strong>Palm Valley</strong><small>Wealth in every acre</small></article>
            <article><span>Beverage partner</span><strong>Monin</strong></article>
            <article><span>Mobility partner</span><strong>GetMeCab</strong></article>
          </div>
        </div>
        <a className="sponsors-poster" href="season5-auction-sponsors.jpg" target="_blank" rel="noreferrer" aria-label="Open the official Season 5 Player Auction poster">
          <img src="season5-auction-sponsors.jpg" alt="PHF Premier League Season 5 Player Auction poster featuring the teams and official sponsors" loading="lazy"/>
          <span>Official auction poster ↗</span>
        </a>
      </section>

      <section className="legacy-stage" id="legacy">
        <div className="legacy-title"><p>Five years in the making</p><h2>This is<br/>our <em>legacy.</em></h2><span>Thirty real moments. One PHF family.</span></div>
        <div className="cinema-gallery">
          {legacyPhotos.map((photo, index) => <a className={photo.className} href={photo.src} target="_blank" rel="noreferrer" key={photo.src} aria-label={`Open legacy photograph ${index + 1}`}><img src={photo.src} alt={photo.alt} loading="lazy"/><span>{String(index + 1).padStart(2, "0")}</span></a>)}
        </div>
      </section>

      <section className="champions-stage" id="champions">
        <div className="section-intro"><p>Verified on CricHeroes</p><h2>The names on<br/><em>the trophy.</em></h2></div>
        <div className="champion-list">
          {champions.map((item) => <a href={item.href} target="_blank" rel="noreferrer" className="champion-row" key={item.season}><span>S{item.season} / {item.year}</span><strong>{item.winner}</strong><div><b>Runners-up · {item.runner}</b><small>{item.final}</small></div><i>↗</i></a>)}
        </div>
      </section>

      <section className="final-call" id="register">
        <div className="final-photo" />
        <div className="final-copy"><p>Season 5 · Auction ahead</p><h2>Your team.<br/>Your moment.</h2><span>खेल · जुनून · परिवार</span><a className="gold-button" href="./players.html">Meet the players <b>↗</b></a></div>
        <div className="final-details"><a href={termsUrl} target="_blank" rel="noreferrer">Terms &amp; conditions ↗</a><a href={venueUrl} target="_blank" rel="noreferrer">Venue map ↗</a><span>Tarun · +91 98853 01226</span><span>Karthik · +91 84381 49893</span></div>
      </section>

      <footer className="cinema-footer"><div className="phf-mark"><b>PHF</b><span>Premier League</span></div><p>Season 5 · November–December 2026</p><a href="#top">Back to top ↑</a></footer>
      <nav className="mobile-dock" aria-label="Quick navigation"><a href="./index.html">Home</a><a href="./players.html">Players</a><a className="live" href="./auction.html"><i/>Live</a><a href="./teams.html">Teams</a></nav>
    </main>
  );
}
