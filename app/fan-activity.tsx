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
type FanProfile = { id: string; display_name: string };
type FanLeaderboardRow = { display_name: string; points: number; votes_cast: number; match_entries: number; potm_votes: number; accuracy_percent: number };

export async function fanRequest(path: string, init: RequestInit = {}) {
  if (!apiUrl) throw new Error("Fan activity API is not configured.");
  const token = typeof window !== "undefined" ? window.localStorage.getItem(tokenKey) : null;
  const response = await fetch(`${apiUrl}${path}`, { ...init, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status}).`);
  return body;
}

function pagePath(file: string) { const base = typeof window !== "undefined" && window.location.pathname.startsWith("/phf-ppl/") ? "/phf-ppl/" : "/"; return `${base}${file}`; }
function fanPath() { return pagePath("fan.html"); }
function fanLeaderboardPath() { return pagePath("fan-leaderboard.html"); }
function fanAccountPath(next?: string) { const base = typeof window !== "undefined" && window.location.pathname.startsWith("/phf-ppl/") ? "/phf-ppl/" : "/"; const returnTo = next ? `${base}${next.replace(/^\/+/, "")}` : `${base}fan.html`; return `${pagePath("fan-account.html")}?next=${encodeURIComponent(returnTo)}`; }

export function FanMatchActivity({ matchNumber, compact = false, initialMatch }: { matchNumber: number; compact?: boolean; initialMatch?: FanMatch }) {
  const [match, setMatch] = useState<FanMatch | null>(initialMatch ?? null);
  const [signedIn] = useState(() => typeof window !== "undefined" && Boolean(window.localStorage.getItem(tokenKey)));
  const [winner, setWinner] = useState(initialMatch?.my_pick?.winner_team_id ?? "");
  const [scorer, setScorer] = useState(initialMatch?.my_pick?.top_scorer_player_id ?? "");
  const [bowler, setBowler] = useState(initialMatch?.my_pick?.top_wicket_taker_player_id ?? "");
  const [potmChoice, setPotmChoice] = useState(initialMatch?.my_potm_vote ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (initialMatch) {
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
      {signedIn ? <div className="fan-save-row"><span>{match.my_pick ? "Pick saved · edits close at match start" : "One entry per fan · edits close at match start"}</span><button className="fan-button" type="button" disabled={busy} onClick={savePick}>{busy ? "Saving…" : match.my_pick ? "Update pick" : "Save pick"}</button></div> : <div className="fan-save-row"><span>Sign in to save a pick. Your phone number stays private.</span><a className="fan-button" href={fanAccountPath(`/fan.html?match=${matchNumber}`)}>Sign in to pick</a></div>}
      </>}
      {!match.can_pick && <div className="fan-closed-state"><b>{match.status === "completed" ? "Match complete" : "Picks are closed"}</b><span>{match.result_text || "The match pick window has closed."}</span>{match.my_pick && <span>Your pick was saved before the match.</span>}</div>}
      {match.status === "completed" && <div className="fan-potm"><div className="fan-potm-heading"><span>After the final ball</span><b>Fan Player of the Match</b></div>
        {match.potm_votes.length > 0 && <ol>{match.potm_votes.map((vote) => <li key={vote.player_id}><span>{vote.player_name}</span><b>{vote.votes}</b></li>)}</ol>}
        {!match.my_potm_vote ? <><label>Choose a player<select value={potmChoice} onChange={(event) => setPotmChoice(event.target.value)}><option value="">Select from both squads</option>{[...match.home_players, ...match.away_players].map((player) => <option key={player.id} value={player.id}>{player.name} · {player.team_id === match.home_team_id ? match.home_team : match.away_team}</option>)}</select></label>{signedIn ? <button className="fan-button" type="button" disabled={busy} onClick={votePotm}>{busy ? "Saving…" : "Cast one vote"}</button> : <a className="fan-button" href={fanAccountPath(`/fan.html?match=${matchNumber}`)}>Sign in to vote</a>}</> : <p className="fan-potm-thanks">Your vote is recorded. Each fan gets one vote per match.</p>}
      </div>}
      {message && <p className="fan-message success" role="status">{message}</p>}
    </>}
  </section>;
}

export function FanAuth({ onAuth }: { onAuth: (profile: FanProfile) => void }) {
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
  return <form id="fan-account" className="fan-auth-card" onSubmit={submit}>
    <div className="fan-auth-tabs"><button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>Sign in</button><button type="button" className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(""); }}>Create account</button></div>
    <h2>{mode === "register" ? "Join the fan table." : "Your picks, all season."}</h2>
    <p>{mode === "register" ? "Create one account to save a pick for every match." : "Sign in to save picks and follow your season score."}</p>
    {mode === "register" && <label>Your name<input autoComplete="name" required minLength={2} maxLength={40} value={name} onChange={(event) => setName(event.target.value)} placeholder="Name shown on your profile"/></label>}
    <label>Phone number<input autoComplete="tel" inputMode="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="10-digit Indian number or +country code"/></label>
    <label>Password<input autoComplete={mode === "register" ? "new-password" : "current-password"} type="password" minLength={mode === "register" ? 10 : 1} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === "register" ? "At least 10 characters" : "Your password"}/></label>
    {error && <p className="fan-message error" role="alert">{error}</p>}
    {mode === "register" && <small className="fan-auth-privacy">Your display name appears on the public fan leaderboard. Your phone number stays private and is never displayed.</small>}
    <button className="fan-button" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "register" ? "Create fan account" : "Sign in"}</button>
  </form>;
}

export default function FanPage() {
  const [fan, setFan] = useState<FanProfile | null>(null);
  const [matches, setMatches] = useState<FanMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    const token = window.localStorage.getItem(tokenKey);
    const restore = token ? fanRequest("/api/fan/me").then((body) => { if (active) setFan(body.fan); }).catch(() => { window.localStorage.removeItem(tokenKey); }) : Promise.resolve();
    const matchLoad = fanRequest("/api/fan/matches").then((body) => { if (active) setMatches(body.matches as FanMatch[]); }).catch((reason: Error) => { if (active) setLoadError(reason.message); }).finally(() => { if (active) setLoading(false); });
    void Promise.all([restore, matchLoad]);
    return () => { active = false; };
  }, []);

  const selectedMatch = Number(new URLSearchParams(window.location.search).get("match"));

  return <main className="fan-page">
    <header className="fan-hero"><div className="fan-hero-inner"><span>PHF Premier League · Season 5</span><h1>Fan Picks</h1><p>Make your match calls and see how your predictions score through the season.</p><div className="fan-hero-stats"><div><b>{matches.length || 15}</b><span>league matches</span></div><div><b>3</b><span>picks per match</span></div><div><b>0</b><span>entry fee</span></div></div><div className="fan-page-actions"><a className="fan-button" href={fanAccountPath("/fan.html")}>{fan ? `Account · ${fan.display_name}` : "Sign in / Create account"}</a><a className="fan-button secondary" href={fanLeaderboardPath()}>Fan leaderboard ↗</a></div></div></header>
    <section className="fan-main-grid"><div id="fan-matches" className="fan-match-list">
      <div className="fan-section-heading"><div><span>Season 5 schedule</span><h2>Make your picks.</h2></div><p>Choose the match winner. Player calls are optional. Change your picks until that match starts.</p></div>
      {loadError && <p className="fan-message error" role="alert">{loadError}</p>}
      {loading && <p className="fan-loading">Loading the fixtures and picks…</p>}
      {!loading && matches.map((match) => <details id={`match-${match.match_number}`} key={match.id} open={selectedMatch === match.match_number || (!selectedMatch && match.can_pick && match.match_number === matches.find((candidate) => candidate.can_pick)?.match_number)} className={`fan-page-match${selectedMatch === match.match_number ? " focused" : ""}`}>
        <summary className="fan-page-match-head"><div><span>Match {String(match.match_number).padStart(2, "0")} · {new Date(`${match.match_date}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {match.match_time}</span><h3>{match.home_team} <i>vs</i> {match.away_team}</h3></div><b className={match.can_pick ? "open" : "closed"}>{match.can_pick ? "Picks open" : match.status === "completed" ? "Final" : "Closed"}</b><span className="fan-match-expand">{selectedMatch === match.match_number || (!selectedMatch && match.can_pick && match.match_number === matches.find((candidate) => candidate.can_pick)?.match_number) ? "Hide" : "Make picks"}</span></summary>
        <FanMatchActivity key={`${match.match_number}-${fan?.id ?? "guest"}`} matchNumber={match.match_number} initialMatch={match}/>
      </details>)}
      {!loading && matches.length === 0 && !loadError && <div className="fan-empty">Fixtures are being prepared. Check back when the schedule is published.</div>}
    </div></section>
  </main>;
}

function FanLeaderboardCard({ leaderboard, loading, error }: { leaderboard: FanLeaderboardRow[]; loading: boolean; error: string }) {
  const [mode, setMode] = useState<"engaged" | "points">("engaged");
  const rankedFans = [...leaderboard].sort((a, b) => mode === "engaged"
    ? b.votes_cast - a.votes_cast || b.match_entries - a.match_entries || b.points - a.points || a.display_name.localeCompare(b.display_name)
    : b.points - a.points || b.accuracy_percent - a.accuracy_percent || b.votes_cast - a.votes_cast || a.display_name.localeCompare(b.display_name));
  return <section className="fan-board-card fan-board-dashboard" aria-labelledby="fan-leaderboard-title">
    <div className="fan-section-heading"><div><span>Season standings</span><h2 id="fan-leaderboard-title">Fan leaderboard</h2></div><p>Follow the fans driving the season, whether by showing up or calling the results.</p></div>
    <div className="fan-board-tabs" role="tablist" aria-label="Fan leaderboard category"><button type="button" role="tab" aria-selected={mode === "engaged"} className={mode === "engaged" ? "active" : ""} onClick={() => setMode("engaged")}><b>Most engaged</b><small>Most picks and votes</small></button><button type="button" role="tab" aria-selected={mode === "points"} className={mode === "points" ? "active" : ""} onClick={() => setMode("points")}><b>Most points</b><small>Correct match calls</small></button></div>
    {error && <p className="fan-message error" role="alert">{error}</p>}
    {loading ? <p className="fan-loading">Loading the fan standings…</p> : rankedFans.length ? <><div className="fan-board-columns"><span>Rank · fan</span><span>{mode === "engaged" ? "Activity" : "Accuracy"}</span><b>{mode === "engaged" ? "Votes" : "Points"}</b></div><ol>{rankedFans.map((row, index) => <li key={`${row.display_name}-${index}`}><b>{String(index + 1).padStart(2, "0")}</b><span>{row.display_name}<small>{row.match_entries} match entries · {row.potm_votes} player-of-match votes · {row.accuracy_percent}% winner accuracy</small></span><strong>{mode === "engaged" ? row.votes_cast : row.points}</strong></li>)}</ol><p className="fan-board-scoring">{mode === "engaged" ? "Engagement counts submitted winner calls, optional run-scorer and wicket-taker picks, and Fan Player of the Match votes." : "One point is awarded for each correct match-winner pick. Ties are settled by accuracy, then total activity."}</p></> : <div className="fan-board-empty"><b>{mode === "engaged" ? "The fan activity race starts here." : "The points race starts when results are recorded."}</b><span>{mode === "engaged" ? "Make match picks and vote for Fan Player of the Match to climb the Most Engaged board." : "Correct match-winner calls earn points after results are recorded."}</span><a href={fanPath()}>Make your first pick →</a></div>}
  </section>;
}

export function FanLeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<FanLeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { let active = true; fanRequest("/api/fan/leaderboard").then((body) => { if (active) setLeaderboard(body.leaderboard as FanLeaderboardRow[]); }).catch((reason: Error) => { if (active) setError(reason.message); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  return <main className="fan-page fan-standings-page"><header className="fan-hero"><div className="fan-hero-inner"><span>PHF Premier League · Season 5</span><h1>Fan Race</h1><p>Two ways to climb the standings: show up for every match, or make the calls that score.</p><div className="fan-page-actions"><a className="fan-button" href={fanPath()}>Make match picks</a><a className="fan-button secondary" href={fanAccountPath(fanLeaderboardPath())}>Fan account / Sign in</a></div></div></header><section className="fan-standings-content"><FanLeaderboardCard leaderboard={leaderboard} loading={loading} error={error}/><p className="fan-standings-privacy">Fan accounts appear automatically. Display names are public; phone numbers are never shown.</p></section></main>;
}

export function FanAccountPage() {
  const [fan, setFan] = useState<FanProfile | null>(null);
  const [loading, setLoading] = useState(() => typeof window !== "undefined" && Boolean(window.localStorage.getItem(tokenKey)));
  const [message, setMessage] = useState("");
  const defaultNext = fanPath();
  const nextRaw = new URLSearchParams(window.location.search).get("next") || defaultNext;
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : defaultNext;
  useEffect(() => { let active = true; const token = window.localStorage.getItem(tokenKey); if (token) fanRequest("/api/fan/me").then((body) => { if (active) setFan(body.fan as FanProfile); }).catch(() => { window.localStorage.removeItem(tokenKey); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  function signOut() { window.localStorage.removeItem(tokenKey); setFan(null); setMessage("You are signed out."); }
  return <main className="fan-page fan-account-page"><header className="fan-hero"><div className="fan-hero-inner"><span>PHF Premier League · Season 5</span><h1>Fan Account</h1><p>Sign in once to save picks across the tournament. Your display name appears on the fan leaderboard; your phone number stays private.</p><div className="fan-page-actions"><a className="fan-button secondary" href={fanPath()}>Back to match picks</a><a className="fan-button secondary" href={fanLeaderboardPath()}>View leaderboard</a></div></div></header><section className="fan-account-content">{loading ? <p className="fan-loading">Checking your account…</p> : fan ? <section className="fan-profile-card"><div className="fan-overline">Fan profile</div><h2>Welcome, {fan.display_name}.</h2><p>Your display name is listed on the public leaderboard. Your phone number is not shown.</p><div className="fan-page-actions"><a className="fan-button" href={next}>Continue</a><button type="button" className="fan-button secondary" onClick={signOut}>Sign out</button></div></section> : <>{message && <p className="fan-message success" role="status">{message}</p>}<FanAuth onAuth={(profile) => { setFan(profile); setMessage(`Welcome, ${profile.display_name}.`); }}/><p className="fan-account-next">After signing in, continue to <a href={next}>{next.includes("leaderboard") ? "the leaderboard" : "your match picks"} →</a></p></>}</section></main>;
}
