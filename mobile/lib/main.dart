import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/auth/auth_repository.dart';
import 'core/auth/auth_state.dart';
import 'core/config/app_config.dart';
import 'core/networking/api_client.dart';
import 'core/storage/token_storage.dart';
import 'features/auth/login_screen.dart';
import 'features/home/home_screen.dart';

void main() {
  runApp(const FliqApp());
}

class FliqApp extends StatelessWidget {
  const FliqApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Provider<AuthRepository>(
      create: (_) {
        final tokenStorage = SecureTokenStorage();
        final apiClient = ApiClient(baseUrl: AppConfig.apiBaseUrl, tokenStorage: tokenStorage);
        return AuthRepository(apiClient: apiClient, tokenStorage: tokenStorage);
      },
      child: ChangeNotifierProvider<AuthState>(
        create: (context) => AuthState(repository: context.read<AuthRepository>())..bootstrap(),
        child: MaterialApp(
          title: 'Fliq',
          theme: ThemeData(useMaterial3: true, colorSchemeSeed: Colors.deepPurple),
          home: const AuthGate(),
        ),
      ),
    );
  }
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final status = context.watch<AuthState>().status;
    return switch (status) {
      AuthStatus.unknown => const Scaffold(body: Center(child: CircularProgressIndicator())),
      AuthStatus.authenticated => const HomeScreen(),
      AuthStatus.unauthenticated => const LoginScreen(),
    };
  }
}
