class AuctionSnapshot {
  const AuctionSnapshot({
    required this.auction,
    required this.config,
    required this.teams,
    required this.players,
    required this.events,
  });

  final AuctionInfo? auction;
  final AuctionConfig? config;
  final List<AuctionTeam> teams;
  final List<AuctionPlayer> players;
  final List<AuctionEvent> events;

  factory AuctionSnapshot.fromJson(Map<String, dynamic> json) =>
      AuctionSnapshot(
        auction: json['auction'] is Map<String, dynamic>
            ? AuctionInfo.fromJson(json['auction'] as Map<String, dynamic>)
            : null,
        config: json['config'] is Map<String, dynamic>
            ? AuctionConfig.fromJson(json['config'] as Map<String, dynamic>)
            : null,
        teams: (json['teams'] as List<dynamic>? ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(AuctionTeam.fromJson)
            .toList(),
        players: (json['players'] as List<dynamic>? ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(AuctionPlayer.fromJson)
            .toList(),
        events: (json['events'] as List<dynamic>? ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(AuctionEvent.fromJson)
            .toList(),
      );

  AuctionPlayer? get currentPlayer {
    final id = config?.currentPlayerId;
    if (id != null) {
      for (final player in players) {
        if (player.id == id) return player;
      }
    }
    for (final player in players) {
      if (player.status == 'up') return player;
    }
    return null;
  }

  AuctionTeam? teamById(String? id) {
    for (final team in teams) {
      if (team.id == id) return team;
    }
    return null;
  }
}

class AuctionInfo {
  const AuctionInfo(this.id, this.name, this.kind);
  final String id;
  final String name;
  final String kind;
  factory AuctionInfo.fromJson(Map<String, dynamic> json) => AuctionInfo(
        '${json['id'] ?? ''}',
        '${json['name'] ?? 'Live auction'}',
        '${json['kind'] ?? 'official'}',
      );
}

class AuctionConfig {
  const AuctionConfig(
      this.status, this.currentPlayerId, this.maxSquadSize, this.moneyLabel,
      {this.minSquadSize = 14,
      this.minimumIncrement = 0,
      this.incrementThreshold = 0,
      this.incrementAboveThreshold = 0,
      this.defaultBasePrice = 0});
  final String status;
  final String? currentPlayerId;
  final int maxSquadSize;
  final String moneyLabel;
  final int minSquadSize;
  final double minimumIncrement;
  final double incrementThreshold;
  final double incrementAboveThreshold;
  final double defaultBasePrice;
  factory AuctionConfig.fromJson(Map<String, dynamic> json) => AuctionConfig(
        '${json['status'] ?? 'preparing'}',
        json['current_player_id']?.toString(),
        (json['max_squad_size'] as num?)?.toInt() ?? 14,
        '${json['money_label'] ?? 'INR'}',
        minSquadSize: integer(json['min_squad_size'], fallback: 14),
        minimumIncrement: amount(json['minimum_increment']),
        incrementThreshold: amount(json['increment_threshold']),
        incrementAboveThreshold: amount(json['increment_above_threshold']),
        defaultBasePrice: amount(json['default_base_price']),
      );
}

double amount(dynamic value) => switch (value) {
      num n => n.toDouble(),
      String s => double.tryParse(s.trim().replaceAll(',', '')) ?? 0,
      _ => 0,
    };

int integer(dynamic value, {int fallback = 0}) => switch (value) {
      num n => n.toInt(),
      String s => int.tryParse(s.trim()) ?? fallback,
      _ => fallback,
    };

class AuctionTeam {
  const AuctionTeam(this.id, this.name, this.logoUrl, this.purse, this.spent);
  final String id;
  final String name;
  final String? logoUrl;
  final double purse;
  final double spent;
  double get remaining => purse - spent;
  factory AuctionTeam.fromJson(Map<String, dynamic> json) => AuctionTeam(
        '${json['id'] ?? ''}',
        '${json['name'] ?? ''}',
        json['logo_url']?.toString(),
        amount(json['purse']),
        amount(json['spent']),
      );
}

class AuctionPlayer {
  const AuctionPlayer(this.id, this.name, this.role, this.photo, this.status,
      this.teamId, this.currentBidTeamId, this.basePrice, this.currentBid,
      {this.soldPrice = 0});
  final String id;
  final String name;
  final String role;
  final String? photo;
  final String status;
  final String? teamId;
  final String? currentBidTeamId;
  final double basePrice;
  final double currentBid;
  final double soldPrice;
  factory AuctionPlayer.fromJson(Map<String, dynamic> json) => AuctionPlayer(
        '${json['id'] ?? ''}',
        '${json['name'] ?? ''}',
        '${json['role'] ?? 'Player'}',
        json['photo']?.toString(),
        '${json['status'] ?? 'queued'}',
        json['team_id']?.toString(),
        json['current_bid_team_id']?.toString(),
        amount(json['base_price']),
        amount(json['current_bid']),
        soldPrice: amount(json['sold_price']),
      );
}

class AuctionEvent {
  const AuctionEvent(
      this.id, this.eventType, this.playerId, this.teamId, this.value);
  final String id;
  final String eventType;
  final String playerId;
  final String? teamId;
  final double value;
  factory AuctionEvent.fromJson(Map<String, dynamic> json) => AuctionEvent(
        '${json['id'] ?? ''}',
        '${json['event_type'] ?? ''}',
        '${json['player_id'] ?? ''}',
        json['team_id']?.toString(),
        amount(json['amount']),
      );
}

class AuctionInstance {
  const AuctionInstance(this.id, this.name, this.kind, this.status, this.active,
      this.archived, this.playerCount);
  final String id;
  final String name;
  final String kind;
  final String status;
  final bool active;
  final bool archived;
  final int playerCount;
  factory AuctionInstance.fromJson(Map<String, dynamic> json) =>
      AuctionInstance(
        '${json['id'] ?? ''}',
        '${json['name'] ?? 'Auction'}',
        '${json['kind'] ?? 'demo'}',
        '${json['status'] ?? 'preparing'}',
        json['active'] == true,
        json['archived'] == true,
        integer(json['player_count']),
      );
}
