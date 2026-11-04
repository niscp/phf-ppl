type MatchRulesProps = { variant: "fixtures" | "match" };

const delayRows = [
  ["0–5 minutes", "Grace period · no reduction"],
  ["6–10 minutes", "1 over per side"],
  ["11–15 minutes", "2 overs per side"],
  ["16–20 minutes", "3 overs per side"],
  ["21–25 minutes", "4 overs per side"],
  ["Beyond 25 minutes", "Walkover"],
];

const firstInningsRows = [
  ["Within 90 minutes (85 + 5 grace)", "20 overs · no reduction"],
  ["91–95 minutes", "19 overs"],
  ["96–100 minutes", "18 overs"],
  ["101–105 minutes", "17 overs"],
  ["Every additional 5 minutes or part", "Reduce by 1 more over"],
];

const secondInningsRows = [
  ["91–95 minutes", "+5 runs"],
  ["96–100 minutes", "+10 runs"],
  ["101–105 minutes", "+15 runs"],
  ["106–110 minutes", "+20 runs"],
  ["Every additional 5 minutes or part", "+5 more runs"],
];

function RulesTable({ title, rows, resultLabel }: { title: string; rows: string[][]; resultLabel: string }) {
  return <div className="match-rules-table-wrap" role="region" aria-label={title} tabIndex={0}>
    <table className="match-rules-table"><caption>{title}</caption><thead><tr><th scope="col">Time taken</th><th scope="col">{resultLabel}</th></tr></thead><tbody>{rows.map(([time, result]) => <tr key={time}><th scope="row">{time}</th><td>{result}</td></tr>)}</tbody></table>
  </div>;
}

export default function MatchRules({ variant }: MatchRulesProps) {
  const isMatch = variant === "match";
  return <section className={`phf-match-rules phf-match-rules--${variant}`} aria-labelledby={`phf-rules-title-${variant}`}>
    <div className="phf-match-rules-intro">
      <div className="phf-match-rules-heading"><span>Important match notice</span><h2 id={`phf-rules-title-${variant}`}>{isMatch ? <>The clock can<br/>change the game.</> : <>Every minute<br/>matters.</>}</h2></div>
      <div className="phf-match-rules-facts" aria-label="Match timing at a glance">
        <div><strong>20</strong><span>overs per side</span></div>
        <div><strong>85 min</strong><span>per innings · 5 min grace</span></div>
        <div><strong>10 min</strong><span>innings break</span></div>
        <div><strong>15 min</strong><span>before start · for toss</span></div>
      </div>
      <p>Teams should be ready before the scheduled start. Delays and slow over-rates can reduce overs or add penalty runs.</p>
    </div>
    <details className="phf-match-rules-details" open={isMatch}>
      <summary><span>{isMatch ? "Read all timing and penalty rules" : "See all timing, over-reduction and penalty rules"}</span><b aria-hidden="true" /></summary>
      <div className="phf-match-rules-content">
        <section className="phf-rule-section">
          <header><span>01</span><div><h3>Delayed match start</h3><p>When a team is not ready at the scheduled start, the delay can reduce overs for both sides.</p></div></header>
          <RulesTable title="Delay beyond scheduled start" rows={delayRows} resultLabel="Penalty" />
        </section>
        <section className="phf-rule-section">
          <header><span>02</span><div><h3>Slow over-rate · first innings</h3><p>Complete the innings within 85 minutes, with a 5-minute grace period. After 90 minutes, the batting side loses an over for each additional 5 minutes or part.</p></div></header>
          <RulesTable title="First innings over-rate" rows={firstInningsRows} resultLabel="Overs available to bat" />
          <ul className="phf-rule-notes"><li>The first innings continues to completion unless umpires officially curtail play.</li><li>The team batting second chases the existing target in its reduced number of overs. The target changes only if an official interruption requires recalculation under the tournament method.</li></ul>
        </section>
        <section className="phf-rule-section">
          <header><span>03</span><div><h3>Slow over-rate · second innings</h3><p>If the bowling side exceeds 90 minutes, penalty runs are added to the batting side’s total.</p></div></header>
          <RulesTable title="Second innings over-rate" rows={secondInningsRows} resultLabel="Runs added to batting team" />
          <ul className="phf-rule-notes"><li>Penalty runs count towards the chase. If they take the batting side to or beyond the target, that side is declared the winner.</li></ul>
        </section>
        <section className="phf-rule-section phf-rule-conditions">
          <header><span>04</span><div><h3>Conditions and decisions</h3><p>Umpires manage the match clock and determine approved interruptions.</p></div></header>
          <ul className="phf-rule-notes"><li>Umpires are the official timekeepers and will give time reminders during each innings.</li><li>Time lost to injuries, ball replacement, weather, or other genuine interruptions may be excluded at the umpires’ discretion. Penalties use the adjusted deadline after approved interruptions.</li><li>Unnecessary delays, excessive field changes, prolonged discussions, and deliberate time-wasting are not permitted.</li><li>Refer disputes to the Organizing Committee. Its decision is final.</li></ul>
        </section>
        <p className="phf-rule-footer">Captains: have your team ready on time, maintain a healthy over-rate, and respect the schedule.</p>
      </div>
    </details>
  </section>;
}
