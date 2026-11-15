import SiteHeader from "./site-header";
import "./trailer-page.css";

const asset = (name: string) => `${import.meta.env.BASE_URL}${name}`;
const page = (name: string) => `${import.meta.env.BASE_URL}${name}`;

export default function TrailerPage() {
  return <>
    <SiteHeader active="home" />
    <main className="season-trailer-page">
      <section className="season-trailer-hero">
        <div className="season-trailer-copy">
          <p>PHF Premier League · Season 5</p>
          <h1>One season.<br/><em>One community.</em></h1>
          <span>Six teams take the field. The whole PHF community gets to be part of the story.</span>
        </div>
        <div className="season-trailer-film">
          <video controls playsInline preload="metadata" poster={asset("phf-season-5-trailer-poster.jpg")} aria-label="PHF Premier League Season 5 trailer featuring the teams, squads, schedule, trophy and Fan Picks">
            <source src={asset("phf-premier-league-season-5-residents-trailer-v2.mp4")} type="video/mp4" />
            Your browser does not support MP4 video playback. Use the download link below to watch the trailer.
          </video>
        </div>
        <div className="season-trailer-actions">
          <a href={page("fixtures.html")}>See the match schedule</a>
          <a href={page("fan-guide.html")}>How Fan Picks work</a>
          <a className="season-trailer-download" href={asset("phf-premier-league-season-5-residents-trailer-v2.mp4")} download>Download trailer</a>
        </div>
      </section>
    </main>
  </>;
}
