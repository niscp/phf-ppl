"use client";

import { useRef, useState } from "react";

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
];

const legacyPhotos = Array.from({ length: 30 }, (_, index) => ({
  src: `/legacy-${index + 1}.jpg`,
  alt: `PHF Premier League legacy moment ${index + 1}`,
  className: index % 9 === 0 ? "cinema-wide" : index % 5 === 0 ? "cinema-tall" : "",
}));

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const trailerRef = useRef<HTMLVideoElement>(null);

  return (
    <main>
      <header className="cinema-header">
        <a className="phf-mark" href="#top" aria-label="PHF Premier League home"><b>PHF</b><span>Premier League</span></a>
        <button className="cinema-menu" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label="Toggle navigation"><i/><i/></button>
        <nav className={menuOpen ? "cinema-nav open" : "cinema-nav"} aria-label="Main navigation">
          <a href="#trailer" onClick={() => setMenuOpen(false)}>Trailer</a>
          <a href="#dates" onClick={() => setMenuOpen(false)}>Match days</a>
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
            <a className="play-link" href="#trailer"><i>▶</i> Watch trailer</a>
          </div>
        </div>
        <div className="hero-fixture">
          <span>Match days</span><b>21 · 22 · 28 · 29</b><small>November 2026 · SRRC Cricket Ground</small>
        </div>
        <div className="hero-edition"><span>Edition</span><b>05</b></div>
      </section>

      <div className="broadcast-strip"><div>THE LEAGUE RETURNS <i>◆</i> DAY &amp; NIGHT CRICKET <i>◆</i> 5 YEAR LEGACY <i>◆</i> AUCTION BASED <i>◆</i> THE LEAGUE RETURNS <i>◆</i> DAY &amp; NIGHT CRICKET <i>◆</i></div></div>

      <section className="trailer-stage" id="trailer">
        <div className="section-intro centered"><p>Official Season 5 trailer</p><h2>Feel the<br/><em>league.</em></h2></div>
        <div className="video-shell">
          <span className="video-code">PHFPL / S05 / OFFICIAL TRAILER</span>
          <video ref={trailerRef} controls playsInline preload="metadata" poster="/campaign-8.jpg" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} aria-label="PHF Premier League Season 5 official trailer">
            <source src="/phf-season-5-trailer.mp4" type="video/mp4" />
          </video>
          {!playing && <button className="hero-play" type="button" onClick={() => trailerRef.current?.play()} aria-label="Play Season 5 trailer"><span>▶</span><b>Play trailer</b></button>}
        </div>
      </section>

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
