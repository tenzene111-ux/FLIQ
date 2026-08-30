/// Central place for build-time configuration.
///
/// Override at build/run time with:
///   flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000
/// (Android emulator can't reach the host machine via "localhost" — it
/// needs 10.0.2.2. iOS simulator, web, and desktop can use localhost.)
class AppConfig {
  AppConfig._();

  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:4000',
  );
}
