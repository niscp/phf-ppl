import SiteHeader from "./site-header";
import "./prizes-page.css";
import "./sponsors-page.css";

const base = import.meta.env.BASE_URL;

export default function SponsorsPage() {
  return <div className="phf-prizes-page phf-sponsors-page">
    <SiteHeader active="sponsors" />
    <main>
      <section className="sponsors-hero">
        <p className="sponsors-eyebrow">PHF PREMIER LEAGUE · SEASON 5</p>
        <h1>Made possible<br/><em>together.</em></h1>
        <p>Meet the partners and community organisations supporting this season.</p>
      </section>
      <section className="partners-section sponsor-profiles" aria-labelledby="partners-title">
        <div className="partners-heading"><div><span className="section-index">03 / THE PEOPLE BEHIND THE SEASON</span><h2 id="partners-title">Good company.<br/><em>Great season.</em></h2></div><p>PHF Premier League Season 5 is proud to welcome the partners supporting our players and community.</p></div>
        <div className="partners-grid">
          <article id="getmecab" className="partner-card partner-mobility">
            <span className="partner-role">START-UP SPONSOR · MOBILITY PARTNER</span><div className="partner-logo partner-logo-gmc"><img src={`${base}partner-getmecab.jpg`} alt="GetMeCab logo" loading="lazy"/></div>
            <p>Intercity cab travel made simple. Book one-way trips, round trips, airport transfers, weekend getaways and family journeys across multiple cities and routes.</p>
            <a href="https://www.getmecab.com/?utm_source=phf&utm_medium=sponsorship&utm_campaign=phf_ppl_s5" target="_blank" rel="noreferrer">Explore GetMeCab <span aria-hidden="true">↗</span></a>
          </article>
          <article id="viseshta" className="partner-card partner-land">
            <span className="partner-role">ASSOCIATE SPONSOR</span><div className="partner-logo partner-logo-viseshta"><img src={`${base}partner-viseshta.jpg`} alt="Viseshta Avenues Palm Valley logo" loading="lazy"/></div>
            <p>Introducing Palm Valley: an agricultural land project combining oil palm, agarwood intercropping and resort-style amenities. Oil palm may offer recurring agricultural income through FFB production; agarwood brings long-term value potential.</p>
            <div className="partner-features"><span>Farmhouses & clubhouse</span><span>Pool · gated entry</span><span>Drip irrigation · 24/7 security</span></div>
          </article>
          <article id="monin" className="partner-card partner-beverage">
            <span className="partner-role">BEVERAGE PARTNER</span><div className="partner-logo partner-logo-monin"><img src={`${base}partner-monin.jpg`} alt="MONIN logo" loading="lazy"/></div>
            <p>A French brand and a world leader in flavourful syrups—bringing more ways to add flavour to drinks and desserts throughout the PHF Premier League season.</p>
            <span className="partner-note">Flavour partner for Season 5</span>
          </article>
          <article id="kotak" className="partner-card partner-banking">
            <span className="partner-role">BANKING PARTNER · FINANCIAL DISTRICT BRANCH</span><div className="partner-logo partner-logo-kotak"><img src={`${base}partner-kotak.jpg`} alt="Kotak Mahindra Bank logo" loading="lazy"/></div>
            <p>Banking solutions for the community, from savings and current accounts to loans, investments, credit cards and insurance. The Financial District branch is close to the society.</p>
            <span className="partner-note">Here for your banking needs</span>
          </article>
        </div>
        <article id="arthah" className="school-spotlight">
          <div className="school-copy"><span className="partner-role">COMMUNITY ANNOUNCEMENT · ADMISSIONS 2027–28</span><h3>The Arthah School</h3><p>A learning environment for tomorrow, bringing together academic rigour, contemporary teaching, technology, creativity and holistic development.</p><p className="school-offer">Early-bird admission privileges include an admission fee waiver, extended tuition privilege and enrolment benefits. Limited admissions and limited-time offers.</p><span className="school-location">Kollur, Hyderabad</span><div className="school-actions"><a href="https://thearthahschool.com" target="_blank" rel="noreferrer">Visit school website ↗</a><a href="tel:+919513188978">Call 95131 88978</a></div></div>
          <a className="school-poster" href={`${base}partner-arthah-school-admissions.jpg`} target="_blank" rel="noreferrer" aria-label="Open The Arthah School admissions poster"><img src={`${base}partner-arthah-school-admissions.jpg`} alt="The Arthah School admissions open for 2027–28 in Kollur, Hyderabad. Call 9513188978." loading="lazy"/></a>
        </article>
      </section>

    </main>
  </div>;
}
