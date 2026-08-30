import 'dart:convert';

import 'package:fliq_mobile/core/auth/auth_repository.dart';
import 'package:fliq_mobile/core/networking/api_client.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import '../helpers/in_memory_token_storage.dart';

Map<String, dynamic> _sessionResponse({String userId = 'u1'}) => {
      'user': {
        'id': userId,
        'email': 'a@b.com',
        'username': 'alice',
        'displayName': 'Alice',
        'isVerified': false,
        'role': 'user',
      },
      'accessToken': 'access-1',
      'refreshToken': 'refresh-1',
    };

void main() {
  group('AuthRepository', () {
    test('register saves tokens and returns the parsed user', () async {
      final storage = InMemoryTokenStorage();
      final client = MockClient((request) async {
        expect(request.url.path, '/auth/register');
        return http.Response(jsonEncode(_sessionResponse()), 201);
      });
      final repo = AuthRepository(
        apiClient: ApiClient(baseUrl: 'http://test', tokenStorage: storage, client: client),
        tokenStorage: storage,
      );

      final user = await repo.register(
        email: 'a@b.com',
        password: 'correcthorse123',
        username: 'alice',
        displayName: 'Alice',
      );

      expect(user.username, 'alice');
      expect(await storage.readAccessToken(), 'access-1');
      expect(await storage.readRefreshToken(), 'refresh-1');
    });

    test('fetchCurrentUser returns null when nothing is stored, without calling the API', () async {
      final storage = InMemoryTokenStorage();
      var called = false;
      final client = MockClient((request) async {
        called = true;
        return http.Response('{}', 200);
      });
      final repo = AuthRepository(
        apiClient: ApiClient(baseUrl: 'http://test', tokenStorage: storage, client: client),
        tokenStorage: storage,
      );

      final user = await repo.fetchCurrentUser();
      expect(user, isNull);
      expect(called, isFalse);
    });

    test('fetchCurrentUser returns the user when a valid session exists', () async {
      final storage = InMemoryTokenStorage();
      await storage.saveTokens(accessToken: 'access-1', refreshToken: 'refresh-1');
      final client = MockClient((request) async {
        expect(request.url.path, '/auth/me');
        return http.Response(jsonEncode(_sessionResponse()['user']), 200);
      });
      final repo = AuthRepository(
        apiClient: ApiClient(baseUrl: 'http://test', tokenStorage: storage, client: client),
        tokenStorage: storage,
      );

      final user = await repo.fetchCurrentUser();
      expect(user?.username, 'alice');
    });

    test('logout clears local tokens even if the server call fails', () async {
      final storage = InMemoryTokenStorage();
      await storage.saveTokens(accessToken: 'access-1', refreshToken: 'refresh-1');
      final client = MockClient((request) async => http.Response('', 500));
      final repo = AuthRepository(
        apiClient: ApiClient(baseUrl: 'http://test', tokenStorage: storage, client: client),
        tokenStorage: storage,
      );

      await repo.logout();
      expect(await storage.readAccessToken(), isNull);
      expect(await storage.readRefreshToken(), isNull);
    });
  });
}
