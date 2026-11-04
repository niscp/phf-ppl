"use client";

import { useMemo, useState } from "react";
import { announcedTeams } from "./season5-teams";
import { fixtureTeamOrder, seasonFiveFixtures } from "./season5-fixtures";
import SiteHeader from "./site-header";

const base = typeof window !== "undefined" && window.location.pathname.startsWith("/phf-ppl/") ? "/phf-ppl/" : "/";

export default function FixturesPage() {
  const initialTeam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("team") ?? "all" : "all";
  const [teamId, setTeamId] = useState(initialTeam);
  const selectedSlot = fixtureTeamOrder.indexOf(teamId as typeof fixtureTeamOrder[number]) + 1;
  const matches = useMemo(() => seasonFiveFixtures.filter((fixture) => teamId === "all" || fixture.home_slot === selectedSlot || fixture.away_slot === selectedSlot), [teamId, selectedSlot]);
  const days = [...new Set(matches.map((fixture) => fixture.date))];
  const teamName = (slot: number) => announcedTeams.find((team) => team.id === fixtureTeamOrder[slot - 1])?.name ?? `Team ${slot}`;
  const dateLabel = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  return <main className="fixtures-page">
    <SiteHeader active="fixtures" />
    <section className="fixtures-hero"><span>PHF Premier League · Season 5</span><h1>Fixtures</h1><p>Every league match, in date and time order. Filter by team to follow their season.</p><div><b>15</b> league matches <i>·</i> <b>6</b> teams <i>·</i> Finals Day <b>6 December</b></div></section>
    <section className="fixtures-content" aria-label="Season 5 fixtures">
      <div className="fixtures-filter-heading"><div><span>Schedule</span><h2>{teamId === "all" ? "All matches" : `${teamName(selectedSlot)} matches`}</h2></div><span className="fixtures-count">{matches.length} matches</span></div>
      <div className="fixtures-filter" aria-label="Filter fixtures by team"><button className={teamId === "all" ? "selected" : ""} onClick={() => setTeamId("all")}>All teams</button>{fixtureTeamOrder.map((id) => { const team = announcedTeams.find((item) => item.id === id)!; return <button key={id} className={teamId === id ? "selected" : ""} onClick={() => setTeamId(id)}>{team.name}</button>; })}</div>
      <div className="fixtures-days">{days.map((date) => <section className="fixture-day" key={date}><h3>{dateLabel(date)}</h3><div className="fixture-cards">{matches.filter((match) => match.date === date).map((match) => <a className="fixture-card" key={match.match_number} href={`${base}match.html?match=${match.match_number}`}><div className="fixture-card-top"><span>Match {String(match.match_number).padStart(2, "0")}</span><b>{match.time}</b></div><div className="fixture-versus"><span>{teamName(match.home_slot)}</span><i>vs</i><span>{teamName(match.away_slot)}</span></div><div className="fixture-card-bottom"><span>Melbourne Cricket Ground</span><strong>Match details <i>↗</i></strong></div></a>)}</div></section>)}</div>
      <section className="finals-day"><div><span>Championship day · 6 December</span><h2>Finals Day</h2><p>League standings set the matchups. Final positions will appear here once the league stage is complete.</p></div><div><article><b>10:30 AM</b><strong>Bronze match</strong><span>3rd place <i>vs</i> 4th place</span></article><article><b>2:00 PM</b><strong>Grand final</strong><span>1st place <i>vs</i> 2nd place</span></article></div></section>
    </section>
  </main>;
}
