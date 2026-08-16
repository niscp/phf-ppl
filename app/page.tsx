"use client";

import { FormEvent, useState } from "react";

const fixtures = [
  { time: "09:00", home: "Defending Champions", away: "New Challengers", tag: "Opening match" },
  { time: "13:00", home: "Home XI", away: "Visitors XI", tag: "League match" },
  { time: "17:00", home: "City Strikers", away: "Boundary Kings", tag: "Evening match" },
];

const format = [
  { value: "8", label: "Teams" },
  { value: "15", label: "Overs" },
  { value: "4", label: "Weekends" },
  { value: "1", label: "Champion" },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  function createRegistrationEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const team = String(data.get("team") || "");
    const captain = String(data.get("captain") || "");
    const phone = String(data.get("phone") || "");
    const body = `Hi PHF Premier League team,\n\nI would like to register interest for Season 5.\n\nTeam: ${team}\nCaptain: ${captain}\nPhone: ${phone}\n\nPlease share the next steps.`;
    window.location.href = `mailto:?subject=${encodeURIComponent("PHF Premier League Season 5 registration")}&body=${encodeURIComponent(body)}`;
  }

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
          <a href="#season" onClick={() => setMenuOpen(false)}>Season 5</a>
          <a className="nav-cta" href="#register" onClick={() => setMenuOpen(false)}>Register a team</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="pitch-lines" aria-hidden="true"><span /><span /><span /></div>
        <div className="hero-copy">
          <p className="eyebrow"><span>PHF Premier League</span> Registrations opening</p>
          <h1><span>Season</span><strong>V</strong></h1>
          <p className="hero-lede">Five seasons in. The rivalry is real. Gather your squad and step into the biggest chapter of PHF cricket yet.</p>
          <div className="hero-actions">
            <a className="button primary" href="#register">Enter Season 5 <span>↗</span></a>
            <a className="text-link" href="#fixtures">See opening day <span>↓</span></a>
          </div>
        </div>
        <div className="scoreboard" aria-label="Season five announcement">
          <div className="scoreboard-top"><span>New season</span><span>PHFPL / 05</span></div>
          <div className="scoreboard-main">
            <span className="innings">Innings</span>
            <strong>05</strong>
            <div className="score-meta"><span>Teams<br/><b>08</b></span><span>Overs<br/><b>15</b></span></div>
          </div>
          <div className="scoreboard-bottom"><span>Play bold.</span><span>Make history.</span></div>
        </div>
        <div className="scroll-note">Scroll for the season brief</div>
      </section>

      <section className="ticker" aria-label="League highlights">
        <div>Season five <i>◆</i> Team registrations <i>◆</i> Weekend cricket <i>◆</i> One trophy <i>◆</i> Season five <i>◆</i> Team registrations</div>
      </section>

      <section className="format-section" id="format">
        <div className="section-heading">
          <p className="eyebrow dark">The competition</p>
          <h2>Built for big<br/>cricket energy.</h2>
          <p>A fast, focused tournament where every over matters. Final dates, venue, and playing conditions will be confirmed with registered captains.</p>
        </div>
        <div className="format-grid">
          {format.map((item) => <div className="format-card" key={item.label}><strong>{item.value}</strong><span>{item.label}</span></div>)}
        </div>
        <p className="data-note">Proposed Season 5 format — subject to final team entries.</p>
      </section>

      <section className="fixtures-section" id="fixtures">
        <div className="section-bar">
          <div><p className="eyebrow">Match centre</p><h2>Opening day</h2></div>
          <p>Fixture preview<br/><span>Date & venue to be announced</span></p>
        </div>
        <div className="fixture-list">
          {fixtures.map((match, index) => (
            <article className="fixture" key={match.time}>
              <div className="fixture-no">0{index + 1}</div>
              <time>{match.time}<small>IST</small></time>
              <div className="teams"><span>{match.home}</span><b>vs</b><span>{match.away}</span></div>
              <span className="match-tag">{match.tag}</span>
            </article>
          ))}
        </div>
        <p className="data-note light">Preview names only — official teams and fixtures will replace these after registration.</p>
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
          <p>Start your Season 5 entry now. This creates a pre-filled email you can send to your PHF league organiser.</p>
          <div className="entry-list"><span>01</span> Nominate your captain</div>
          <div className="entry-list"><span>02</span> Confirm your team name</div>
          <div className="entry-list"><span>03</span> Submit the player list when requested</div>
        </div>
        <form className="register-form" onSubmit={createRegistrationEmail}>
          <label>Team name<input name="team" required placeholder="e.g. PHF Strikers" /></label>
          <label>Captain&apos;s name<input name="captain" required placeholder="Full name" /></label>
          <label>Contact number<input name="phone" required type="tel" placeholder="Your phone number" /></label>
          <button className="button primary" type="submit">Create registration email <span>↗</span></button>
          <small>Your details stay on your device until you send the email.</small>
        </form>
      </section>

      <footer>
        <a className="brand footer-brand" href="#top"><span className="brand-ball" aria-hidden="true"><i /></span><span><b>PHF</b><small>Premier League</small></span></a>
        <p>Season 5 · Built for the love of cricket.</p>
        <a href="#top">Back to top ↑</a>
      </footer>
    </main>
  );
}
