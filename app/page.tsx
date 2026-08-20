"use client";

import { useState } from "react";

const registerUrl = "https://docs.google.com/forms/d/e/1FAIpQLSfscoEpVUW_JKyYhTsL6wF00Ffk4X1wVTw4UW3ACflvXeicOA/viewform";
const termsUrl = "https://docs.google.com/spreadsheets/d/1eAHfI2BuzCkMxljWtC9tXvmM71T9or022M6GlxW48MI/edit?usp=drivesdk";
const venueUrl = "https://share.google/clJmAmYZH5Kvxpb4x";

const matchDays = [
  { day: "21", label: "Opening Friday" },
  { day: "22", label: "Super Saturday" },
  { day: "28", label: "Finals weekend" },
  { day: "29", label: "Championship day" },
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
  { label: "Now open", title: "Player registrations", detail: "Invitations and player entries are being collected.", state: "live" },
  { label: "12 / 13 Sep", title: "Captain auction", detail: "Captains build their squads when the auction room opens.", state: "next" },
  { label: "After auction", title: "Teams & squads", detail: "Official team names and player rosters will appear here.", state: "locked" },
  { label: "Before matchday", title: "Fixtures & table", detail: "Schedule, results and standings will follow.", state: "locked" },
];

const legacyPhotos = Array.from({ length: 30 }, (_, index) => ({
  src: `legacy-${index + 1}.jpg`,
  alt: `PHF Premier League legacy moment ${index + 1}`,
  className: index % 9 === 0 ? "cinema-wide" : index % 5 === 0 ? "cinema-tall" : "",
}));

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main>
      <header className="cinema-header">
        <a className="phf-mark" href="#top" aria-label="PHF Premier League home"><b>PHF</b><span>Premier League</span></a>
        <button className="cinema-menu" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label="Toggle navigation"><i/><i/></button>
        <nav className={menuOpen ? "cinema-nav open" : "cinema-nav"} aria-label="Main navigation">
          <a href="#dates" onClick={() => setMenuOpen(false)}>Match days</a>
          <a href="#season-five" onClick={() => setMenuOpen(false)}>Season 5</a>
          <a href="#records" onClick={() => setMenuOpen(false)}>Records</a>
          <a href="#legacy" onClick={() => setMenuOpen(false)}>Legacy</a>
          <a href="#champions" onClick={() => setMenuOpen(false)}>Champions</a>
          <a className="gold-link" href={registerUrl} target="_blank" rel="noreferrer">Register now</a>
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
            <a className="gold-button" href={registerUrl} target="_blank" rel="noreferrer">Register for the auction <span>↗</span></a>
          </div>
        </div>
        <div className="hero-fixture">
          <span>Match days</span><b>21 · 22 · 28 · 29</b><small>November 2026 · SRRC Cricket Ground</small>
        </div>
        <div className="hero-edition"><span>Edition</span><b>05</b></div>
      </section>

      <div className="broadcast-strip"><div>THE LEAGUE RETURNS <i>◆</i> DAY &amp; NIGHT CRICKET <i>◆</i> 5 YEAR LEGACY <i>◆</i> AUCTION BASED <i>◆</i> THE LEAGUE RETURNS <i>◆</i> DAY &amp; NIGHT CRICKET <i>◆</i></div></div>

      <section className="dates-stage" id="dates">
        <div className="section-intro"><p>The 2026 tournament</p><h2>Four days.<br/><em>One champion.</em></h2></div>
        <div className="date-grid">
          {matchDays.map((item, index) => <article className="date-tile" key={item.day}><span>0{index + 1}</span><strong>{item.day}</strong><b>Nov</b><small>{item.label}</small></article>)}
        </div>
        <div className="event-rail">
          <div><span>Venue</span><b>SRRC Cricket Ground</b><a href={venueUrl} target="_blank" rel="noreferrer">Map ↗</a></div>
          <div><span>Format</span><b>Minimum 3 matches</b><small>Including one night match</small></div>
          <div><span>Entry</span><b>₹2,000</b><small>Registration closes 30 Aug</small></div>
          <div><span>Auction</span><b>12 / 13 Sep</b><small>Captain-led squads</small></div>
        </div>
      </section>

      <section className="auction-stage" id="season-five">
        <div className="auction-head">
          <div className="section-intro"><p>Season 5 status</p><h2>The auction room<br/><em>is taking shape.</em></h2></div>
          <div className="live-invite"><i/><span>Invitations open</span><b>Pre-auction phase</b></div>
        </div>
        <p className="auction-copy">Season 5 teams have not been formed yet. We are collecting player registrations and captain invitations now; official squads, fixtures and the points table will unlock after the auction.</p>
        <div className="auction-track">
          {seasonFiveStages.map((stage, index) => <article className={`auction-step ${stage.state}`} key={stage.title}><span>{String(index + 1).padStart(2, "0")} / {stage.label}</span><strong>{stage.title}</strong><p>{stage.detail}</p>{stage.state === "live" ? <a href={registerUrl} target="_blank" rel="noreferrer">Join the player pool ↗</a> : <small>{stage.state === "locked" ? "Locked until announced" : "Next milestone"}</small>}</article>)}
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

      <section className="legacy-stage" id="legacy">
        <div className="legacy-title"><p>Five years in the making</p><h2>This is<br/>our <em>legacy.</em></h2><span>Thirty real moments. One PHF family.</span></div>
        <div className="cinema-gallery">
          {legacyPhotos.map((photo, index) => <a className={photo.className} href={photo.src} target="_blank" key={photo.src} aria-label={`Open legacy photograph ${index + 1}`}><img src={photo.src} alt={photo.alt} loading="lazy"/><span>{String(index + 1).padStart(2, "0")}</span></a>)}
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
        <div className="final-copy"><p>Season 5 · Registrations open</p><h2>Your team.<br/>Your moment.</h2><span>खेल · जुनून · परिवार</span><a className="gold-button" href={registerUrl} target="_blank" rel="noreferrer">Enter Season 5 <b>↗</b></a></div>
        <div className="final-details"><a href={termsUrl} target="_blank" rel="noreferrer">Terms &amp; conditions ↗</a><a href={venueUrl} target="_blank" rel="noreferrer">Venue map ↗</a><span>Tarun · +91 98853 01226</span><span>Karthik · +91 84381 49893</span></div>
      </section>

      <footer className="cinema-footer"><div className="phf-mark"><b>PHF</b><span>Premier League</span></div><p>Season 5 · November 2026</p><a href="#top">Back to top ↑</a></footer>
    </main>
  );
}
