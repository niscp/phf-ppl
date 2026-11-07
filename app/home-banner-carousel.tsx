"use client";

import { useEffect, useState } from "react";

const banners = [
  {
    theme: "prizes",
    kicker: "Season 5 · Prizes announced",
    title: "The finish is worth ₹105,000.",
    body: "Team prize money, trophies, and individual honours. See what the season is playing for.",
    action: "See prizes & awards",
    href: "prizes.html",
    stat: "₹105K",
    statLabel: "total prizes this season",
    emblem: "★",
  },
  {
    theme: "fan-picks",
    kicker: "A challenge for PHF residents",
    title: "Make your call from home.",
    body: "Predict match winners, pick players, and climb the Most Engaged or Most Points leaderboard.",
    action: "Learn how Fan Picks works",
    href: "fan-guide.html",
    stat: "2",
    statLabel: "ways to climb the fan boards",
    emblem: "P",
  },
  {
    theme: "schedule",
    kicker: "The road to Finals Day",
    title: "Every match changes the table.",
    body: "Follow six teams across 15 league matches. Filter the schedule by team and find each matchup.",
    action: "Open the schedule",
    href: "fixtures.html",
    stat: "15",
    statLabel: "league matches · 6 teams",
    emblem: "S5",
  },
  {
    theme: "match-centre",
    kicker: "Before, during, after",
    title: "Get closer to every match.",
    body: "Open squads, player analysis, match details, results, and tournament numbers in one place.",
    action: "Visit the Match Centre",
    href: "match-centre.html",
    stat: "ONE",
    statLabel: "home for match stories & stats",
    emblem: "VS",
  },
  {
    theme: "partners",
    kicker: "Proud Season 5 partners",
    title: "A great season takes a team.",
    body: "Meet GetMeCab, Viseshta Avenues, and MONIN—the partners supporting PHF Premier League Season 5.",
    action: "Meet our partners",
    href: "prizes.html#partners",
    stat: "3",
    statLabel: "partners · one PHF community",
    emblem: "PHF",
  },
];

function localPage(path: string) {
  const base = typeof window !== "undefined" && window.location.pathname.startsWith("/phf-ppl/") ? "/phf-ppl/" : "/";
  return `${base}${path}`;
}

export default function HomeBannerCarousel() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) setPlaying(false);
    const update = () => { if (media.matches) setPlaying(false); };
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % banners.length), 6500);
    return () => window.clearInterval(timer);
  }, [playing]);

  const select = (index: number) => setActive((index + banners.length) % banners.length);
  const banner = banners[active];

  return <section className="home-banner-carousel" aria-label="Season announcements" aria-roledescription="carousel">
    <div key={banner.theme} className={`home-banner-slide theme-${banner.theme}`} aria-roledescription="slide" aria-label={`${active + 1} of ${banners.length}`}>
      <div className="home-banner-copy">
        <p className="home-banner-kicker"><span/>{banner.kicker}</p>
        <h2>{banner.title}</h2>
        <p className="home-banner-body">{banner.body}</p>
        <a className="home-banner-link" href={localPage(banner.href)}>{banner.action}<b aria-hidden="true">↗</b></a>
      </div>
      <div className="home-banner-art" aria-hidden="true">
        <span className="home-banner-orbit orbit-one"/><span className="home-banner-orbit orbit-two"/>
        <span className="home-banner-emblem">{banner.emblem}</span>
        <strong>{banner.stat}</strong>
        <small>{banner.statLabel}</small>
      </div>
      <div className="home-banner-controls">
        <span className="home-banner-position">0{active + 1}<i/>0{banners.length}</span>
        <div className="home-banner-dots" aria-label="Choose announcement">{banners.map((item, index) => <button key={item.theme} type="button" aria-label={`Show banner ${index + 1}: ${item.kicker}`} aria-pressed={active === index} className={active === index ? "active" : ""} onClick={() => select(index)}/>)}</div>
        <button className="home-banner-play" type="button" onClick={() => setPlaying((value) => !value)} aria-label={playing ? "Pause rotating banners" : "Resume rotating banners"}>{playing ? "Ⅱ" : "▶"}</button>
        <button className="home-banner-arrow" type="button" aria-label="Previous banner" onClick={() => select(active - 1)}>‹</button>
        <button className="home-banner-arrow" type="button" aria-label="Next banner" onClick={() => select(active + 1)}>›</button>
      </div>
    </div>
    <span className="home-banner-announcer" aria-live="off" aria-atomic="true">{banner.kicker}</span>
  </section>;
}
