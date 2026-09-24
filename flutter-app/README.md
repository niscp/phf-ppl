# Auction Arena — Flutter migration

This is the shared Android/iOS Flutter source. It replaces the Kotlin/Compose client in `../android-app` as the development direction; the old debug APK remains a usable fallback until Flutter has been built and device-tested.

## Implemented source

- One codebase with home, searchable players, live bid/purse board, squads, and join-by-auction-ID.
- Same existing PHF auction API and three-second refresh cycle.
- Responsive Material UI with stadium-scoreboard colors; no WebView.
- Model test for the current server's string-formatted money values.

## Finish platform setup

Flutter could not download its Dart SDK in this environment because the SDK artifact host did not resolve. When it is reachable:

```sh
cd flutter-app
flutter create --platforms=android,ios --org com.auctionarena .
flutter pub get
flutter analyze
flutter test
flutter build apk --debug
```

The Android APK will be at `build/app/outputs/flutter-apk/app-debug.apk`. Building for iOS requires the full Xcode app, a macOS host, and Apple signing for device/App Store distribution; this machine currently has only Command Line Tools, not full Xcode.

## Product boundary

This is still a spectator MVP with PHF as the featured league, not a production multi-tenant competitor. Before opening it to other organizers, the server must be reworked for tenant isolation, organizer accounts, per-auction authorization, event/audit semantics, and robust real-time updates. Do not expose the present PHF database to unrelated leagues.
