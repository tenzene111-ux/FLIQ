import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/auth/auth_state.dart';

/// Placeholder landing screen shown once auth succeeds — proves the full
/// register/login -> token storage -> /auth/me round trip works. The real
/// feed (For You / Following) is a separate, later step.
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final user = auth.user;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Fliq'),
        actions: [
          IconButton(
            key: const Key('logout_button'),
            icon: const Icon(Icons.logout),
            onPressed: () => context.read<AuthState>().logout(),
          ),
        ],
      ),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Welcome, ${user?.displayName ?? ''}', style: const TextStyle(fontSize: 24)),
            const SizedBox(height: 8),
            Text('@${user?.username ?? ''}'),
          ],
        ),
      ),
    );
  }
}
