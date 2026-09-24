import 'dart:async';
import 'dart:io';
import 'dart:math';

import 'auction_api.dart';
import 'models.dart';

/// Keeps a native mobile auction screen current.
///
/// The production server sends lightweight invalidation messages on `/ws`.
/// A message triggers a fresh authoritative HTTP snapshot. Polling remains as a
/// fallback for proxies and networks that block WebSockets.
class AuctionLiveFeed {
  AuctionLiveFeed({
    required this.api,
    this.auctionId,
    this.pollInterval = const Duration(seconds: 15),
    this.webSocketConnector = WebSocket.connect,
  });

  final AuctionApi api;
  final String? auctionId;
  final Duration pollInterval;
  final Future<WebSocket> Function(String url) webSocketConnector;

  final _snapshots = StreamController<AuctionSnapshot>.broadcast();
  Timer? _pollTimer;
  Timer? _reconnectTimer;
  WebSocket? _socket;
  bool _started = false;
  bool _paused = false;
  bool _disposed = false;
  bool _loading = false;
  int _failedLoads = 0;
  int _failedSockets = 0;

  Stream<AuctionSnapshot> get snapshots => _snapshots.stream;
  bool get isPaused => _paused;

  void start() {
    if (_disposed) throw StateError('AuctionLiveFeed has been disposed.');
    if (_started) return;
    _started = true;
    unawaited(refresh());
    _connectSocket();
    _schedulePoll(pollInterval);
  }

  /// Call when the app returns to the foreground.
  void resume() {
    if (_disposed) return;
    _paused = false;
    if (!_started) return start();
    unawaited(refresh());
    _connectSocket();
    _schedulePoll(pollInterval);
  }

  /// Call when the app is backgrounded to avoid unnecessary radio use.
  void pause() {
    _paused = true;
    _pollTimer?.cancel();
    _reconnectTimer?.cancel();
    unawaited(_closeSocket());
  }

  Future<void> refresh() async {
    if (_disposed || _paused || _loading) return;
    _loading = true;
    try {
      final value = await api.load(auctionId: auctionId);
      _failedLoads = 0;
      if (!_disposed && !_paused) _snapshots.add(value);
    } catch (error, stack) {
      _failedLoads++;
      if (!_disposed && !_paused) _snapshots.addError(error, stack);
    } finally {
      _loading = false;
      if (!_disposed && !_paused) {
        _schedulePoll(_failedLoads == 0 ? pollInterval : _loadBackoff());
      }
    }
  }

  Duration _loadBackoff() {
    final seconds = min(30, 2 * pow(2, min(_failedLoads - 1, 4)).toInt());
    return Duration(seconds: seconds);
  }

  void _schedulePoll(Duration delay) {
    _pollTimer?.cancel();
    if (_disposed || _paused) return;
    _pollTimer = Timer(delay, () => unawaited(refresh()));
  }

  Uri get _webSocketUri {
    final base = Uri.parse(api.baseUrl);
    return base.replace(
      scheme: base.scheme == 'https' ? 'wss' : 'ws',
      path: '/ws',
      query: null,
      fragment: null,
    );
  }

  void _connectSocket() {
    if (_disposed || _paused || _socket != null) return;
    webSocketConnector(_webSocketUri.toString()).then((socket) {
      if (_disposed || _paused) {
        return socket.close();
      }
      _socket = socket;
      _failedSockets = 0;
      socket.listen(
        (_) => unawaited(refresh()),
        onError: (_) => _socketEnded(socket),
        onDone: () => _socketEnded(socket),
        cancelOnError: true,
      );
    }).catchError((Object _) {
      _failedSockets++;
      _scheduleReconnect();
    });
  }

  void _socketEnded(WebSocket socket) {
    if (identical(_socket, socket)) _socket = null;
    _failedSockets++;
    _scheduleReconnect();
  }

  void _scheduleReconnect() {
    _reconnectTimer?.cancel();
    if (_disposed || _paused) return;
    final seconds = min(30, pow(2, min(_failedSockets, 5)).toInt());
    _reconnectTimer = Timer(Duration(seconds: seconds), _connectSocket);
  }

  Future<void> _closeSocket() async {
    final socket = _socket;
    _socket = null;
    await socket?.close(WebSocketStatus.goingAway);
  }

  Future<void> dispose() async {
    if (_disposed) return;
    _disposed = true;
    _pollTimer?.cancel();
    _reconnectTimer?.cancel();
    await _closeSocket();
    await _snapshots.close();
  }
}
