"use client";

import { useState } from "react";

const matchDays = ["21", "22", "28", "29"];

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
    home: "PHF Dabang",
    away: "Titans",
    standout: "Sharad Sharma",
    href: "https://cricheroes.in/scorecard/13396124/prestige-premier-league---season-3/phf-dabang-vs-titans",
  },
  {
    season: "02",
    league: "Prestige Cricket League (PHF)",
    home: "PHF Spartans",
    away: "PHF OG",
    standout: "Naman Saxena",
    href: "https://cricheroes.in/scorecard/8357024/prestige-cricket-league(phf)-season-2/phf-spartans-vs-phf-og",
  },
  {
    season: "01",
    league: "Prestige Cricket League (PHF)",
    home: "PHF Strikers",
    away: "Prestige Super Kings",
    standout: "Nishank Singh",
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
          <a href="#season" onClick={() => setMenuOpen(false)}>Season 5</a>
          <a className="nav-cta" href="#register" onClick={() => setMenuOpen(false)}>Register a team</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="pitch-lines" aria-hidden="true"><span /><span /><span /></div>
        <div className="hero-copy">
          <p className="eyebrow"><span>PHF Premier League</span> 21 · 22 · 28 · 29 November</p>
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
          <div className="scoreboard-bottom"><span>21—29 November</span><span>SRRC Cricket Ground</span></div>
        </div>
        <div className="scroll-note">Scroll for the season brief</div>
      </section>

      <section className="ticker" aria-label="League highlights">
        <div>Season five <i>◆</i> Day &amp; night cricket <i>◆</i> Under the lights <i>◆</i> Bigger games <i>◆</i> Brighter nights <i>◆</i> Real cricket</div>
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
          <p>SRRC Cricket Ground<br/><span>Four days · November</span></p>
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
          <p>Featured matches from the PHF cricket story, preserved through their original CricHeroes scorecards.</p>
        </div>
        <div className="archive-grid">
          {archive.map((match) => (
            <a className="archive-card" href={match.href} target="_blank" rel="noreferrer" key={match.season} aria-label={`Open Season ${Number(match.season)} scorecard on CricHeroes`}>
              <div className="archive-top"><span>Season {match.season}</span><span>Open scorecard ↗</span></div>
              <div className="archive-number">{match.season}</div>
              <p>{match.league}</p>
              <div className="archive-teams"><strong>{match.home}</strong><i>vs</i><strong>{match.away}</strong></div>
              <div className="standout"><span>Standout performance</span><b>{match.standout}</b></div>
            </a>
          ))}
        </div>
        <p className="archive-source">Match references supplied from CricHeroes · Scores and results remain on the linked scorecards.</p>
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
