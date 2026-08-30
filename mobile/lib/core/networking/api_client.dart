import 'dart:convert';

import 'package:http/http.dart' as http;

import '../storage/token_storage.dart';
import 'api_exception.dart';

/// Talks to the Fliq NestJS backend. Handles JSON encode/decode, attaching
/// the access token on authenticated calls, and — matching the backend's
/// refresh-token-rotation design — transparently refreshing once on a 401
/// before giving up, so a short-lived access token expiring mid-session
/// doesn't kick the user back to the login screen.
class ApiClient {
  ApiClient({required this.baseUrl, required this.tokenStorage, http.Client? client})
      : _client = client ?? http.Client();

  final String baseUrl;
  final TokenStorage tokenStorage;
  final http.Client _client;

  Future<Map<String, dynamic>> get(String path, {bool auth = false}) =>
      _send('GET', path, auth: auth);

  Future<Map<String, dynamic>> post(String path, {Map<String, dynamic>? body, bool auth = false}) =>
      _send('POST', path, body: body, auth: auth);

  Future<Map<String, dynamic>> patch(String path, {Map<String, dynamic>? body, bool auth = false}) =>
      _send('PATCH', path, body: body, auth: auth);

  Future<Map<String, dynamic>> delete(String path, {bool auth = false}) =>
      _send('DELETE', path, auth: auth);

  Future<Map<String, dynamic>> _send(
    String method,
    String path, {
    Map<String, dynamic>? body,
    bool auth = false,
    bool isRetryAfterRefresh = false,
  }) async {
    final uri = Uri.parse('$baseUrl$path');
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (auth) {
      final token = await tokenStorage.readAccessToken();
      if (token != null) headers['Authorization'] = 'Bearer $token';
    }
    final encodedBody = body != null ? jsonEncode(body) : null;

    final response = await switch (method) {
      'GET' => _client.get(uri, headers: headers),
      'POST' => _client.post(uri, headers: headers, body: encodedBody),
      'PATCH' => _client.patch(uri, headers: headers, body: encodedBody),
      'DELETE' => _client.delete(uri, headers: headers),
      _ => throw UnsupportedError('Unsupported method: $method'),
    };

    if (response.statusCode == 401 && auth && !isRetryAfterRefresh) {
      final refreshed = await _tryRefresh();
      if (refreshed) {
        return _send(method, path, body: body, auth: auth, isRetryAfterRefresh: true);
      }
    }

    final decoded = response.body.isEmpty ? <String, dynamic>{} : jsonDecode(response.body);
    if (response.statusCode >= 400) {
      throw ApiException(response.statusCode, _extractMessage(decoded));
    }
    return decoded as Map<String, dynamic>;
  }

  Future<bool> _tryRefresh() async {
    final refreshToken = await tokenStorage.readRefreshToken();
    if (refreshToken == null) return false;

    try {
      final response = await _client.post(
        Uri.parse('$baseUrl/auth/refresh'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refreshToken': refreshToken}),
      );
      if (response.statusCode != 200) {
        await tokenStorage.clear();
        return false;
      }
      final decoded = jsonDecode(response.body) as Map<String, dynamic>;
      await tokenStorage.saveTokens(
        accessToken: decoded['accessToken'] as String,
        refreshToken: decoded['refreshToken'] as String,
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  String _extractMessage(dynamic decoded) {
    if (decoded is! Map<String, dynamic>) return 'Request failed';
    final message = decoded['message'];
    if (message is List) return message.join(', ');
    return message?.toString() ?? 'Request failed';
  }
}
