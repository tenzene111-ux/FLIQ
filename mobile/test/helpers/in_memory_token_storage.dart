import 'package:fliq_mobile/core/storage/token_storage.dart';

/// Test-only stand-in for SecureTokenStorage — `flutter test` has no
/// platform channels, so the real FlutterSecureStorage can't run here.
class InMemoryTokenStorage implements TokenStorage {
  String? _accessToken;
  String? _refreshToken;

  @override
  Future<void> saveTokens({required String accessToken, required String refreshToken}) async {
    _accessToken = accessToken;
    _refreshToken = refreshToken;
  }

  @override
  Future<String?> readAccessToken() async => _accessToken;

  @override
  Future<String?> readRefreshToken() async => _refreshToken;

  @override
  Future<void> clear() async {
    _accessToken = null;
    _refreshToken = null;
  }
}
