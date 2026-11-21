"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import SiteHeader from "./site-header";
import { galleryItems, type GalleryCategory } from "./gallery-items";

const categories = ["All moments", "Matchday", "Teams", "Awards"] as const;
type Filter = typeof categories[number];
const asset = (path: string) => `${typeof window !== "undefined" && window.location.pathname.startsWith("/phf-ppl/") ? "/phf-ppl/" : "/"}gallery/season5/${path}`;

export default function TournamentGalleryPage() {
  const [filter, setFilter] = useState<Filter>("All moments");
  const [activeId, setActiveId] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const visibleItems = useMemo(() => filter === "All moments" ? galleryItems : galleryItems.filter((item) => item.category === filter as GalleryCategory), [filter]);
  const activeIndex = visibleItems.findIndex((item) => item.id === activeId);
  const activeItem = activeIndex >= 0 ? visibleItems[activeIndex] : null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (activeItem && !dialog.open) { dialog.showModal(); closeRef.current?.focus(); }
    if (!activeItem && dialog.open) dialog.close();
  }, [activeItem]);

  useEffect(() => {
    if (!activeItem) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") setActiveId(visibleItems[(activeIndex + 1) % visibleItems.length].id);
      if (event.key === "ArrowLeft") setActiveId(visibleItems[(activeIndex - 1 + visibleItems.length) % visibleItems.length].id);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeItem, activeIndex, visibleItems]);

  const openItem = (id: string, event: MouseEvent<HTMLElement>) => { returnFocus.current = event.currentTarget; setActiveId(id); };
  const close = () => { setActiveId(null); window.setTimeout(() => returnFocus.current?.focus(), 0); };

  return <main className="tournament-gallery-page">
    <SiteHeader active="gallery" />
    <section className="tg-hero">
      <div className="tg-hero-copy"><span className="tg-kicker"><i/> PHF PREMIER LEAGUE · SEASON 5</span><h1>The season,<br/><em>in frames.</em></h1><p>Big plays, team bonds and the little moments that make matchday.</p><a href="#gallery-wall">Explore the gallery <b aria-hidden="true">↓</b></a></div>
      <div className="tg-hero-photo"><img src={asset("super-kings-team.jpg")} alt="PHF Super Kings squad together at sunset"/><span>PHF SUPER KINGS <i>·</i> ONE FOR THE ALBUM</span><div className="tg-hero-index">05 <small>SEASON</small></div></div>
      <div className="tg-hero-grain" aria-hidden="true"/>
    </section>
    <section className="tg-gallery" id="gallery-wall">
      <header className="tg-gallery-heading"><div><span className="tg-kicker">THE TOURNAMENT ALBUM</span><h2>Every moment<br/><em>has its place.</em></h2></div><p>From the first walk-in to the final presentation, relive Season 5 through the people who played it.</p></header>
      <div className="tg-toolbar"><div className="tg-filters" role="group" aria-label="Filter gallery by category">{categories.map((category) => <button key={category} type="button" aria-pressed={filter === category} className={filter === category ? "is-selected" : ""} onClick={() => setFilter(category)}>{category}</button>)}</div><span>{visibleItems.length} PHOTOS</span></div>
      <div className="tg-grid">{visibleItems.map((item, index) => <button type="button" className={`tg-card${index % 8 === 0 ? " tg-card-feature" : ""}`} key={item.id} onClick={(event) => openItem(item.id, event)} aria-label={`Open photo: ${item.title}`}>
        <span className="tg-card-image"><img src={asset(item.src)} alt={item.alt} loading={index < 3 ? "eager" : "lazy"}/><span className="tg-card-number">{String(galleryItems.findIndex((entry) => entry.id === item.id) + 1).padStart(2,"0")}</span></span>
        <span className="tg-card-meta"><span><i>{item.category}</i><strong>{item.title}</strong><small>{item.caption}</small></span><b aria-hidden="true">↗</b></span>
      </button>)}</div>
      <footer className="tg-footer-note"><span>PHF PREMIER LEAGUE <i>·</i> SEASON 5</span><p>More matchday memories are on the way.</p></footer>
    </section>
    <dialog className="tg-lightbox" ref={dialogRef} aria-label="Tournament gallery viewer" onClose={() => { if (activeId) close(); }} onClick={(event) => { if (event.target === dialogRef.current) close(); }}>
      {activeItem && <div className="tg-lightbox-inner"><button className="tg-close" ref={closeRef} onClick={close} aria-label="Close gallery viewer">×</button><button className="tg-prev" onClick={() => setActiveId(visibleItems[(activeIndex - 1 + visibleItems.length) % visibleItems.length].id)} aria-label="Previous photo">‹</button><div className="tg-lightbox-media"><img src={asset(activeItem.src)} alt={activeItem.alt}/></div><button className="tg-next" onClick={() => setActiveId(visibleItems[(activeIndex + 1) % visibleItems.length].id)} aria-label="Next photo">›</button><div className="tg-lightbox-caption"><span>{activeItem.category} <i>·</i> {String(galleryItems.findIndex((item) => item.id === activeItem.id) + 1).padStart(2,"0")} / {String(galleryItems.length).padStart(2,"0")}</span><strong>{activeItem.title}</strong><p>{activeItem.caption}</p></div></div>}
    </dialog>
  </main>;
}
