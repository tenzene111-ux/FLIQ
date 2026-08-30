/// Thrown for any non-2xx API response, with the backend's own message
/// (class-validator errors, "Invalid email or password", etc.) preserved
/// so the UI can show it directly instead of a generic failure.
class ApiException implements Exception {
  ApiException(this.statusCode, this.message);

  final int statusCode;
  final String message;

  @override
  String toString() => message;
}
