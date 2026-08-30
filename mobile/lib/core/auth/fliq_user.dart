class FliqUser {
  const FliqUser({
    required this.id,
    required this.email,
    required this.username,
    required this.displayName,
    required this.isVerified,
    required this.role,
  });

  factory FliqUser.fromJson(Map<String, dynamic> json) => FliqUser(
        id: json['id'] as String,
        email: json['email'] as String,
        username: json['username'] as String,
        displayName: json['displayName'] as String,
        isVerified: json['isVerified'] as bool,
        role: json['role'] as String,
      );

  final String id;
  final String email;
  final String username;
  final String displayName;
  final bool isVerified;
  final String role;
}
