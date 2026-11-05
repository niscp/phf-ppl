import SiteHeader from "./site-header";
import "./fan-guide-page.css";

const asset = (name: string) => `${import.meta.env.BASE_URL}${name}`;
const page = (name: string) => `${import.meta.env.BASE_URL}${name}`;
const accountHref = `${page("fan-account.html")}?next=${encodeURIComponent(page("fan.html"))}`;

const engagementRules = [
  ["Pick the match winner", "+2 points"],
  ["Pick the top scorer", "+1 point"],
  ["Pick the top wicket-taker", "+1 point"],
  ["Choose both top scorer and wicket-taker", "+1 bonus"],
  ["Choose a player to watch", "+1 point"],
  ["Predict the first-innings score range", "+1 point"],
  ["Vote in the match poll", "+1 point"],
  ["Choose one power pick for a matchday", "+1 point"],
  ["Make picks for every match on a matchday", "+2 points"],
  ["Complete full matchday picks for 3 matchdays in a row", "+2 points"],
];

export default function FanGuidePage() {
  return <>
    <SiteHeader active="fan-guide" />
    <main className="fan-guide">
      <section className="fan-guide-hero">
        <div className="fan-guide-hero-photo" style={{ backgroundImage: `url("${asset("legacy-5.jpg")}")` }} aria-hidden="true" />
        <div className="fan-guide-hero-copy">
          <p className="fan-guide-kicker">PHF Premier League · Season 5</p>
          <h1>Watch the game.<br/><em>Make your call.</em></h1>
          <p className="fan-guide-lede">Fan Picks is a friendly cricket challenge for PHF residents. Follow the matches, predict what will happen, and see your name climb the fan boards. You can join from home. You do not have to be a player.</p>
          <div className="fan-guide-actions">
            <a className="fan-guide-button" href={accountHref}>Join the Fan Picks</a>
            <a className="fan-guide-text-link" href={page("fan.html")}>See the matches <span aria-hidden="true">↗</span></a>
          </div>
          <p className="fan-guide-free-note">It is free to take part. Your phone number stays private.</p>
        </div>
        <div className="fan-guide-hero-stamp" aria-hidden="true"><b>PHF</b><span>PLAY<br/>FROM<br/>HOME</span></div>
      </section>

      <section className="fan-guide-film" aria-labelledby="fan-guide-film-title">
        <div className="fan-guide-section-heading">
          <div><p className="fan-guide-kicker">A quick look</p><h2 id="fan-guide-film-title">See how it works.</h2></div>
          <p>Watch the short walkthrough, then try your first pick.</p>
        </div>
        <div className="fan-guide-video-wrap">
          <video controls playsInline preload="metadata" poster={asset("legacy-5.jpg")} aria-label="PHF Premier League Fan Picks announcement and walkthrough">
            <source src={asset("phf-fan-engagement-announcement.mp4")} type="video/mp4" />
            Your browser does not support this video. You can still read the steps below.
          </video>
        </div>
        <p className="fan-guide-caption">The PHF Premier League Fan Picks challenge, from joining to checking the leaderboard.</p>
      </section>

      <section className="fan-guide-steps" aria-labelledby="fan-guide-steps-title">
        <div className="fan-guide-section-heading">
          <div><p className="fan-guide-kicker">No cricket experience needed</p><h2 id="fan-guide-steps-title">Here’s all you do.</h2></div>
          <p>Make a few choices before a match starts. Then enjoy the game and see how your calls turned out.</p>
        </div>
        <div className="fan-guide-step-list">
          <article><span className="fan-guide-step-number">1</span><div><h3>Make your fan account</h3><p>Choose the name people in the society will see on the leaderboard. Sign in with your phone number and password. Your phone number is not shown publicly.</p></div></article>
          <article><span className="fan-guide-step-number">2</span><div><h3>Pick a match</h3><p>Open Fan Picks and choose a scheduled match. Start with the team you think will win. You can also make player and score predictions if you want.</p></div></article>
          <article><span className="fan-guide-step-number">3</span><div><h3>Save before the first ball</h3><p>Save your picks before the match starts. You can change them until then. Once the match begins, your picks are locked.</p></div></article>
          <article><span className="fan-guide-step-number">4</span><div><h3>Follow the fan race</h3><p>Come back to see match results and your place on either leaderboard. Keep joining in across the season to give yourself more chances to climb.</p></div></article>
        </div>
      </section>

      <section className="fan-guide-boards" aria-labelledby="fan-guide-boards-title">
        <div className="fan-guide-section-heading">
          <div><p className="fan-guide-kicker">Two ways to stand out</p><h2 id="fan-guide-boards-title">Two fan leaderboards.</h2></div>
          <p>You can enjoy both races. One rewards showing up and joining in; the other rewards correct match-winner calls.</p>
        </div>
        <div className="fan-guide-board-grid">
          <article className="fan-guide-board-card engagement">
            <span className="fan-guide-board-label">The participation race</span>
            <h3>Most Engaged</h3>
            <p>Pick, vote, and take part across the matchdays. Here is how engagement points add up:</p>
            <ul>{engagementRules.map(([label, points]) => <li key={label}><span>{label}</span><b>{points}</b></li>)}</ul>
            <p className="fan-guide-small-print">One entry or vote per match. Editing your pick or opening the site again does not add points. A power pick is one match you choose on each matchday.</p>
          </article>
          <article className="fan-guide-board-card points">
            <span className="fan-guide-board-label">The prediction race</span>
            <h3>Most Points</h3>
            <div className="fan-guide-point-callout"><strong>+1</strong><span>for each match winner you call correctly</span></div>
            <p>After the result is recorded, a correct winner prediction earns one point. Incorrect calls do not add points to this board.</p>
            <p>If fans tie on points, winner-pick accuracy comes next, then engagement score. Equal records share a rank.</p>
          </article>
        </div>
      </section>

      <section className="fan-guide-finish">
        <div><p className="fan-guide-kicker">The whole society can join</p><h2>Pick a side. Back your call. Cheer together.</h2><p>The top three fans at the end of the tournament will get surprise awards. Start with one match and see where your season takes you.</p></div>
        <div className="fan-guide-actions"><a className="fan-guide-button" href={accountHref}>Create your fan account</a><a className="fan-guide-text-link" href={page("fan-leaderboard.html")}>View the leaderboard <span aria-hidden="true">↗</span></a></div>
      </section>
    </main>
  </>;
}
