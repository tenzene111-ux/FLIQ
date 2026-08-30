import '../networking/api_client.dart';
import '../storage/token_storage.dart';
import 'fliq_user.dart';

/// Talks to the backend's /auth endpoints and keeps TokenStorage in sync.
/// This is the one place that knows the register/login/logout request and
/// response shapes — screens and AuthState never touch ApiClient directly.
class AuthRepository {
  AuthRepository({required this.apiClient, required this.tokenStorage});

  final ApiClient apiClient;
  final TokenStorage tokenStorage;

  Future<FliqUser> register({
    required String email,
    required String password,
    required String username,
    required String displayName,
  }) async {
    final result = await apiClient.post('/auth/register', body: {
      'email': email,
      'password': password,
      'username': username,
      'displayName': displayName,
    });
    return _saveSessionAndReturnUser(result);
  }

  Future<FliqUser> login({required String email, required String password}) async {
    final result = await apiClient.post('/auth/login', body: {
      'email': email,
      'password': password,
    });
    return _saveSessionAndReturnUser(result);
  }

  /// Returns null (rather than throwing) if there's no stored session or
  /// it's no longer valid — callers treat that as "show the login screen."
  Future<FliqUser?> fetchCurrentUser() async {
    final accessToken = await tokenStorage.readAccessToken();
    if (accessToken == null) return null;
    try {
      final result = await apiClient.get('/auth/me', auth: true);
      return FliqUser.fromJson(result);
    } catch (_) {
      return null;
    }
  }

  Future<void> logout() async {
    final refreshToken = await tokenStorage.readRefreshToken();
    if (refreshToken != null) {
      try {
        await apiClient.post('/auth/logout', body: {'refreshToken': refreshToken});
      } catch (_) {
        // Best-effort — the end state (no local session) is what matters.
      }
    }
    await tokenStorage.clear();
  }

  Future<FliqUser> _saveSessionAndReturnUser(Map<String, dynamic> result) async {
    await tokenStorage.saveTokens(
      accessToken: result['accessToken'] as String,
      refreshToken: result['refreshToken'] as String,
    );
    return FliqUser.fromJson(result['user'] as Map<String, dynamic>);
  }
}
