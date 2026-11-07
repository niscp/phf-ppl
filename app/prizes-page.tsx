import SiteHeader from "./site-header";
import "./prizes-page.css";

const base = import.meta.env.BASE_URL;

const awards = [
  { name: "Man of the Match", mark: "MOM", prize: "Customized PHF cap, Monin gift, and Zomoz coupons." },
  { name: "Man of the Series", mark: "SERIES", prize: "PHF kitbag, Monin gift hamper, GetMeCab coupons, Zomoz coupons, and a trophy." },
  { name: "Purple Cap · Best Bowler", mark: "BOWLER", prize: "Shoes, customized Purple Cap, Monin gift hamper, GetMeCab coupons, and Zomoz coupons." },
  { name: "Orange Cap · Best Batter", mark: "BATTER", prize: "Batting gloves, customized Orange Cap, Monin gift hamper, GetMeCab coupons, and Zomoz coupons." },
];

export default function PrizesPage() {
  return <>
    <SiteHeader active="prizes" />
    <main className="phf-prizes-page">
      <section className="prizes-hero">
        <div className="prizes-hero-lights" aria-hidden="true" />
        <div className="prizes-hero-copy">
          <p className="prizes-eyebrow">PHF Premier League · Season 5</p>
          <h1>Every run<br/>has a <em>reward.</em></h1>
          <p className="prizes-lede">The season ends with silverware, individual honours, and <strong>₹85,000 in team prize money.</strong></p>
          <a className="prizes-hero-cta" href={`${base}fixtures.html`}>See the season schedule <span aria-hidden="true">↗</span></a>
        </div>
        <div className="prizes-hero-cup" aria-hidden="true"><div className="cup-handles"/><div className="cup-bowl"><span>PHF</span><i>★</i></div><div className="cup-stem"/><div className="cup-base"/></div>
        <div className="prizes-total"><span>Team cash prize pool</span><strong>₹85,000</strong><small>Plus trophies for the top three teams</small></div>
      </section>

      <section className="team-prizes" aria-labelledby="team-prizes-title">
        <header className="prizes-section-heading"><div><p className="prizes-eyebrow">The team finish</p><h2 id="team-prizes-title">Three places.<br/><em>One big finish.</em></h2></div><p>Every league match brings teams closer to Finals Day—and a share of the prize pool.</p></header>
        <div className="team-prize-grid">
          <article className="team-prize-card champion"><span className="prize-place">CHAMPIONS</span><div className="medal medallion-gold" aria-hidden="true">1</div><strong>₹45,000</strong><span className="prize-extra">+ Winners’ trophy</span><i className="prize-rule"/></article>
          <article className="team-prize-card runner"><span className="prize-place">RUNNER-UP</span><div className="medal medallion-silver" aria-hidden="true">2</div><strong>₹25,000</strong><span className="prize-extra">+ Runners-up trophy</span><i className="prize-rule"/></article>
          <article className="team-prize-card third"><span className="prize-place">SECOND RUNNER-UP</span><div className="medal medallion-copper" aria-hidden="true">3</div><strong>₹15,000</strong><span className="prize-extra">+ Trophy</span><i className="prize-rule"/></article>
        </div>
      </section>

      <section className="individual-prizes" aria-labelledby="individual-prizes-title">
        <header className="prizes-section-heading"><div><p className="prizes-eyebrow">Big moments deserve their own spotlight</p><h2 id="individual-prizes-title">Individual honours.</h2></div><p>Recognising the players who change a match, lead the season, and make the tournament memorable.</p></header>
        <div className="individual-award-grid">{awards.map((award) => <article className="individual-award" key={award.name}><span className="award-mark">{award.mark}</span><div><h3>{award.name}</h3><p>{award.prize}</p></div></article>)}</div>
      </section>

      <section className="poster-feature" aria-labelledby="poster-feature-title">
        <div className="poster-feature-copy"><p className="prizes-eyebrow">The announcement, all in one place</p><h2 id="poster-feature-title">Save it. Share it.<br/>Bring the whole society in.</h2><p>Open the original Season 5 prize poster to see every prize and partner in the announcement.</p><a href={`${base}phf-season-5-prize-announcement.jpg`} target="_blank" rel="noreferrer">Open full-size poster <span aria-hidden="true">↗</span></a></div>
        <a className="poster-preview" href={`${base}phf-season-5-prize-announcement.jpg`} target="_blank" rel="noreferrer" aria-label="Open the full-size PHF Premier League Season 5 prize announcement poster"><img src={`${base}phf-season-5-prize-announcement.jpg`} alt="PHF Premier League Season 5 prize announcement: ₹45,000 for the winner, ₹25,000 for runner-up, ₹15,000 for second runner-up, plus individual player awards." loading="lazy"/></a>
      </section>

      <section className="fan-prizes-note"><span className="fan-prizes-icon" aria-hidden="true">F</span><div><p className="prizes-eyebrow">A separate race for residents</p><h2>Fan Picks has its own prizes.</h2><p>The cash awards above are for the cricket tournament. The Fan Picks leaderboard is a separate resident challenge, with surprise awards for the top three fans.</p></div><a href={`${base}fan-guide.html`}>How Fan Picks works <span aria-hidden="true">↗</span></a></section>
    </main>
  </>;
}
