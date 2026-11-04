"use client";

import { useMemo, useState } from "react";
import { announcedCaptains, announcedTeams } from "./season5-teams";
import { fixtureTeamOrder, seasonFiveFixtures } from "./season5-fixtures";
import SiteHeader from "./site-header";

const base = typeof window !== "undefined" && window.location.pathname.startsWith("/phf-ppl/") ? "/phf-ppl/" : "/";
const asset = (path: string | null | undefined) => path ? `${base}${path.replace(/^\//, "")}` : "";

export default function FixturesPage() {
  const initialTeam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("team") ?? "all" : "all";
  const [teamId, setTeamId] = useState(fixtureTeamOrder.includes(initialTeam as typeof fixtureTeamOrder[number]) ? initialTeam : "all");
  const selectedSlot = fixtureTeamOrder.indexOf(teamId as typeof fixtureTeamOrder[number]) + 1;
  const matches = useMemo(() => seasonFiveFixtures.filter((fixture) => teamId === "all" || fixture.home_slot === selectedSlot || fixture.away_slot === selectedSlot), [teamId, selectedSlot]);
  const days = [...new Set(matches.map((fixture) => fixture.date))];
  const teamForSlot = (slot: number) => announcedTeams.find((team) => team.id === fixtureTeamOrder[slot - 1]);
  const captainForTeam = (teamId: string) => announcedCaptains.find((player) => player.team_id === teamId)?.name ?? "Captain to be announced";
  const dateLabel = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });

  return <main className="fixtures-page">
    <SiteHeader active="fixtures" />
    <section className="fixtures-hero"><div className="fixtures-hero-copy"><span>Season 5 · Match schedule</span><h1>Fixtures</h1><p>Follow every team’s route to Finals Day. Pick a side to see only their matches.</p></div><div className="fixtures-hero-facts"><div><b>15</b><span>league matches</span></div><div><b>6</b><span>teams</span></div><div><b>06 Dec</b><span>Finals Day</span></div></div></section>
    <section className="fixtures-content" aria-label="Season 5 fixtures">
      <div className="fixtures-filter-heading"><div><span>League stage</span><h2>{teamId === "all" ? "All matches" : `${teamForSlot(selectedSlot)?.name ?? "Team"} fixtures`}</h2></div><span className="fixtures-count">{matches.length} {matches.length === 1 ? "match" : "matches"}</span></div>
      <div className="fixtures-filter" aria-label="Filter fixtures by team"><button className={teamId === "all" ? "selected" : ""} aria-pressed={teamId === "all"} onClick={() => setTeamId("all")}>All teams</button>{fixtureTeamOrder.map((id) => { const team = announcedTeams.find((item) => item.id === id)!; return <button key={id} className={teamId === id ? "selected" : ""} aria-pressed={teamId === id} onClick={() => setTeamId(id)}>{team.logo_url && <img src={asset(team.logo_url)} alt=""/>}{team.name}</button>; })}</div>
      <div className="fixtures-days">{days.map((date) => <section className="fixture-day" key={date}><header className="fixture-day-heading"><h3>{dateLabel(date)}</h3><span>{matches.filter((match) => match.date === date).length} matches</span></header><div className="fixture-cards">{matches.filter((match) => match.date === date).map((match) => { const home = teamForSlot(match.home_slot)!; const away = teamForSlot(match.away_slot)!; return <a className="fixture-card" key={match.match_number} href={`${base}match.html?match=${match.match_number}`}><div className="fixture-card-top"><span>Match {String(match.match_number).padStart(2, "0")}</span><b>{match.time}</b></div><div className="fixture-versus"><div className="fixture-team"><img src={asset(home.logo_url)} alt={`${home.name} crest`} loading="lazy"/><strong>{home.name}</strong><small>Captain · {captainForTeam(home.id)}</small></div><i>VS</i><div className="fixture-team"><img src={asset(away.logo_url)} alt={`${away.name} crest`} loading="lazy"/><strong>{away.name}</strong><small>Captain · {captainForTeam(away.id)}</small></div></div><div className="fixture-card-bottom"><span>Melbourne Cricket Ground</span><strong>Match centre <i>↗</i></strong></div></a>; })}</div></section>)}</div>
      <section className="finals-day"><div><span>Championship day · 6 December</span><h2>Finals Day</h2><p>League standings set the matchups. Final positions will appear here once the league stage is complete.</p></div><div><article><b>10:30 AM</b><strong>Bronze match</strong><span>3rd place <i>vs</i> 4th place</span></article><article><b>2:00 PM</b><strong>Grand final</strong><span>1st place <i>vs</i> 2nd place</span></article></div></section>
    </section>
  </main>;
}
