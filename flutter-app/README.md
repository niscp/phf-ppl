# Auction Arena

Auction Arena is the native Flutter companion for the PHF Premier League auction platform. The same codebase targets Android and iOS and connects to `https://phfppl.dwemory.com` by default.

## Included

- Cinematic cricket-auction home, player pool, live bidding board and team squads.
- Searchable player list with photos, roles, batting and bowling statistics.
- Join any published auction using its auction ID.
- Live WebSocket invalidation on Android/iOS with resilient polling fallback and lifecycle pause/resume.
- Clear loading, empty, offline and retry states.
- Release identity `com.dwemory.auctionarena`, private signing and automated signed AAB/APK builds.

## Validate locally

```sh
flutter pub get
flutter analyze
dart test
flutter build appbundle --release
```

Override the server at build time when required:

```sh
flutter build appbundle --release \
  --dart-define=AUCTION_API_BASE_URL=https://your-auction.example.com
```

## Releases

GitHub Actions runs analysis, unit tests, signed AAB and signed APK builds. The Play Store bundle is the `.aab`; the `.apk` is for direct internal testing. Follow [android/RELEASE.md](android/RELEASE.md) for versioning, signing backup and publication.

The current backend is operated for PHF. Before selling the platform to unrelated organizers, finish organizer self-service, tenant isolation, billing, per-auction authorization and a formal audit/event history.
