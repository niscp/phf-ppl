import assert from 'node:assert/strict';
import test from 'node:test';
import { undoLastBid } from '../server/instance-actions.mjs';

test('undo restores the immediately preceding bid and leading team', () => {
  const state = {
    players: [{ id: 'p1', current_bid: 1.4, current_bid_team_id: 'team-c' }],
    events: [
      { event_type: 'bid', player_id: 'p1', team_id: 'team-a', amount: 1 },
      { event_type: 'bid', player_id: 'p1', team_id: 'team-b', amount: 1.2 },
      { event_type: 'bid', player_id: 'p1', team_id: 'team-c', amount: 1.4 },
    ],
  };

  undoLastBid(state, { status: 'live', current_player_id: 'p1' });

  assert.equal(state.players[0].current_bid, 1.2);
  assert.equal(state.players[0].current_bid_team_id, 'team-b');
  assert.equal(state.events.filter((event) => event.event_type === 'bid').length, 2);
  assert.equal(state.events.at(-1).event_type, 'bid_undone');
});

test('repeated undo reaches the opening state one bid at a time', () => {
  const state = {
    players: [{ id: 'p1', current_bid: 1.2, current_bid_team_id: 'team-b' }],
    events: [
      { event_type: 'bid', player_id: 'p1', team_id: 'team-a', amount: 1 },
      { event_type: 'bid', player_id: 'p1', team_id: 'team-b', amount: 1.2 },
    ],
  };
  const config = { status: 'live', current_player_id: 'p1' };

  undoLastBid(state, config);
  undoLastBid(state, config);

  assert.equal(state.players[0].current_bid, null);
  assert.equal(state.players[0].current_bid_team_id, null);
  assert.equal(state.events.filter((event) => event.event_type === 'bid').length, 0);
});
