import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/auth/auth_state.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _usernameController = TextEditingController();
  final _displayNameController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _usernameController.dispose();
    _displayNameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit(AuthState auth) async {
    if (!_formKey.currentState!.validate()) return;
    final ok = await auth.register(
      email: _emailController.text.trim(),
      password: _passwordController.text,
      username: _usernameController.text.trim(),
      displayName: _displayNameController.text.trim(),
    );
    if (ok && mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    return Scaffold(
      appBar: AppBar(title: const Text('Create account')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (auth.error != null) ...[
                  Text(
                    auth.error!,
                    key: const Key('register_error'),
                    style: TextStyle(color: Theme.of(context).colorScheme.error),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                ],
                TextFormField(
                  key: const Key('register_email_field'),
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'Email'),
                  validator: (value) =>
                      (value == null || !value.contains('@')) ? 'Enter a valid email' : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  key: const Key('register_username_field'),
                  controller: _usernameController,
                  decoration: const InputDecoration(labelText: 'Username'),
                  validator: (value) => (value == null || value.length < 3)
                      ? 'Username must be at least 3 characters'
                      : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  key: const Key('register_display_name_field'),
                  controller: _displayNameController,
                  decoration: const InputDecoration(labelText: 'Display name'),
                  validator: (value) =>
                      (value == null || value.isEmpty) ? 'Enter a display name' : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  key: const Key('register_password_field'),
                  controller: _passwordController,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'Password'),
                  validator: (value) => (value == null || value.length < 8)
                      ? 'Password must be at least 8 characters'
                      : null,
                ),
                const SizedBox(height: 24),
                FilledButton(
                  key: const Key('register_submit_button'),
                  onPressed: auth.isLoading ? null : () => _submit(auth),
                  child: auth.isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Sign up'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
