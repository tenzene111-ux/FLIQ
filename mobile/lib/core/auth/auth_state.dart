import 'package:flutter/foundation.dart';

import '../networking/api_exception.dart';
import 'auth_repository.dart';
import 'fliq_user.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

/// App-wide auth state, exposed via Provider. `unknown` is the splash state
/// while bootstrap() checks for a stored session against the real backend.
class AuthState extends ChangeNotifier {
  AuthState({required this.repository});

  final AuthRepository repository;

  AuthStatus status = AuthStatus.unknown;
  FliqUser? user;
  String? error;
  bool isLoading = false;

  Future<void> bootstrap() async {
    user = await repository.fetchCurrentUser();
    status = user != null ? AuthStatus.authenticated : AuthStatus.unauthenticated;
    notifyListeners();
  }

  Future<bool> login({required String email, required String password}) {
    return _runAuthAction(() => repository.login(email: email, password: password));
  }

  Future<bool> register({
    required String email,
    required String password,
    required String username,
    required String displayName,
  }) {
    return _runAuthAction(() => repository.register(
          email: email,
          password: password,
          username: username,
          displayName: displayName,
        ));
  }

  Future<void> logout() async {
    await repository.logout();
    user = null;
    status = AuthStatus.unauthenticated;
    notifyListeners();
  }

  Future<bool> _runAuthAction(Future<FliqUser> Function() action) async {
    isLoading = true;
    error = null;
    notifyListeners();
    try {
      user = await action();
      status = AuthStatus.authenticated;
      return true;
    } on ApiException catch (e) {
      error = e.message;
      return false;
    } catch (_) {
      error = 'Something went wrong. Check your connection and try again.';
      return false;
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }
}
