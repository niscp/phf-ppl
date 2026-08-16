"use client";

import { useState } from "react";

const matchDays = ["21", "22", "28", "29"];

const campaignPosters = [
  { src: "/campaign-1.jpg", alt: "15 days left to register for PHF Premier League Season 5" },
  { src: "/campaign-2.jpg", alt: "Be part of the biggest fun of PHF Season 5" },
  { src: "/campaign-3.jpg", alt: "Captain registration and cricket kit support announcement" },
  { src: "/campaign-4.jpg", alt: "PHF Season 5 player registration reassurance poster" },
  { src: "/campaign-5.jpg", alt: "PHF Season 5 captain and player registration poster" },
  { src: "/campaign-6.jpg", alt: "PHF cricket brotherhood and registration campaign" },
  { src: "/campaign-7.jpg", alt: "PHF Season 5 auction registration campaign" },
  { src: "/campaign-8.jpg", alt: "PHF Premier League Season 5 official tournament poster" },
];

const legacyPhotos = [
  { src: "/legacy-1.jpg", alt: "Warriors and Cobras teams together after a previous PHF season match", caption: "Rivals for the match. One family after it.", className: "legacy-wide" },
  { src: "/legacy-2.jpg", alt: "Garuda team with the PHF trophy and individual awards", caption: "A squad, a trophy, a season remembered.", className: "legacy-wide" },
  { src: "/legacy-3.jpg", alt: "PHF organisers and players behind the season trophy collection", caption: "The people behind the league.", className: "legacy-wide" },
  { src: "/legacy-4.jpg", alt: "PHF organisers preparing the awards display", caption: "Before the cheers: making match day happen.", className: "legacy-wide" },
  { src: "/legacy-5.jpg", alt: "Large PHF league community group at the awards ceremony", caption: "One league. One community.", className: "legacy-feature" },
  { src: "/legacy-6.jpg", alt: "PHF trophy winners and organisers at the awards presentation", caption: "The silverware moment.", className: "legacy-square" },
  { src: "/legacy-7.jpg", alt: "PHF players and organisers with the complete trophy collection", caption: "Every award carries a story.", className: "legacy-square" },
  { src: "/legacy-8.jpg", alt: "Archive poster for PHF Premier League Season 4", caption: "From the archive: the Season 4 call-up.", className: "legacy-tall" },
  { src: "/legacy-9.jpg", alt: "PHF winners and runners-up trophies on the cricket field", caption: "Winners. Runners-up. Sportsmanship.", className: "legacy-tall" },
  { src: "/legacy-10.jpg", alt: "PHF Cobras team posing with trophies", caption: "A champion team and the rewards of the season.", className: "legacy-wide" },
  { src: "/legacy-11.jpg", alt: "PHF Dabang team receiving a trophy on the cricket field", caption: "PHF Dabang raise their prize.", className: "legacy-square" },
  { src: "/legacy-12.jpg", alt: "PHF Cobras players lined up with individual awards", caption: "Cobras honours across the squad.", className: "legacy-wide" },
  { src: "/legacy-13.jpg", alt: "PHF Cobras squad gathered around their trophies", caption: "A team built to compete.", className: "legacy-square" },
  { src: "/legacy-14.jpg", alt: "Celebrating PHF team with the winners trophy", caption: "This is what winning feels like.", className: "legacy-square" },
  { src: "/legacy-15.jpg", alt: "Players from several PHF teams celebrating together", caption: "Different colours. One league.", className: "legacy-feature" },
  { src: "/legacy-16.jpg", alt: "PHF Spartans players with their team awards", caption: "Spartans and the season's rewards.", className: "legacy-tall" },
  { src: "/legacy-17.jpg", alt: "PHF Cobras players and supporters holding a trophy", caption: "The trophy belongs to the whole team.", className: "legacy-wide" },
  { src: "/legacy-18.jpg", alt: "PHF Cobras squad portrait with trophies", caption: "Cobras: together to the final ball.", className: "legacy-wide" },
  { src: "/legacy-19.jpg", alt: "Individual PHF award presentation on the cricket field", caption: "A performance recognised.", className: "legacy-tall" },
  { src: "/legacy-20.jpg", alt: "PHF player receiving a trophy and award", caption: "Every player leaves a mark.", className: "legacy-tall" },
];

const format = [
  { value: "3+", label: "Matches per team" },
  { value: "4", label: "Match days" },
  { value: "1", label: "Night match minimum" },
  { value: "₹2K", label: "Registration" },
];

const archive = [
  {
    season: "03",
    league: "Prestige Premier League",
    dates: "09–17 Nov 2024",
    format: "15 overs",
    champion: "PHF Spartans 2.0",
    runnerUp: "PHF Cobras",
    final: "Won by 4 wickets",
    home: "PHF Dabang",
    away: "Titans",
    standout: "Sharad Sharma",
    feature: "118/5 · 119/7",
    result: "Titans won by 3 wickets",
    tournament: "https://cricheroes.in/tournament/1160041/prestige-premier-league-season-3/matches/past-matches",
    href: "https://cricheroes.in/scorecard/13396124/prestige-premier-league---season-3/phf-dabang-vs-titans",
  },
  {
    season: "02",
    league: "Prestige Cricket League (PHF)",
    dates: "28 Oct–05 Nov 2023",
    format: "12–16 overs",
    champion: "PHF Cobras",
    runnerUp: "PHF Master Blasters",
    final: "Won by 5 runs",
    home: "PHF Spartans",
    away: "PHF OG",
    standout: "Naman Saxena",
    feature: "183/1 · 137/8",
    result: "Spartans won by 46 runs",
    tournament: "https://cricheroes.in/tournament/752988/prestige-cricket-leaguephf-season-2/matches/past-matches",
    href: "https://cricheroes.in/scorecard/8357024/prestige-cricket-league(phf)-season-2/phf-spartans-vs-phf-og",
  },
  {
    season: "01",
    league: "Prestige Cricket League (PHF)",
    dates: "10–18 Dec 2022",
    format: "10–12 overs",
    champion: "PHF Spartans",
    runnerUp: "PHF Cobras",
    final: "Won by 11 runs",
    home: "PHF Strikers",
    away: "Prestige Super Kings",
    standout: "Nishank Singh",
    feature: "40/5 · 41/4",
    result: "Super Kings won by 2 wickets",
    tournament: "https://cricheroes.in/tournament/522214/prestige-cricket-leaguephf-season-1/matches/past-matches",
    href: "https://cricheroes.in/scorecard/4929183/prestige-cricket-league(phf)-season--1/phf-strikers-vs-prestige-super-kings",
  },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="PHF Premier League home">
          <span className="brand-ball" aria-hidden="true"><i /></span>
          <span><b>PHF</b><small>Premier League</small></span>
        </a>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label="Toggle navigation">
          <span /><span />
        </button>
        <nav className={menuOpen ? "nav open" : "nav"} aria-label="Main navigation">
          <a href="#format" onClick={() => setMenuOpen(false)}>Format</a>
          <a href="#fixtures" onClick={() => setMenuOpen(false)}>Fixtures</a>
          <a href="#archive" onClick={() => setMenuOpen(false)}>Archive</a>
          <a href="#legacy" onClick={() => setMenuOpen(false)}>Gallery</a>
          <a href="#season" onClick={() => setMenuOpen(false)}>Season 5</a>
          <a className="nav-cta" href="#register" onClick={() => setMenuOpen(false)}>Register a team</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="pitch-lines" aria-hidden="true"><span /><span /><span /></div>
        <div className="hero-copy">
          <p className="eyebrow"><span>PHF Premier League</span> 21 · 22 · 28 · 29 November 2026</p>
          <p className="desi-refrain">खेल <i>•</i> जुनून <i>•</i> परिवार</p>
          <h1><span>Season</span><strong>V</strong></h1>
          <p className="hero-lede">Five seasons in. The rivalry is real. Gather your squad and step into the biggest chapter of PHF cricket yet.</p>
          <div className="hero-actions">
            <a className="button primary" href="https://docs.google.com/forms/d/e/1FAIpQLSfscoEpVUW_JKyYhTsL6wF00Ffk4X1wVTw4UW3ACflvXeicOA/viewform" target="_blank" rel="noreferrer">Register by 30 Aug <span>↗</span></a>
            <a className="text-link" href="#fixtures">See opening day <span>↓</span></a>
          </div>
        </div>
        <div className="scoreboard" aria-label="Season five announcement">
          <div className="scoreboard-top"><span>New season</span><span>PHFPL / 05</span></div>
          <div className="scoreboard-main">
            <span className="innings">Innings</span>
            <strong>05</strong>
            <div className="score-meta"><span>Matches<br/><b>3+</b></span><span>Night<br/><b>01</b></span></div>
          </div>
          <div className="scoreboard-bottom"><span>21—29 November 2026</span><span>SRRC Cricket Ground</span></div>
        </div>
        <div className="scroll-note">Scroll for the season brief</div>
      </section>

      <section className="ticker" aria-label="League highlights">
        <div>सीज़न पाँच <i>◆</i> Day &amp; night cricket <i>◆</i> खेल · जुनून · परिवार <i>◆</i> Bigger games <i>◆</i> Brighter nights <i>◆</i> Real cricket</div>
      </section>

      <section className="poster-section" aria-label="Official Season 5 poster">
        <div className="poster-copy">
          <p className="eyebrow dark">Official announcement</p>
          <h2>Under the<br/>lights.</h2>
          <p>Every team plays a minimum of three matches, including at least one night match. The ground is approximately 15 minutes from PHF.</p>
          <div className="poster-facts">
            <div><span>Registration</span><strong>₹2,000</strong></div>
            <div><span>Auction dates</span><strong>12 / 13 Sep</strong></div>
          </div>
          <a className="button poster-button" href="/phf-season-5-poster.jpg" target="_blank">Open full poster <span>↗</span></a>
        </div>
        <a className="poster-art" href="/phf-season-5-poster.jpg" target="_blank" aria-label="Open the official PHF Premier League Season 5 poster">
          <img src="/phf-season-5-poster.jpg" alt="PHF Premier League Season 5 official registration poster" />
        </a>
      </section>

      <section className="campaign-section" id="campaign">
        <div className="campaign-heading">
          <div><p className="eyebrow">Season 5 campaign</p><h2>One league.<br/>One family.</h2></div>
          <div className="campaign-note"><p>Captain or player, first-timer or returning cricketer—there is a place for you in the auction.</p><a href="https://docs.google.com/forms/d/e/1FAIpQLSfscoEpVUW_JKyYhTsL6wF00Ffk4X1wVTw4UW3ACflvXeicOA/viewform" target="_blank" rel="noreferrer">Register now ↗</a></div>
        </div>
        <div className="campaign-grid">
          {campaignPosters.map((poster, index) => (
            <a href={poster.src} target="_blank" className={`campaign-card campaign-${index + 1}`} key={poster.src} aria-label={`Open campaign poster ${index + 1}`}>
              <img src={poster.src} alt={poster.alt} loading="lazy" />
              <span>Campaign {String(index + 1).padStart(2, "0")} ↗</span>
            </a>
          ))}
        </div>
        <div className="reassurance-grid">
          <div><span>New to leather ball?</span><b>Beginners are welcome.</b></div>
          <div><span>Need cricket equipment?</span><b>Helmet, bat, pads and gloves are covered.</b></div>
          <div><span>Not picked in the auction?</span><b>100% registration refund.</b></div>
        </div>
        <p className="campaign-disclaimer">Campaign highlights · Complete eligibility, kit and refund conditions are governed by the official terms and conditions.</p>
      </section>

      <section className="format-section" id="format">
        <div className="section-heading">
          <p className="eyebrow dark">The competition</p>
          <h2>Built for big<br/>cricket energy.</h2>
          <p>A day-and-night tournament where every team gets at least three matches, including one under the lights. Season 5 lands at SRRC Cricket Ground across four November match days.</p>
        </div>
        <div className="format-grid">
          {format.map((item) => <div className="format-card" key={item.label}><strong>{item.value}</strong><span>{item.label}</span></div>)}
        </div>
        <p className="data-note">Official Season 5 highlights · See the linked terms and conditions for complete playing rules.</p>
      </section>

      <section className="fixtures-section" id="fixtures">
        <div className="section-bar">
          <div><p className="eyebrow">Season calendar</p><h2>Match days</h2></div>
          <p>SRRC Cricket Ground<br/><span>Four days · November 2026</span></p>
        </div>
        <div className="match-days">
          {matchDays.map((day, index) => (
            <article className="match-day" key={day}>
              <span>Day {index + 1}</span><strong>{day}</strong><b>November</b>
            </article>
          ))}
        </div>
        <div className="venue-row"><span>Match venue</span><b>SRRC Cricket Ground</b><a href="https://share.google/clJmAmYZH5Kvxpb4x" target="_blank" rel="noreferrer">Open location map ↗</a></div>
      </section>

      <section className="archive-section" id="archive">
        <div className="archive-heading">
          <div>
            <p className="eyebrow dark">From the scorebook</p>
            <h2>Three seasons.<br/>Three statements.</h2>
          </div>
          <p>Verified champions, finalists and memorable scorecards from the first three editions of the PHF cricket story.</p>
        </div>
        <div className="archive-grid">
          {archive.map((match) => (
            <article className="archive-card" key={match.season}>
              <div className="archive-top"><span>Season {match.season}</span><span>{match.dates} · {match.format}</span></div>
              <div className="archive-number">{match.season}</div>
              <p>{match.league}</p>
              <div className="honours"><span>Champions</span><strong>{match.champion}</strong><small>Final: {match.final} · Runners-up: {match.runnerUp}</small></div>
              <div className="featured-label">Featured scorecard</div>
              <div className="archive-teams"><strong>{match.home}</strong><i>vs</i><strong>{match.away}</strong></div>
              <div className="feature-result"><b>{match.feature}</b><span>{match.result}</span></div>
              <div className="standout"><span>Player of the match</span><b>{match.standout}</b></div>
              <div className="archive-actions"><a href={match.tournament} target="_blank" rel="noreferrer">All matches ↗</a><a href={match.href} target="_blank" rel="noreferrer">Scorecard ↗</a></div>
            </article>
          ))}
        </div>
        <p className="archive-source">Verified from public CricHeroes tournament pages and scorecards · Aggregate leaderboards remain CricHeroes PRO content.</p>
      </section>

      <section className="season-section" id="season">
        <div className="season-mark" aria-hidden="true">V</div>
        <div className="season-copy">
          <p className="eyebrow dark">Five years. One legacy.</p>
          <h2>This season<br/>belongs to you.</h2>
          <p>PHF Premier League returns for its fifth edition—a tournament shaped by competitive cricket, team spirit, and the moments players talk about long after the final ball.</p>
          <blockquote>“New squads. Old rivalries. One more shot at the trophy.”</blockquote>
        </div>
      </section>

      <section className="legacy-section" id="legacy">
        <div className="legacy-heading">
          <p className="eyebrow">The league in pictures</p>
          <h2>Played together.<br/><span>Remembered forever.</span></h2>
          <p>Twenty real moments. Teams, trophies, individual honours and friendships—the legacy Season 5 steps into.</p>
        </div>
        <div className="legacy-wall">
          {legacyPhotos.map((photo, index) => (
            <figure className={`legacy-photo ${photo.className}`} key={photo.src}>
              <a href={photo.src} target="_blank" aria-label={`Open legacy photograph ${index + 1}`}><img src={photo.src} alt={photo.alt} loading="lazy" /></a>
              <figcaption><span>{String(index + 1).padStart(2, "0")}</span>{photo.caption}</figcaption>
            </figure>
          ))}
        </div>
        <p className="legacy-note">Previous-season archive · Historic posters may contain expired dates and contact details.</p>
      </section>

      <section className="register-section" id="register">
        <div className="register-intro">
          <p className="eyebrow">Team entry</p>
          <h2>Ready your XI.</h2>
          <p>Start your official Season 5 entry now. Registrations close on 30 August.</p>
          <div className="entry-list"><span>01</span> Nominate your captain</div>
          <div className="entry-list"><span>02</span> Confirm your team name</div>
          <div className="entry-list"><span>03</span> Submit the player list when requested</div>
        </div>
        <div className="register-panel">
          <p className="deadline-label">Registration closes</p>
          <div className="deadline"><strong>30</strong><span>August</span></div>
          <a className="button primary" href="https://docs.google.com/forms/d/e/1FAIpQLSfscoEpVUW_JKyYhTsL6wF00Ffk4X1wVTw4UW3ACflvXeicOA/viewform" target="_blank" rel="noreferrer">Open registration form <span>↗</span></a>
          <a className="resource-link" href="https://docs.google.com/spreadsheets/d/1eAHfI2BuzCkMxljWtC9tXvmM71T9or022M6GlxW48MI/edit?usp=drivesdk" target="_blank" rel="noreferrer"><span>Read the official</span><b>Terms &amp; conditions ↗</b></a>
          <a className="resource-link" href="https://share.google/clJmAmYZH5Kvxpb4x" target="_blank" rel="noreferrer"><span>Find the venue</span><b>SRRC Cricket Ground ↗</b></a>
          <div className="contact-row"><span>Questions?</span><a href="tel:+919885301226">Tarun · +91 98853 01226</a><a href="tel:+918438149893">Karthik · +91 84381 49893</a></div>
        </div>
      </section>

      <footer>
        <a className="brand footer-brand" href="#top"><span className="brand-ball" aria-hidden="true"><i /></span><span><b>PHF</b><small>Premier League</small></span></a>
        <p>Season 5 · Built for the love of cricket.</p>
        <a href="#top">Back to top ↑</a>
      </footer>
    </main>
  );
}
