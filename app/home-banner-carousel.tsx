"use client";

import { useEffect, useState } from "react";

const banners = [
  { theme: "getmecab", kicker: "Start-up sponsor · Mobility partner", title: "GetMeCab makes every journey simpler.", body: "One-way trips, round trips, airport transfers and family getaways across multiple cities.", action: "Explore GetMeCab", href: "https://www.getmecab.com/?utm_source=phf&utm_medium=sponsorship&utm_campaign=phf_ppl_s5", image: "partner-getmecab.jpg", emblem: "G" },
  { theme: "viseshta", kicker: "Associate sponsor", title: "Discover Palm Valley.", body: "An agricultural land project by Viseshta Avenues, bringing together oil palm, agarwood intercropping and resort-style amenities.", action: "Meet Viseshta Avenues", href: "sponsors.html#viseshta", image: "partner-viseshta.jpg", emblem: "V" },
  { theme: "monin", kicker: "Beverage partner", title: "A little more flavour for the season.", body: "MONIN, the French flavourful syrup brand, joins PHF Premier League Season 5 as our Beverage Partner.", action: "Meet MONIN", href: "sponsors.html#monin", image: "partner-monin.jpg", emblem: "M" },
  { theme: "kotak", kicker: "Banking partner · Financial District Branch", title: "Banking solutions, close to home.", body: "Welcome Kotak Mahindra Bank as the Season 5 Banking Partner for the PHF community.", action: "Meet Kotak Mahindra Bank", href: "sponsors.html#kotak", image: "partner-kotak.jpg", emblem: "K" },
  { theme: "arthah", kicker: "Community announcement · Kollur, Hyderabad", title: "A brighter tomorrow starts here.", body: "Admissions open for 2027–28 at The Arthah School. Ask about early-bird admission privileges.", action: "Explore The Arthah School", href: "https://thearthahschool.com", image: "partner-arthah-school-admissions.jpg", emblem: "A" },
  { theme: "prizes", kicker: "Season 5 · Prizes announced", title: "Play for the pride.", body: "₹105,000 in announced prizes, trophies, and individual honours. See what awaits this season’s top teams and standout players.", action: "See prizes & awards", href: "prizes.html", image: "phf-season-5-prize-announcement.jpg", emblem: "★" },
];

function localPage(path: string) {
  if (/^https?:\/\//.test(path)) return path;
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

  return <section className="home-banner-carousel" aria-label="Season partners and announcements" aria-roledescription="carousel">
    <div key={banner.theme} className={`home-banner-slide theme-${banner.theme}`} aria-roledescription="slide" aria-label={`${active + 1} of ${banners.length}`}>
      <div className="home-banner-copy">
        <p className="home-banner-kicker"><span/>{banner.kicker}</p>
        <h2>{banner.title}</h2>
        <p className="home-banner-body">{banner.body}</p>
        <a className="home-banner-link" href={localPage(banner.href)} target={banner.href.startsWith("https://") ? "_blank" : undefined} rel={banner.href.startsWith("https://") ? "noreferrer" : undefined}>{banner.action}<b aria-hidden="true">↗</b></a>
      </div>
      <div className="home-banner-art" aria-hidden="true">
        <span className="home-banner-orbit orbit-one"/><span className="home-banner-orbit orbit-two"/>
        <img className={`home-banner-image${banner.theme === "arthah" || banner.theme === "prizes" ? " portrait" : ""}`} src={localPage(banner.image)} alt="" />
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
