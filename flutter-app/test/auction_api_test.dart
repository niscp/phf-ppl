import 'dart:convert';

import 'package:auction_arena/auction_api.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:test/test.dart';

void main() {
  test('loads featured auction with cache-safe headers', () async {
    late http.Request request;
    final api = AuctionApi(
      baseUrl: 'https://example.test/',
      client: MockClient((incoming) async {
        request = incoming;
        return http.Response(jsonEncode({'players': [], 'teams': []}), 200);
      }),
    );

    final result = await api.load();

    expect(request.method, 'GET');
    expect(request.url.toString(), 'https://example.test/api/auction');
    expect(request.headers['accept'], 'application/json');
    expect(request.headers['cache-control'], 'no-cache');
    expect(result.players, isEmpty);
  });

  test('loads selected auction using POST and trims its ID', () async {
    late http.Request request;
    final api = AuctionApi(
      baseUrl: 'https://example.test',
      client: MockClient((incoming) async {
        request = incoming;
        return http.Response('{}', 200);
      }),
    );

    await api.load(auctionId: '  auction-id  ');

    expect(request.method, 'POST');
    expect(request.url.path, '/api/auction/view');
    expect(jsonDecode(request.body), {'auctionId': 'auction-id'});
  });

  test('surfaces server error and retryability', () async {
    final api = AuctionApi(
        client: MockClient(
      (_) async =>
          http.Response(jsonEncode({'error': 'Auction not found'}), 404),
    ));

    try {
      await api.load();
      fail('Expected an AuctionApiException');
    } on AuctionApiException catch (error) {
      expect(error.message, 'Auction not found');
      expect(error.statusCode, 404);
      expect(error.isRetryable, isFalse);
    }
  });

  test('wraps invalid JSON in a safe domain error', () async {
    final api = AuctionApi(
        client: MockClient(
      (_) async => http.Response('<html>proxy error</html>', 200),
    ));

    expect(
      api.load(),
      throwsA(isA<AuctionApiException>().having((error) => error.message,
          'message', 'The auction service returned invalid data.')),
    );
  });

  test('resolves local images without changing remote images', () {
    final api = AuctionApi(
      baseUrl: 'https://example.test/root/',
      client: MockClient((_) async => http.Response('{}', 200)),
    );

    expect(
        api.imageUrl('/players/a.jpg'), 'https://example.test/players/a.jpg');
    expect(api.imageUrl('https://cdn.test/a.jpg'), 'https://cdn.test/a.jpg');
    expect(api.imageUrl('  '), isNull);
  });

  test('rejects requests after disposal but does not close injected client',
      () async {
    final api =
        AuctionApi(client: MockClient((_) async => http.Response('{}', 200)));
    api.dispose();
    api.dispose();

    expect(api.load(), throwsA(isA<AuctionApiException>()));
  });
}
