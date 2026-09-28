"use client";

import { useEffect, useMemo, useState } from "react";
import { getAuctionSnapshot, type AuctionPlayer, type AuctionSnapshot, type AuctionTeam } from "./auction-client";
import { buildAuctionHighlights, type HighlightTeam } from "./auction-highlights";
import { officialSeasonFiveAuctionId } from "./season5-auction";

function asset(path: string | null) {
  if (!path) return "";
  const base = typeof window !== "undefined" && window.location.pathname.startsWith("/phf-ppl/") ? "/phf-ppl" : "";
  return path.startsWith("/") ? `${base}${path}` : path;
}

function localLink(path: string) {
  return typeof window !== "undefined" && window.location.pathname.startsWith("/phf-ppl/") ? `/phf-ppl/${path}` : `/${path}`;
}

function cr(value: number | null | undefined) {
  return `${Number(value ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })} CR`;
}

function TeamMark({ team }: { team: AuctionTeam }) {
  const logo = team.logo_url ? asset(team.logo_url) : "";
  const initials = team.name.split(/\s+/).map((word) => word[0]).slice(0, 2).join("");
  return <span className="highlights-team-mark">{logo ? <img src={logo} alt={`${team.name} logo`} /> : <b>{initials}</b>}</span>;
}

function PlayerPortrait({ player, eager = false }: { player: AuctionPlayer; eager?: boolean }) {
  return player.photo
    ? <img src={asset(player.photo)} alt={player.name} loading={eager ? "eager" : "lazy"} />
    : <span className="highlights-player-fallback" aria-label={`Photo unavailable for ${player.name}`}>{player.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("")}</span>;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    if (!src) { resolve(null); return; }
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function wrappedText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && current) { lines.push(current); current = word; }
    else current = candidate;
  });
  if (current) lines.push(current);
  lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
  return y + lines.length * lineHeight;
}

async function downloadCard(options: { fileName: string; label: string; title: string; figure: string; details: string[]; logo?: string }) {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1080; canvas.height = 1350;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = "#07131b"; context.fillRect(0, 0, canvas.width, canvas.height);
  const wash = context.createRadialGradient(900, 150, 20, 900, 150, 650);
  wash.addColorStop(0, "rgba(38,112,145,.58)"); wash.addColorStop(1, "rgba(7,19,27,0)");
  context.fillStyle = wash; context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#efbd58"; context.lineWidth = 4; context.strokeRect(52, 52, 976, 1246);
  context.fillStyle = "#efbd58"; context.font = "700 34px Hind, sans-serif"; context.fillText("PHF PREMIER LEAGUE · SEASON 5", 92, 126);
  const logo = await loadImage(options.logo ?? "");
  if (logo) { context.save(); context.beginPath(); context.arc(900, 166, 78, 0, Math.PI * 2); context.clip(); context.drawImage(logo, 822, 88, 156, 156); context.restore(); }
  context.fillStyle = "#aebcc3"; context.font = "600 28px Hind, sans-serif"; context.fillText(options.label, 92, 292);
  context.fillStyle = "#f7f1e5"; context.font = "600 110px Teko, sans-serif";
  let cursor = wrappedText(context, options.title.toUpperCase(), 92, 405, 850, 92);
  context.fillStyle = "#efbd58"; context.font = "600 156px Teko, sans-serif"; context.fillText(options.figure, 92, cursor + 120);
  cursor += 225;
  context.strokeStyle = "rgba(239,189,88,.55)"; context.lineWidth = 2; context.beginPath(); context.moveTo(92, cursor); context.lineTo(988, cursor); context.stroke();
  context.fillStyle = "#f7f1e5"; context.font = "600 34px Hind, sans-serif";
  options.details.forEach((detail, index) => context.fillText(detail, 92, cursor + 78 + index * 62));
  context.fillStyle = "#92a4ac"; context.font = "500 25px Hind, sans-serif"; context.fillText("phfppl.dwemory.com/highlights.html", 92, 1242);
  const link = document.createElement("a");
  link.download = options.fileName;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function TeamLedger({ team }: { team: HighlightTeam }) {
  const anchor = team.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return <article className="highlights-team-ledger" id={anchor}>
    <div className="highlights-team-heading"><TeamMark team={team} /><div><span>Final squad · {team.squad.length} players</span><h3>{team.name}</h3><p>Captain: {team.captain?.name ?? "—"}</p></div><button type="button" onClick={() => void downloadCard({ fileName: `${anchor}-season-5-squad.png`, label: "FINAL SQUAD", title: team.name, figure: cr(team.calculatedSpent), details: [`${team.squad.length} players`, `Top buy · ${team.topPurchase?.name ?? "—"} · ${cr(team.topPurchase?.sold_price)}`, `Captain · ${team.captain?.name ?? "—"}`], logo: team.logo_url ? asset(team.logo_url) : "" })}>Download team card</button></div>
    <div className="highlights-team-balance"><div><span>Spent</span><b>{cr(team.calculatedSpent)}</b></div><div><span>Top buy</span><b>{team.topPurchase?.name ?? "—"}</b><small>{cr(team.topPurchase?.sold_price)}</small></div></div>
    <div className="highlights-role-chips">{team.roles.map((role) => <span key={role.label}>{role.count} {role.label}</span>)}</div>
    <ol className="highlights-squad-list">{team.squad.map((player) => <li key={player.id} className={player.status === "captain" ? "captain" : ""}><span>{player.status === "captain" ? "C" : String(team.squad.indexOf(player) + 1).padStart(2, "0")}</span><strong>{player.name}</strong><small>{player.role}</small><b>{player.status === "captain" ? "Captain" : cr(player.sold_price)}</b></li>)}</ol>
  </article>;
}

export default function HighlightsPage() {
  const [snapshot, setSnapshot] = useState<AuctionSnapshot | null>(null);
  const [error, setError] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  useEffect(() => {
    let active = true;
    const auctionId = new URLSearchParams(window.location.search).get("auction") || officialSeasonFiveAuctionId;
    getAuctionSnapshot(auctionId).then((next) => { if (active) setSnapshot(next); }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Highlights could not be loaded"); });
    return () => { active = false; };
  }, []);
  const highlights = useMemo(() => snapshot ? buildAuctionHighlights(snapshot) : null, [snapshot]);
  const highest = highlights?.highestSale ?? null;

  async function sharePage() {
    const data = { title: "PHF Premier League Season 5 Auction Highlights", text: "See the biggest buys and all six final squads.", url: window.location.href };
    if (navigator.share) await navigator.share(data);
    else { await navigator.clipboard.writeText(window.location.href); setShareStatus("Highlights link copied"); window.setTimeout(() => setShareStatus(""), 2500); }
  }

  if (error) return <main className="highlights-state"><h1>Highlights unavailable</h1><p>{error}</p><a href={localLink("auction.html")}>Open auction board</a></main>;
  if (!snapshot || !highlights) return <main className="highlights-state"><span className="highlights-loader"/><h1>Preparing the auction ledger</h1><p>Loading every sale and final squad…</p></main>;

  return <main className="highlights-page">
    <header className="highlights-header"><a href={localLink("")} className="highlights-brand"><b>PHF</b><span>Premier League</span></a><nav><a href="#top-buys">Top buys</a><a href="#squads">Squads</a><a href={localLink(`teams.html?auction=${snapshot.auction?.id ?? officialSeasonFiveAuctionId}`)}>Team view</a><button type="button" onClick={() => void sharePage()}>Share highlights</button></nav></header>
    {shareStatus && <p className="highlights-toast" role="status">{shareStatus}</p>}
    <section className="highlights-hero" aria-labelledby="highlights-title">
      <div className="highlights-hero-copy"><p>Season 5 official auction · Final ledger</p><h1 id="highlights-title">The hammer<br/>has fallen.</h1><div className="highlights-final-stamp"><span>{highlights.complete ? "Auction complete" : "Provisional results"}</span><b>{snapshot.auction?.name ?? "Season 5 Official Auction"}</b></div></div>
      {highest && <article className="highlights-marquee"><div className="highlights-marquee-photo"><PlayerPortrait player={highest} eager /></div><div className="highlights-marquee-copy"><span>Highest bid of the auction</span><h2>{highest.name}</h2><strong>{cr(highest.sold_price)}</strong><div><TeamMark team={highest.team} /><p>{highest.team.name}<small>{highest.role}</small></p></div><button type="button" onClick={() => void downloadCard({ fileName: "phf-season-5-highest-bid.png", label: "HIGHEST BID OF THE AUCTION", title: highest.name, figure: cr(highest.sold_price), details: [`Sold to ${highest.team.name}`, highest.role, `${highlights.soldCount} players sold across six teams`], logo: highest.team.logo_url ? asset(highest.team.logo_url) : "" })}>Download highest-bid card</button></div></article>}
    </section>
    <section className="highlights-scoreline" aria-label="Auction totals"><div><b>{highlights.soldCount}</b><span>Players sold</span></div><div><b>{cr(highlights.totalSpend)}</b><span>Total spend</span></div><div><b>{cr(highlights.averageSale)}</b><span>Average sale</span></div><div><b>{highlights.squadCount}</b><span>Players in squads</span></div></section>
    <section className="highlights-top-buys" id="top-buys"><div className="highlights-section-title"><span>01</span><div><p>The bidding table</p><h2>Ten biggest buys.</h2></div></div><ol>{highlights.purchases.slice(0, 10).map((player, index) => <li key={player.id}><span>{String(index + 1).padStart(2, "0")}</span><div className="highlights-buy-photo"><PlayerPortrait player={player} /></div><div><strong>{player.name}</strong><small>{player.role} · {player.team.name}</small></div><b>{cr(player.sold_price)}</b></li>)}</ol></section>
    <section className="highlights-spend-table"><div><p>Franchise ledger</p><h2>How every purse moved.</h2></div><ol>{highlights.teams.map((team, index) => <li key={team.id}><span>{index + 1}</span><TeamMark team={team}/><strong>{team.name}</strong><div><i style={{ width: `${(team.calculatedSpent / Math.max(...highlights.teams.map((item) => item.calculatedSpent), 1)) * 100}%` }}/></div><b>{cr(team.calculatedSpent)}</b></li>)}</ol></section>
    <section className="highlights-role-board"><div className="highlights-role-copy"><p>Final player mix</p><h2>Every role,<br/>accounted for.</h2><span>The six completed squads, including playing captains.</span></div><div className="highlights-role-bars">{highlights.roles.map((role) => <div key={role.label}><span>{role.label}</span><i><b style={{ width: `${(role.count / highlights.squadCount) * 100}%` }}/></i><strong>{role.count}</strong></div>)}</div></section>
    <section className="highlights-squads" id="squads"><div className="highlights-section-title"><span>02</span><div><p>The final six</p><h2>Complete squads.</h2></div><a href={localLink(`teams.html?auction=${snapshot.auction?.id ?? officialSeasonFiveAuctionId}`)}>Open interactive team view</a></div><div className="highlights-squad-ledgers">{highlights.teams.map((team) => <TeamLedger team={team} key={team.id}/>)}</div></section>
    <footer className="highlights-footer"><a href={localLink("")}>PHF Premier League</a><span>Season 5 · Official auction results</span><button type="button" onClick={() => window.print()}>Print results</button></footer>
  </main>;
}
