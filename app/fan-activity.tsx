"use client";

import { useEffect, useState, type FormEvent } from "react";

const apiUrl = (import.meta.env.VITE_AUCTION_API_URL || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/$/, "");
const tokenKey = "phf-fan-token";

type FanPlayer = { id: string; name: string; role: string; team_id: string };
export type FanMatch = {
  id: number; match_number: number; match_date: string; match_time: string; status: "scheduled" | "completed";
  winner_team_id: string | null; result_text: string | null; starts_at: string; can_pick: boolean;
  home_team_id: string; home_team: string; home_logo: string | null; away_team_id: string; away_team: string; away_logo: string | null;
  home_players: FanPlayer[]; away_players: FanPlayer[];
  my_pick: null | { winner_team_id: string; top_scorer_player_id: string | null; top_wicket_taker_player_id: string | null };
  my_potm_vote: string | null;
  potm_votes: Array<{ player_id: string; player_name: string; votes: number }>;
  community: null | { home_votes: number; away_votes: number; total: number; home_percent: number; away_percent: number };
};
type FanProfile = { id: string; display_name: string; leaderboard_opt_in: boolean };

export async function fanRequest(path: string, init: RequestInit = {}) {
  if (!apiUrl) throw new Error("Fan activity API is not configured.");
  const token = typeof window !== "undefined" ? window.localStorage.getItem(tokenKey) : null;
  const response = await fetch(`${apiUrl}${path}`, { ...init, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status}).`);
  return body;
}

function fanPath() { return typeof window !== "undefined" && window.location.pathname.startsWith("/phf-ppl/") ? "/phf-ppl/fan.html" : "/fan.html"; }

export function FanMatchActivity({ matchNumber, compact = false, initialMatch }: { matchNumber: number; compact?: boolean; initialMatch?: FanMatch }) {
  const [match, setMatch] = useState<FanMatch | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [winner, setWinner] = useState("");
  const [scorer, setScorer] = useState("");
  const [bowler, setBowler] = useState("");
  const [potmChoice, setPotmChoice] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setSignedIn(Boolean(window.localStorage.getItem(tokenKey)));
    if (initialMatch) {
      setMatch(initialMatch);
      setWinner(initialMatch.my_pick?.winner_team_id ?? "");
      setScorer(initialMatch.my_pick?.top_scorer_player_id ?? "");
      setBowler(initialMatch.my_pick?.top_wicket_taker_player_id ?? "");
      setPotmChoice(initialMatch.my_potm_vote ?? "");
      return () => { active = false; };
    }
    fanRequest("/api/fan/matches").then((body) => {
      if (!active) return;
      const selected = (body.matches as FanMatch[]).find((item) => item.match_number === matchNumber) ?? null;
      setMatch(selected);
      setWinner(selected?.my_pick?.winner_team_id ?? "");
      setScorer(selected?.my_pick?.top_scorer_player_id ?? "");
      setBowler(selected?.my_pick?.top_wicket_taker_player_id ?? "");
      setPotmChoice(selected?.my_potm_vote ?? "");
    }).catch((reason: Error) => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [matchNumber, initialMatch]);

  async function savePick() {
    if (!match || !winner) { setError("Choose which team you think will win."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      await fanRequest(`/api/fan/matches/${matchNumber}/picks`, { method: "POST", body: JSON.stringify({ winner_team_id: winner, top_scorer_player_id: scorer || null, top_wicket_taker_player_id: bowler || null }) });
      const body = await fanRequest("/api/fan/matches");
      setMatch((body.matches as FanMatch[]).find((item) => item.match_number === matchNumber) ?? null);
      setMessage("Your picks are saved. You can edit them until the match starts.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save your picks."); }
    finally { setBusy(false); }
  }

  async function votePotm() {
    if (!match || !potmChoice) { setError("Choose a player for Fan Player of the Match."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      await fanRequest(`/api/fan/matches/${matchNumber}/potm`, { method: "POST", body: JSON.stringify({ player_id: potmChoice }) });
      const body = await fanRequest("/api/fan/matches");
      setMatch((body.matches as FanMatch[]).find((item) => item.match_number === matchNumber) ?? null);
      setMessage("Your Fan Player of the Match vote is in.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save your vote."); }
    finally { setBusy(false); }
  }

  if (error && !match) return <section className={`fan-match-activity${compact ? " compact" : ""}`}><div className="fan-activity-heading"><span>Matchday Fan Picks</span><h2>Make your call.</h2></div><p className="fan-message error" role="status">{error}</p><a className="fan-button" href={fanPath()}>Open Fan Picks</a></section>;

  return <section className={`fan-match-activity${compact ? " compact" : ""}`} aria-labelledby={`fan-picks-title-${matchNumber}`}>
    <div className="fan-activity-heading"><div><span>Match {String(matchNumber).padStart(2, "0")} · Fan picks</span><h2 id={`fan-picks-title-${matchNumber}`}>Who takes the win?</h2></div><a href={`${fanPath()}?match=${matchNumber}`}>All fan picks ↗</a></div>
    {error && <p className="fan-message error" role="alert">{error}</p>}
    {!match && !error && <p className="fan-loading">Loading picks…</p>}
    {match && <>
      {match.community && <div className="fan-community" aria-label="Community vote split"><div className="fan-vote-bar"><i style={{ width: `${match.community.home_percent}%` }}/><i style={{ width: `${match.community.away_percent}%` }}/></div><div><span>{match.home_team} <b>{match.community.home_percent}%</b></span><span>{match.away_team} <b>{match.community.away_percent}%</b></span></div><small>{match.community.total} {match.community.total === 1 ? "fan pick" : "fan picks"} · vote split is visible after you pick or voting closes</small></div>}
      {match.can_pick && <>
        <div className="fan-winner-options"><button type="button" className={winner === match.home_team_id ? "selected" : ""} onClick={() => setWinner(match.home_team_id)}>{match.home_team}</button><button type="button" className={winner === match.away_team_id ? "selected" : ""} onClick={() => setWinner(match.away_team_id)}>{match.away_team}</button></div>
        {!compact && <div className="fan-player-picks"><label>Top run-scorer <select value={scorer} onChange={(event) => setScorer(event.target.value)}><option value="">Optional player pick</option>{[...match.home_players, ...match.away_players].map((player) => <option key={player.id} value={player.id}>{player.name} · {player.team_id === match.home_team_id ? match.home_team : match.away_team}</option>)}</select></label><label>Top wicket-taker <select value={bowler} onChange={(event) => setBowler(event.target.value)}><option value="">Optional player pick</option>{[...match.home_players, ...match.away_players].map((player) => <option key={player.id} value={player.id}>{player.name} · {player.team_id === match.home_team_id ? match.home_team : match.away_team}</option>)}</select></label></div>}
        {signedIn ? <div className="fan-save-row"><span>{match.my_pick ? "Pick saved · edits close at match start" : "One entry per fan · edits close at match start"}</span><button className="fan-button" type="button" disabled={busy} onClick={savePick}>{busy ? "Saving…" : match.my_pick ? "Update pick" : "Save pick"}</button></div> : <div className="fan-save-row"><span>Sign in to save a pick. Your phone number stays private.</span><a className="fan-button" href={`${fanPath()}?match=${matchNumber}`}>Sign in to pick</a></div>}
      </>}
      {!match.can_pick && <div className="fan-closed-state"><b>{match.status === "completed" ? "Match complete" : "Picks are closed"}</b><span>{match.result_text || "The match pick window has closed."}</span>{match.my_pick && <span>Your pick was saved before the match.</span>}</div>}
      {match.status === "completed" && <div className="fan-potm"><div className="fan-potm-heading"><span>After the final ball</span><b>Fan Player of the Match</b></div>
        {match.potm_votes.length > 0 && <ol>{match.potm_votes.map((vote) => <li key={vote.player_id}><span>{vote.player_name}</span><b>{vote.votes}</b></li>)}</ol>}
        {!match.my_potm_vote ? <><label>Choose a player<select value={potmChoice} onChange={(event) => setPotmChoice(event.target.value)}><option value="">Select from both squads</option>{[...match.home_players, ...match.away_players].map((player) => <option key={player.id} value={player.id}>{player.name} · {player.team_id === match.home_team_id ? match.home_team : match.away_team}</option>)}</select></label>{signedIn ? <button className="fan-button" type="button" disabled={busy} onClick={votePotm}>{busy ? "Saving…" : "Cast one vote"}</button> : <a className="fan-button" href={`${fanPath()}?match=${matchNumber}`}>Sign in to vote</a>}</> : <p className="fan-potm-thanks">Your vote is recorded. Each fan gets one vote per match.</p>}
      </div>}
      {message && <p className="fan-message success" role="status">{message}</p>}
    </>}
  </section>;
}

function FanAuth({ onAuth }: { onAuth: (profile: FanProfile) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const body = await fanRequest(mode === "register" ? "/api/fan/register" : "/api/fan/login", { method: "POST", body: JSON.stringify({ ...(mode === "register" ? { name } : {}), phone, password }) });
      window.localStorage.setItem(tokenKey, body.token);
      onAuth(body.fan as FanProfile);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Sign-in could not be completed."); }
    finally { setBusy(false); }
  }
  return <form className="fan-auth-card" onSubmit={submit}>
    <div className="fan-auth-tabs"><button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>Sign in</button><button type="button" className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(""); }}>Create account</button></div>
    <h2>{mode === "register" ? "Join the fan table." : "Your picks, all season."}</h2>
    <p>{mode === "register" ? "Create one account to save a pick for every match." : "Sign in to save picks and follow your season score."}</p>
    {mode === "register" && <label>Your name<input autoComplete="name" required minLength={2} maxLength={40} value={name} onChange={(event) => setName(event.target.value)} placeholder="Name shown on your profile"/></label>}
    <label>Phone number<input autoComplete="tel" inputMode="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="10-digit Indian number or +country code"/></label>
    <label>Password<input autoComplete={mode === "register" ? "new-password" : "current-password"} type="password" minLength={mode === "register" ? 10 : 1} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === "register" ? "At least 10 characters" : "Your password"}/></label>
    {error && <p className="fan-message error" role="alert">{error}</p>}
    {mode === "register" && <small className="fan-auth-privacy">No SMS verification is enabled. Use a number you control; it will not be shown publicly.</small>}
    <button className="fan-button" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "register" ? "Create fan account" : "Sign in"}</button>
  </form>;
}

export default function FanPage() {
  const [fan, setFan] = useState<FanProfile | null>(null);
  const [matches, setMatches] = useState<FanMatch[]>([]);
  const [leaderboard, setLeaderboard] = useState<Array<{ display_name: string; points: number; votes_cast: number; match_entries: number; potm_votes: number; accuracy_percent: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true); setLoadError("");
    try {
      const [matchBody, boardBody] = await Promise.all([fanRequest("/api/fan/matches"), fanRequest("/api/fan/leaderboard")]);
      setMatches(matchBody.matches as FanMatch[]); setLeaderboard(boardBody.leaderboard);
    } catch (reason) { setLoadError(reason instanceof Error ? reason.message : "Fan picks could not be loaded."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    const token = window.localStorage.getItem(tokenKey);
    const restore = token ? fanRequest("/api/fan/me").then((body) => { if (active) setFan(body.fan); }).catch(() => { window.localStorage.removeItem(tokenKey); }) : Promise.resolve();
    Promise.all([restore, load()]);
    return () => { active = false; };
  }, []);

  async function toggleLeaderboard(checked: boolean) {
    setNotice("");
    try { const body = await fanRequest("/api/fan/profile", { method: "PATCH", body: JSON.stringify({ leaderboard_opt_in: checked }) }); setFan(body.fan); setNotice(checked ? "Your display name will appear on the public leaderboard." : "Your name has been removed from the public leaderboard."); await load(); }
    catch (reason) { setLoadError(reason instanceof Error ? reason.message : "Profile setting could not be saved."); }
  }

  function signOut() { window.localStorage.removeItem(tokenKey); setFan(null); setNotice("You are signed out."); void load(); }
  const selectedMatch = Number(new URLSearchParams(window.location.search).get("match"));

  return <main className="fan-page">
    <header className="fan-hero"><div className="fan-hero-inner"><span>PHF Premier League · Season 5</span><h1>Fan Picks</h1><p>Back your call before the first ball. Follow every fixture. Keep your season score.</p><div className="fan-hero-stats"><div><b>{matches.length || 15}</b><span>league matches</span></div><div><b>3</b><span>picks per match</span></div><div><b>0</b><span>entry fee</span></div></div></div></header>
    <section className="fan-main-grid"><div className="fan-match-list">
      <div className="fan-section-heading"><div><span>Season 5 schedule</span><h2>Make your picks.</h2></div><p>Choose the match winner. Player calls are optional. Change your picks until that match starts.</p></div>
      {loadError && <p className="fan-message error" role="alert">{loadError}</p>}
      {notice && <p className="fan-message success" role="status">{notice}</p>}
      {loading && <p className="fan-loading">Loading the fixtures and picks…</p>}
      {!loading && matches.map((match) => <details id={`match-${match.match_number}`} key={match.id} open={selectedMatch === match.match_number || (!selectedMatch && match.can_pick && match.match_number === matches.find((candidate) => candidate.can_pick)?.match_number)} className={`fan-page-match${selectedMatch === match.match_number ? " focused" : ""}`}>
        <summary className="fan-page-match-head"><div><span>Match {String(match.match_number).padStart(2, "0")} · {new Date(`${match.match_date}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {match.match_time}</span><h3>{match.home_team} <i>vs</i> {match.away_team}</h3></div><b className={match.can_pick ? "open" : "closed"}>{match.can_pick ? "Picks open" : match.status === "completed" ? "Final" : "Closed"}</b><span className="fan-match-expand">{selectedMatch === match.match_number || (!selectedMatch && match.can_pick && match.match_number === matches.find((candidate) => candidate.can_pick)?.match_number) ? "Hide" : "Make picks"}</span></summary>
        <FanMatchActivity key={`${match.match_number}-${fan?.id ?? "guest"}`} matchNumber={match.match_number} initialMatch={match}/>
      </details>)}
      {!loading && matches.length === 0 && !loadError && <div className="fan-empty">Fixtures are being prepared. Check back when the schedule is published.</div>}
    </div><aside className="fan-sidebar">
      {!fan ? <FanAuth onAuth={(profile) => { setFan(profile); setNotice(`Welcome, ${profile.display_name}. Your picks are ready.`); void load(); }} /> : <section className="fan-profile-card"><div className="fan-overline">Fan profile</div><h2>Welcome, {fan.display_name}.</h2><p>Your saved picks stay linked to this account across matches.</p><label className="fan-opt-in"><input type="checkbox" checked={fan.leaderboard_opt_in} onChange={(event) => void toggleLeaderboard(event.target.checked)}/><span><b>Show me on the leaderboard</b><small>Only your display name and correct-pick count are public. Your phone stays private.</small></span></label><button type="button" className="fan-button secondary" onClick={signOut}>Sign out</button></section>}
      <section className="fan-rules-card"><div className="fan-overline">How fan picks work</div><ul><li>One account can save one entry for each match.</li><li>Pick the winner; top batter and bowler are optional.</li><li>Edit or replace your pick until scheduled start.</li><li>Winner calls count toward the season leaderboard.</li><li>No entry fee or cash prize.</li></ul></section>
      <section className="fan-board-card"><div className="fan-section-heading"><div><span>Season standings</span><h2>Fan leaderboard</h2></div></div>{leaderboard.length ? <><div className="fan-board-columns"><span>Rank · fan</span><span>Votes / accuracy</span><b>Points</b></div><ol>{leaderboard.map((row, index) => <li key={`${row.display_name}-${index}`}><b>{String(index + 1).padStart(2, "0")}</b><span>{row.display_name}<small>{row.votes_cast} votes · {row.match_entries} match entries · {row.potm_votes} player-of-match votes · {row.accuracy_percent}% winner accuracy</small></span><strong>{row.points}</strong></li>)}</ol><p className="fan-board-scoring">1 point per correct match-winner pick. Each submitted winner, top-scorer, top-wicket-taker, and Player of the Match choice counts as a vote. Ranked by points, then votes, then accuracy.</p></> : <p>Leaderboard points appear after match results are recorded. Fans choose whether to show their display name here.</p>}</section>
    </aside></section>
  </main>;
}
