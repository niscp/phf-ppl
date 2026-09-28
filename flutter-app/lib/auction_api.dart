import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'models.dart';

class AuctionApiException implements Exception {
  const AuctionApiException(this.message, {this.statusCode, this.cause});
  final String message;
  final int? statusCode;
  final Object? cause;
  bool get isRetryable =>
      statusCode == null ||
      statusCode == 408 ||
      statusCode == 429 ||
      (statusCode! >= 500 && statusCode! < 600);
  @override
  String toString() => message;
}

class AuctionApi {
  static final Map<String, String> _snapshotCache = {};
  static const defaultBaseUrl = String.fromEnvironment(
    'AUCTION_API_BASE_URL',
    defaultValue: 'https://phfppl.dwemory.com',
  );

  AuctionApi(
      {http.Client? client,
      String baseUrl = defaultBaseUrl,
      this.requestTimeout = const Duration(seconds: 12)})
      : _client = client ?? http.Client(),
        _ownsClient = client == null,
        baseUrl = baseUrl.replaceFirst(RegExp(r'/+$'), '');

  final http.Client _client;
  final bool _ownsClient;
  final Duration requestTimeout;
  String baseUrl;
  bool _disposed = false;
  String? _accessToken;
  bool usingCachedData = false;
  DateTime? lastSuccessfulSync;
  bool localHub = false;
  int pendingSync = 0;
  String? syncError;

  bool get isSignedIn => _accessToken != null;

  Future<void> restoreServer() async {
    // The selected venue hub remains active for this complete app session.
  }

  Future<void> setServer(String value) async {
    final cleaned = _cleanServer(value);
    final uri = Uri.tryParse(cleaned);
    if (uri == null ||
        !uri.hasScheme ||
        !uri.hasAuthority ||
        !const ['http', 'https'].contains(uri.scheme)) {
      throw const AuctionApiException(
          'Enter a complete http:// or https:// server address.');
    }
    baseUrl = cleaned;
    _accessToken = null;
  }

  Future<void> useCloudServer() => setServer(defaultBaseUrl);

  String projectorUrl(String? auctionId) =>
      '$baseUrl/auction.html${auctionId == null || auctionId.isEmpty ? '' : '?auction=${Uri.encodeQueryComponent(auctionId)}'}';

  String resultsUrl(String auctionId) =>
      '$baseUrl/teams.html?auction=${Uri.encodeQueryComponent(auctionId)}';

  static String _cleanServer(String value) =>
      value.trim().replaceFirst(RegExp(r'/+$'), '');

  Future<void> signIn(String username, String password) async {
    final body = await _requestJson('/api/auth/login',
        method: 'POST', body: {'username': username, 'password': password});
    final token = body['token']?.toString();
    if (token == null || token.isEmpty) {
      throw const AuctionApiException(
          'The server did not return a login token.');
    }
    _accessToken = token;
    final me = await _requestJson('/api/auth/me');
    if (me['admin'] != true) {
      _accessToken = null;
      throw const AuctionApiException(
          'This account does not have auctioneer access.',
          statusCode: 403);
    }
  }

  void signOut() => _accessToken = null;

  Future<List<AuctionInstance>> listAuctions() async {
    final body = await _requestJson('/api/admin/auctions');
    return (body['auctions'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(AuctionInstance.fromJson)
        .toList();
  }

  Future<dynamic> action(String name,
      [Map<String, dynamic> args = const {}, String? auctionId]) async {
    final response = await _requestJson('/api/admin/action',
        method: 'POST',
        body: {
          'name': name,
          'args': args,
          if (auctionId != null) 'auctionId': auctionId
        });
    return response['data'];
  }

  Future<Map<String, dynamic>> _requestJson(String path,
      {String method = 'GET', Map<String, dynamic>? body}) async {
    final uri = Uri.parse('$baseUrl$path');
    try {
      final response = method == 'POST'
          ? await _client
              .post(uri, headers: _headers, body: jsonEncode(body ?? const {}))
              .timeout(requestTimeout)
          : await _client.get(uri, headers: _headers).timeout(requestTimeout);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AuctionApiException(
            _errorMessage(response) ??
                'Request failed (${response.statusCode}).',
            statusCode: response.statusCode);
      }
      final decoded = jsonDecode(utf8.decode(response.bodyBytes));
      if (decoded is! Map<String, dynamic>) {
        throw const AuctionApiException('The server returned invalid data.');
      }
      return decoded;
    } on AuctionApiException {
      rethrow;
    } on TimeoutException catch (error) {
      throw AuctionApiException('The server took too long to respond.',
          cause: error);
    } on http.ClientException catch (error) {
      throw AuctionApiException('Unable to reach the auction service.',
          cause: error);
    }
  }

  Future<AuctionSnapshot> load({String? auctionId}) async {
    if (_disposed) {
      throw const AuctionApiException(
          'The auction connection has been closed.');
    }
    final id = auctionId?.trim();
    if (id != null && id.isEmpty) {
      throw const AuctionApiException('Enter a valid auction ID.',
          statusCode: 400);
    }
    final uri = Uri.parse('$baseUrl/api/auction${id == null ? '' : '/view'}');
    try {
      final response = id == null
          ? await _client.get(uri, headers: _headers).timeout(requestTimeout)
          : await _client
              .post(uri, headers: _headers, body: jsonEncode({'auctionId': id}))
              .timeout(requestTimeout);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AuctionApiException(
          _errorMessage(response) ??
              'Auction data is unavailable (${response.statusCode}).',
          statusCode: response.statusCode,
        );
      }
      final decoded = jsonDecode(utf8.decode(response.bodyBytes));
      if (decoded is! Map<String, dynamic>) {
        throw const AuctionApiException(
            'The auction service returned invalid data.');
      }
      _snapshotCache[id ?? 'featured'] = jsonEncode(decoded);
      usingCachedData = false;
      lastSuccessfulSync = DateTime.now();
      await _refreshSyncStatus();
      return AuctionSnapshot.fromJson(decoded);
    } on AuctionApiException {
      rethrow;
    } on TimeoutException catch (error) {
      return _cachedSnapshot(id, error);
    } on FormatException catch (error) {
      throw AuctionApiException('The auction service returned invalid data.',
          cause: error);
    } on http.ClientException catch (error) {
      return _cachedSnapshot(id, error);
    }
  }

  Future<AuctionSnapshot> _cachedSnapshot(
      String? auctionId, Object cause) async {
    final raw = _snapshotCache[auctionId ?? 'featured'];
    if (raw == null) {
      throw AuctionApiException(
          'The auction server is unreachable and no offline copy is stored yet.',
          cause: cause);
    }
    final decoded = jsonDecode(raw);
    if (decoded is! Map<String, dynamic>) {
      throw AuctionApiException('The stored offline auction copy is invalid.',
          cause: cause);
    }
    usingCachedData = true;
    return AuctionSnapshot.fromJson(decoded);
  }

  Future<void> _refreshSyncStatus() async {
    try {
      final status = await _requestJson('/api/sync/status');
      localHub = status['localHub'] == true;
      pendingSync = integer(status['pending']);
      syncError = status['lastError']?.toString();
    } catch (_) {
      // Loading the authoritative auction state must not fail only because the
      // optional cloud-mirror status endpoint is temporarily unavailable.
    }
  }

  Map<String, String> get _headers => {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json',
        if (_accessToken != null) 'Authorization': 'Bearer $_accessToken',
      };

  String? _errorMessage(http.Response response) {
    try {
      final body = jsonDecode(utf8.decode(response.bodyBytes));
      if (body is Map && body['error'] is String) {
        final message = (body['error'] as String).trim();
        return message.isEmpty ? null : message;
      }
    } catch (_) {}
    return null;
  }

  String? imageUrl(String? path) {
    final value = path?.trim();
    if (value == null || value.isEmpty) return null;
    final uri = Uri.tryParse(value);
    if (uri != null && (uri.scheme == 'http' || uri.scheme == 'https')) {
      return value;
    }
    return Uri.parse('$baseUrl/')
        .resolve(value.startsWith('/') ? value : '/$value')
        .toString();
  }

  void dispose() {
    if (_disposed) return;
    _disposed = true;
    if (_ownsClient) _client.close();
  }
}
