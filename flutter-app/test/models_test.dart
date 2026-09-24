import 'package:auction_arena/models.dart';
import 'package:test/test.dart';

void main() {
  test('parses the live PHF auction response and string money values', () {
    final snapshot = AuctionSnapshot.fromJson({
      'auction': {'id': 'a', 'name': 'Demo', 'kind': 'demo'},
      'config': {
        'status': 'live',
        'current_player_id': 'p1',
        'money_label': 'INR'
      },
      'teams': [
        {'id': 't1', 'name': 'Blasterz', 'purse': '500', 'spent': '40'},
      ],
      'players': [
        {
          'id': 'p1',
          'name': 'Madhav Jain',
          'role': 'All Rounder',
          'status': 'up',
          'current_bid': '30'
        },
      ],
      'events': [],
    });

    expect(snapshot.auction?.name, 'Demo');
    expect(snapshot.currentPlayer?.name, 'Madhav Jain');
    expect(snapshot.teams.single.remaining, 460);
    expect(snapshot.players.single.currentBid, 30);
  });

  test('configured player takes precedence over stale up status', () {
    final snapshot = AuctionSnapshot.fromJson({
      'config': {'current_player_id': 'current'},
      'players': [
        {'id': 'stale', 'name': 'Stale', 'status': 'up'},
        {'id': 'current', 'name': 'Current', 'status': 'queued'},
      ],
    });

    expect(snapshot.currentPlayer?.id, 'current');
  });

  test('parses complete rules, sold price and formatted amounts', () {
    final snapshot = AuctionSnapshot.fromJson({
      'config': {
        'min_squad_size': '14',
        'max_squad_size': 15,
        'minimum_increment': '0.20',
        'increment_threshold': 5,
        'increment_above_threshold': 0.5,
        'default_base_price': '1',
      },
      'teams': [
        {'id': 't', 'purse': '2,800', 'spent': 100},
      ],
      'players': [
        {'id': 'p', 'sold_price': '5.50'},
      ],
    });

    expect(snapshot.config?.minSquadSize, 14);
    expect(snapshot.config?.maxSquadSize, 15);
    expect(snapshot.config?.minimumIncrement, .2);
    expect(snapshot.config?.incrementThreshold, 5);
    expect(snapshot.config?.incrementAboveThreshold, .5);
    expect(snapshot.config?.defaultBasePrice, 1);
    expect(snapshot.teams.single.remaining, 2700);
    expect(snapshot.players.single.soldPrice, 5.5);
  });

  test('uses safe defaults for missing and malformed values', () {
    final snapshot = AuctionSnapshot.fromJson({
      'config': {'min_squad_size': 'not-a-number'},
      'teams': [
        null,
        'bad',
        {'id': 2, 'purse': false}
      ],
      'players': const [],
    });

    expect(snapshot.config?.minSquadSize, 14);
    expect(snapshot.teams, hasLength(1));
    expect(snapshot.teams.single.id, '2');
    expect(snapshot.teams.single.purse, 0);
    expect(snapshot.currentPlayer, isNull);
  });
}
