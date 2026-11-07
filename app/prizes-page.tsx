import SiteHeader from "./site-header";
import "./prizes-page.css";

const base = import.meta.env.BASE_URL;

const awards = [
  { name: "Player of the Match", tag: "MATCH DAY", prize: "A customized PHF cap, Monin gift, and Zomoz coupons." },
  { name: "Player of the Series", tag: "THE SEASON", prize: "PHF kitbag, Monin gift hamper, GetMeCab and Zomoz coupons, plus a trophy." },
  { name: "Purple Cap · Best Bowler", tag: "BOWLING", prize: "Shoes, customized Purple Cap, Monin gift hamper, GetMeCab and Zomoz coupons." },
  { name: "Orange Cap · Best Batter", tag: "BATTING", prize: "Batting gloves, customized Orange Cap, Monin gift hamper, GetMeCab and Zomoz coupons." },
];

export default function PrizesPage() {
  return <>
    <SiteHeader active="prizes" />
    <main className="phf-prizes-page">
      <section className="prizes-stage" aria-labelledby="prizes-title">
        <div className="stadium-glow" aria-hidden="true" />
        <div className="prizes-stage-copy">
          <p className="season-mark"><span>PHF</span> Premier League <i /> Season 5</p>
          <h1 id="prizes-title">Play for<br /><em>the prize.</em></h1>
          <p className="stage-deck">A season of big moments, silverware and rewards for the players who make it count.</p>
          <div className="grand-prize"><span>Total prizes announced</span><strong>₹105,000</strong><small>Team cash awards + trophies + individual honours</small></div>
          <a className="stage-link" href={`${base}fixtures.html`}>Follow the road to the final <span aria-hidden="true">↗</span></a>
        </div>
        <a className="stage-poster" href={`${base}phf-season-5-prize-announcement.jpg`} target="_blank" rel="noreferrer" aria-label="Open the full-size Season 5 prize poster">
          <img src={`${base}phf-season-5-prize-announcement.jpg`} alt="PHF Premier League Season 5 prize announcement poster showing the ₹45,000 winner prize, ₹25,000 runner-up prize, ₹15,000 second runner-up prize, and player awards." />
          <span>THE SEASON 5 PRIZE BOARD</span>
        </a>
        <div className="stage-bottomline"><span>Six teams</span><i /><span>One champion</span><i /><span>₹105K in prizes</span></div>
      </section>

      <section className="podium-section" aria-labelledby="podium-title">
        <div className="prize-section-intro">
          <div><span className="section-index">01 / THE FINISH</span><h2 id="podium-title">Three places.<br /><em>One final climb.</em></h2></div>
          <p>The cash prizes go to the top three teams. Every place comes with a trophy—and the title belongs to the team that finishes first.</p>
        </div>
        <div className="podium">
          <article className="podium-card podium-winner">
            <div className="podium-rank"><span>01</span><i>CHAMPIONS</i></div>
            <div className="podium-cup" aria-hidden="true">✦</div>
            <strong>₹45,000</strong>
            <p>Winner + championship trophy</p>
            <span className="podium-step">THE TITLE</span>
          </article>
          <article className="podium-card podium-runner">
            <div className="podium-rank"><span>02</span><i>RUNNER-UP</i></div>
            <strong>₹25,000</strong>
            <p>Runner-up + trophy</p>
            <span className="podium-step">SECOND PLACE</span>
          </article>
          <article className="podium-card podium-third">
            <div className="podium-rank"><span>03</span><i>SECOND RUNNER-UP</i></div>
            <strong>₹15,000</strong>
            <p>Second runner-up + trophy</p>
            <span className="podium-step">THIRD PLACE</span>
          </article>
        </div>
        <p className="payout-note"><span aria-hidden="true">↳</span> ₹85,000 in team cash prizes. The total announcement also includes trophies and individual awards.</p>
      </section>

      <section className="awards-section" aria-labelledby="awards-title">
        <div className="prize-section-intro awards-intro">
          <div><span className="section-index">02 / THE INDIVIDUALS</span><h2 id="awards-title">Make your<br /><em>moment count.</em></h2></div>
          <p>Big performances earn their own spotlight. Four ways to leave your mark on Season 5.</p>
        </div>
        <div className="awards-list">
          {awards.map((award, index) => <article className="award-row" key={award.name}>
            <span className="award-number">0{index + 1}</span>
            <div className="award-name"><small>{award.tag}</small><h3>{award.name}</h3></div>
            <p>{award.prize}</p>
            <span className="award-star" aria-hidden="true">✳</span>
          </article>)}
        </div>
        <div className="sponsor-line"><span>PRIZES INCLUDE GIFTS AND COUPONS FROM</span><b>Monin</b><i /><b>GetMeCab</b><i /><b>Zomoz</b></div>
      </section>

      <section className="partners-section" id="partners" aria-labelledby="partners-title">
        <div className="partners-heading"><div><span className="section-index">03 / THE PEOPLE BEHIND THE SEASON</span><h2 id="partners-title">Good company.<br/><em>Great season.</em></h2></div><p>PHF Premier League Season 5 is proud to welcome the partners supporting our players and community.</p></div>
        <div className="partners-grid">
          <article className="partner-card partner-mobility">
            <span className="partner-role">START-UP SPONSOR · MOBILITY PARTNER</span><h3>GetMeCab</h3>
            <p>Intercity cab travel made simple. Book one-way trips, round trips, airport transfers, weekend getaways and family journeys across multiple cities and routes.</p>
            <a href="https://www.getmecab.com/?utm_source=phf&utm_medium=sponsorship&utm_campaign=phf_ppl_s5" target="_blank" rel="noreferrer">Explore GetMeCab <span aria-hidden="true">↗</span></a>
          </article>
          <article className="partner-card partner-land">
            <span className="partner-role">ASSOCIATE SPONSOR</span><h3>Viseshta Avenues</h3>
            <p>Introducing Palm Valley: an agricultural land project combining oil palm, agarwood intercropping and resort-style amenities. Oil palm may offer recurring agricultural income through FFB production; agarwood brings long-term value potential.</p>
            <div className="partner-features"><span>Oil palm & agarwood</span><span>Farmhouses & clubhouse</span><span>Pool · gated entry · 24/7 security</span></div>
          </article>
          <article className="partner-card partner-beverage">
            <span className="partner-role">BEVERAGE PARTNER</span><h3>MONIN</h3>
            <p>A French brand and a world leader in flavourful syrups—bringing more ways to add flavour to drinks and desserts throughout the PHF Premier League season.</p>
            <span className="partner-note">Flavour partner for Season 5</span>
          </article>
        </div>
      </section>

      <section className="fan-picks-callout">
        <div className="fan-picks-ball" aria-hidden="true">P</div>
        <div><span className="section-index">FOR EVERYONE IN THE STANDS</span><h2>Pick the winners.<br /><em>Win from home.</em></h2><p>Fan Picks is a separate challenge for PHF residents, with its own leaderboard and surprise prizes for the top three fans.</p></div>
        <a href={`${base}fan-guide.html`}>See how Fan Picks works <span aria-hidden="true">↗</span></a>
      </section>

      <footer className="prize-poster-footer">
        <span>KEEP THE PRIZE BOARD CLOSE</span>
        <a href={`${base}phf-season-5-prize-announcement.jpg`} target="_blank" rel="noreferrer">Open or save the full poster ↗</a>
      </footer>
    </main>
  </>;
}
