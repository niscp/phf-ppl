import 'dart:async';
import 'dart:math';

import 'auction_api.dart';
import 'models.dart';

/// Browser-safe fallback used by previews. Native apps use the WebSocket-backed
/// implementation exported by [auction_live_feed.dart].
class AuctionLiveFeed {
  AuctionLiveFeed({
    required this.api,
    this.auctionId,
    this.pollInterval = const Duration(seconds: 5),
  });

  final AuctionApi api;
  final String? auctionId;
  final Duration pollInterval;
  final _snapshots = StreamController<AuctionSnapshot>.broadcast();
  Timer? _timer;
  bool _paused = false;
  bool _disposed = false;
  bool _loading = false;
  int _failures = 0;

  Stream<AuctionSnapshot> get snapshots => _snapshots.stream;
  bool get isPaused => _paused;

  void start() {
    if (_disposed) throw StateError('AuctionLiveFeed has been disposed.');
    _paused = false;
    unawaited(refresh());
  }

  void resume() => start();

  void pause() {
    _paused = true;
    _timer?.cancel();
  }

  Future<void> refresh() async {
    if (_disposed || _paused || _loading) return;
    _loading = true;
    try {
      _snapshots.add(await api.load(auctionId: auctionId));
      _failures = 0;
    } catch (error, stack) {
      _failures++;
      _snapshots.addError(error, stack);
    } finally {
      _loading = false;
      if (!_disposed && !_paused) {
        final delay = _failures == 0
            ? pollInterval
            : Duration(seconds: min(30, 2 << min(_failures - 1, 3)));
        _timer?.cancel();
        _timer = Timer(delay, () => unawaited(refresh()));
      }
    }
  }

  Future<void> dispose() async {
    if (_disposed) return;
    _disposed = true;
    _timer?.cancel();
    await _snapshots.close();
  }
}
