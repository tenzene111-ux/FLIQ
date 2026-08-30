// One-off manual verification: exercises the app's own AuthRepository /
// ApiClient against the real running backend (not a mock). Not part of the
// test suite — run manually with `dart run tool/verify_backend_integration.dart`
// while the backend is up.
import 'dart:math';

import 'package:fliq_mobile/core/auth/auth_repository.dart';
import 'package:fliq_mobile/core/networking/api_client.dart';
import 'package:fliq_mobile/core/storage/token_storage.dart';

class MemoryTokenStorage implements TokenStorage {
  String? _access;
  String? _refresh;

  @override
  Future<void> saveTokens({required String accessToken, required String refreshToken}) async {
    _access = accessToken;
    _refresh = refreshToken;
  }

  @override
  Future<String?> readAccessToken() async => _access;

  @override
  Future<String?> readRefreshToken() async => _refresh;

  @override
  Future<void> clear() async {
    _access = null;
    _refresh = null;
  }
}

Future<void> main() async {
  final suffix = Random().nextInt(999999);
  final storage = MemoryTokenStorage();
  final apiClient = ApiClient(baseUrl: 'http://localhost:4000', tokenStorage: storage);
  final repo = AuthRepository(apiClient: apiClient, tokenStorage: storage);

  print('Registering a real user against the live backend...');
  final user = await repo.register(
    email: 'flutter-verify-$suffix@example.com',
    password: 'correcthorse123',
    username: 'flutterverify$suffix',
    displayName: 'Flutter Verify',
  );
  print('Registered: ${user.username} (${user.id}), role=${user.role}');

  print('Fetching /auth/me with the stored access token...');
  final me = await repo.fetchCurrentUser();
  if (me == null || me.id != user.id) {
    throw StateError('fetchCurrentUser did not return the same user');
  }
  print('Confirmed /auth/me returns: ${me.username}');

  print('Logging out...');
  await repo.logout();
  final afterLogout = await repo.fetchCurrentUser();
  if (afterLogout != null) {
    throw StateError('User should be null after logout clears tokens');
  }
  print('Confirmed logout cleared the local session.');

  print('Logging back in...');
  final loggedInAgain = await repo.login(email: 'flutter-verify-$suffix@example.com', password: 'correcthorse123');
  if (loggedInAgain.id != user.id) {
    throw StateError('Login did not return the same user');
  }
  print('Login succeeded for ${loggedInAgain.username}.');

  print('\nAll checks passed against the real backend.');
}
