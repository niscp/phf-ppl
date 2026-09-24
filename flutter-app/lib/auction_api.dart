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
  final String baseUrl;
  bool _disposed = false;

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
      return AuctionSnapshot.fromJson(decoded);
    } on AuctionApiException {
      rethrow;
    } on TimeoutException catch (error) {
      throw AuctionApiException(
          'The auction service took too long to respond. Please try again.',
          cause: error);
    } on FormatException catch (error) {
      throw AuctionApiException('The auction service returned invalid data.',
          cause: error);
    } on http.ClientException catch (error) {
      throw AuctionApiException(
          'Unable to reach the auction service. Check your connection.',
          cause: error);
    }
  }

  Map<String, String> get _headers => const {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json',
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
