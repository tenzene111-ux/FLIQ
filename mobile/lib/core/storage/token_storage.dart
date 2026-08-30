import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Where access/refresh tokens live. Abstracted so tests can swap in an
/// in-memory fake instead of touching the platform's real secure storage
/// (which isn't available under `flutter test`).
abstract class TokenStorage {
  Future<void> saveTokens({required String accessToken, required String refreshToken});
  Future<String?> readAccessToken();
  Future<String?> readRefreshToken();
  Future<void> clear();
}

class SecureTokenStorage implements TokenStorage {
  SecureTokenStorage({FlutterSecureStorage? storage}) : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  static const _accessKey = 'fliq_access_token';
  static const _refreshKey = 'fliq_refresh_token';

  @override
  Future<void> saveTokens({required String accessToken, required String refreshToken}) async {
    await _storage.write(key: _accessKey, value: accessToken);
    await _storage.write(key: _refreshKey, value: refreshToken);
  }

  @override
  Future<String?> readAccessToken() => _storage.read(key: _accessKey);

  @override
  Future<String?> readRefreshToken() => _storage.read(key: _refreshKey);

  @override
  Future<void> clear() async {
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
  }
}
