# Android release setup

The permanent Android application ID is `com.dwemory.auctionarena`, the store-facing name is **Auction Arena**, and the version is managed by `version` in `pubspec.yaml`.

## One-time upload key setup

Never commit a keystore, passwords, or `android/key.properties`.

1. Create a private directory and upload key:

   ```sh
   mkdir -p android/keystores
   keytool -genkeypair -v \
     -keystore android/keystores/auction-arena-upload.jks \
     -keyalg RSA -keysize 2048 -validity 10000 \
     -alias upload
   ```

2. Copy `android/key.properties.example` to `android/key.properties` and replace the password placeholders.
3. Back up the keystore and passwords in a secure password manager. Losing the upload key complicates future releases.

Release builds intentionally fail when `key.properties` is absent; they never silently use the debug key.

## Validation and build

From `flutter-app`:

```sh
flutter pub get
flutter analyze
flutter test
flutter build appbundle --release
```

The Play Store bundle is written to `build/app/outputs/bundle/release/app-release.aab`.

Before each upload, increment the build number after `+` in `pubspec.yaml`. Use semantic versions such as `1.0.1+2` for the user-visible release number and monotonically increasing Play Store build code.
