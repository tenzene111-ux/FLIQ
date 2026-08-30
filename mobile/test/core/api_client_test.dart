import 'dart:convert';

import 'package:fliq_mobile/core/networking/api_client.dart';
import 'package:fliq_mobile/core/networking/api_exception.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import '../helpers/in_memory_token_storage.dart';

void main() {
  group('ApiClient', () {
    test('GET decodes a successful JSON response', () async {
      final storage = InMemoryTokenStorage();
      final client = MockClient((request) async {
        expect(request.method, 'GET');
        expect(request.url.path, '/videos/feed/for-you');
        return http.Response(jsonEncode({'videos': [], 'nextCursor': null}), 200);
      });
      final api = ApiClient(baseUrl: 'http://test', tokenStorage: storage, client: client);

      final result = await api.get('/videos/feed/for-you');
      expect(result['videos'], isEmpty);
    });

    test('POST sends a JSON-encoded body', () async {
      final storage = InMemoryTokenStorage();
      final client = MockClient((request) async {
        expect(request.headers['Content-Type'], 'application/json');
        expect(jsonDecode(request.body), {'email': 'a@b.com', 'password': 'x'});
        return http.Response(jsonEncode({'accessToken': 'a', 'refreshToken': 'r', 'user': {}}), 200);
      });
      final api = ApiClient(baseUrl: 'http://test', tokenStorage: storage, client: client);

      await api.post('/auth/login', body: {'email': 'a@b.com', 'password': 'x'});
    });

    test('a non-2xx response throws ApiException with the backend message', () async {
      final storage = InMemoryTokenStorage();
      final client = MockClient((request) async {
        return http.Response(jsonEncode({'message': 'Invalid email or password'}), 401);
      });
      final api = ApiClient(baseUrl: 'http://test', tokenStorage: storage, client: client);

      await expectLater(
        api.post('/auth/login', body: {}),
        throwsA(isA<ApiException>().having((e) => e.message, 'message', 'Invalid email or password')),
      );
    });

    test('a validation error array is joined into one message', () async {
      final storage = InMemoryTokenStorage();
      final client = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'message': ['email must be an email', 'password must be longer than 8 characters'],
          }),
          400,
        );
      });
      final api = ApiClient(baseUrl: 'http://test', tokenStorage: storage, client: client);

      await expectLater(
        api.post('/auth/register', body: {}),
        throwsA(isA<ApiException>().having(
          (e) => e.message,
          'message',
          'email must be an email, password must be longer than 8 characters',
        )),
      );
    });

    test('an authenticated request attaches the stored access token', () async {
      final storage = InMemoryTokenStorage();
      await storage.saveTokens(accessToken: 'the-access-token', refreshToken: 'the-refresh-token');
      final client = MockClient((request) async {
        expect(request.headers['Authorization'], 'Bearer the-access-token');
        return http.Response(jsonEncode({'id': 'u1'}), 200);
      });
      final api = ApiClient(baseUrl: 'http://test', tokenStorage: storage, client: client);

      await api.get('/auth/me', auth: true);
    });

    test('a 401 on an authenticated request refreshes once and retries', () async {
      final storage = InMemoryTokenStorage();
      await storage.saveTokens(accessToken: 'expired-token', refreshToken: 'valid-refresh-token');
      var meCallCount = 0;

      final client = MockClient((request) async {
        if (request.url.path == '/auth/refresh') {
          expect(jsonDecode(request.body), {'refreshToken': 'valid-refresh-token'});
          return http.Response(
            jsonEncode({'accessToken': 'new-access-token', 'refreshToken': 'new-refresh-token'}),
            200,
          );
        }
        meCallCount++;
        if (request.headers['Authorization'] == 'Bearer expired-token') {
          return http.Response(jsonEncode({'message': 'Unauthorized'}), 401);
        }
        expect(request.headers['Authorization'], 'Bearer new-access-token');
        return http.Response(jsonEncode({'id': 'u1'}), 200);
      });
      final api = ApiClient(baseUrl: 'http://test', tokenStorage: storage, client: client);

      final result = await api.get('/auth/me', auth: true);
      expect(result['id'], 'u1');
      expect(meCallCount, 2); // once with the expired token, once retried with the new one
      expect(await storage.readAccessToken(), 'new-access-token');
    });

    test('a failed refresh clears tokens and surfaces the original 401', () async {
      final storage = InMemoryTokenStorage();
      await storage.saveTokens(accessToken: 'expired-token', refreshToken: 'also-invalid');

      final client = MockClient((request) async {
        if (request.url.path == '/auth/refresh') {
          return http.Response(jsonEncode({'message': 'Invalid or expired refresh token'}), 401);
        }
        return http.Response(jsonEncode({'message': 'Unauthorized'}), 401);
      });
      final api = ApiClient(baseUrl: 'http://test', tokenStorage: storage, client: client);

      await expectLater(api.get('/auth/me', auth: true), throwsA(isA<ApiException>()));
      expect(await storage.readAccessToken(), isNull);
    });
  });
}
