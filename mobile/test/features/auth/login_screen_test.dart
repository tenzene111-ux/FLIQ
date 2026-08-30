import 'dart:convert';

import 'package:fliq_mobile/core/auth/auth_repository.dart';
import 'package:fliq_mobile/core/auth/auth_state.dart';
import 'package:fliq_mobile/core/networking/api_client.dart';
import 'package:fliq_mobile/features/auth/login_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';

import '../../helpers/in_memory_token_storage.dart';

Widget _wrap(AuthState authState) {
  return ChangeNotifierProvider<AuthState>.value(
    value: authState,
    child: const MaterialApp(home: LoginScreen()),
  );
}

void main() {
  group('LoginScreen', () {
    testWidgets('shows validation errors when submitted empty', (tester) async {
      final storage = InMemoryTokenStorage();
      final client = MockClient((request) async => http.Response('{}', 200));
      final authState = AuthState(
        repository: AuthRepository(
          apiClient: ApiClient(baseUrl: 'http://test', tokenStorage: storage, client: client),
          tokenStorage: storage,
        ),
      );

      await tester.pumpWidget(_wrap(authState));
      await tester.tap(find.byKey(const Key('login_submit_button')));
      await tester.pump();

      expect(find.text('Enter a valid email'), findsOneWidget);
      expect(find.text('Enter your password'), findsOneWidget);
    });

    testWidgets('a failed login shows the backend error message', (tester) async {
      final storage = InMemoryTokenStorage();
      final client = MockClient((request) async {
        return http.Response(jsonEncode({'message': 'Invalid email or password'}), 401);
      });
      final authState = AuthState(
        repository: AuthRepository(
          apiClient: ApiClient(baseUrl: 'http://test', tokenStorage: storage, client: client),
          tokenStorage: storage,
        ),
      );

      await tester.pumpWidget(_wrap(authState));
      await tester.enterText(find.byKey(const Key('login_email_field')), 'a@b.com');
      await tester.enterText(find.byKey(const Key('login_password_field')), 'wrongpassword');
      await tester.tap(find.byKey(const Key('login_submit_button')));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('login_error')), findsOneWidget);
      expect(find.text('Invalid email or password'), findsOneWidget);
      expect(authState.status, AuthStatus.unknown);
    });

    testWidgets('a successful login updates AuthState to authenticated', (tester) async {
      final storage = InMemoryTokenStorage();
      final client = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'user': {
              'id': 'u1',
              'email': 'a@b.com',
              'username': 'alice',
              'displayName': 'Alice',
              'isVerified': false,
              'role': 'user',
            },
            'accessToken': 'access-1',
            'refreshToken': 'refresh-1',
          }),
          200,
        );
      });
      final authState = AuthState(
        repository: AuthRepository(
          apiClient: ApiClient(baseUrl: 'http://test', tokenStorage: storage, client: client),
          tokenStorage: storage,
        ),
      );

      await tester.pumpWidget(_wrap(authState));
      await tester.enterText(find.byKey(const Key('login_email_field')), 'a@b.com');
      await tester.enterText(find.byKey(const Key('login_password_field')), 'correcthorse123');
      await tester.tap(find.byKey(const Key('login_submit_button')));
      await tester.pumpAndSettle();

      expect(authState.status, AuthStatus.authenticated);
      expect(authState.user?.username, 'alice');
    });
  });
}
