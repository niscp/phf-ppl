import SiteHeader from "./site-header";
import "./prizes-page.css";

const base = import.meta.env.BASE_URL;

const awards = [
  { name: "Player of the Match", tag: "MATCH DAY", feature: "Customized PHF cap", prize: "Plus a Monin gift and Zomoz coupons." },
  { name: "Player of the Series", tag: "THE SEASON", feature: "PHF kitbag + trophy", prize: "Plus a Monin gift hamper, GetMeCab and Zomoz coupons." },
  { name: "Purple Cap · Best Bowler", tag: "BOWLING", feature: "Shoes + customized Purple Cap", prize: "Plus a Monin gift hamper, GetMeCab and Zomoz coupons." },
  { name: "Orange Cap · Best Batter", tag: "BATTING", feature: "Batting gloves + customized Orange Cap", prize: "Plus a Monin gift hamper, GetMeCab and Zomoz coupons." },
];

export default function PrizesPage() {
  return <>
    <SiteHeader active="prizes" />
    <main className="phf-prizes-page">
      <section className="prizes-stage" aria-labelledby="prizes-title">
        <div className="stadium-glow" aria-hidden="true" />
        <div className="prizes-stage-copy">
          <p className="season-mark"><span>PHF</span> Premier League <i /> Season 5</p>
          <h1 id="prizes-title">Play for<br /><em>the pride.</em></h1>
          <p className="stage-deck">A season of big moments, silverware and rewards for the players who make it count.</p>
          <div className="grand-prize"><span>Total prizes announced</span><strong>₹105,000</strong><small>Team cash awards + trophies + individual honours</small></div>
          <a className="stage-link" href={`${base}fixtures.html`}>Follow the season <span aria-hidden="true">↗</span></a>
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
            <div className="award-details"><strong>{award.feature}</strong><p>{award.prize}</p></div>
            <span className="award-star" aria-hidden="true">✳</span>
          </article>)}
        </div>

      </section>

      <footer className="prize-poster-footer">
        <span>KEEP THE PRIZE BOARD CLOSE</span>
        <a href={`${base}phf-season-5-prize-announcement.jpg`} target="_blank" rel="noreferrer">Open or save the full poster ↗</a>
      </footer>
    </main>
  </>;
}
