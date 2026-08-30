# Fliq mobile

Flutter client for the Fliq NestJS backend (see `../backend`).

## Structure

```
lib/
├── core/
│   ├── auth/        # AuthRepository, AuthState (ChangeNotifier), FliqUser model
│   ├── config/      # AppConfig — API_BASE_URL etc.
│   ├── networking/  # ApiClient (JSON + auth header + refresh-on-401)
│   └── storage/     # TokenStorage (secure storage, abstracted for tests)
└── features/
    ├── auth/        # Login / register screens
    └── home/        # Placeholder post-login screen
```

## Running against the backend

Start the backend first (`cd ../backend && npm run start:dev`), then:

```
flutter run --dart-define=API_BASE_URL=http://localhost:4000
```

Android emulator can't reach the host via `localhost` — use
`http://10.0.2.2:4000` instead. iOS simulator, web, and desktop can use
`localhost` directly.

## Tests

```
flutter analyze
flutter test
```

`tool/verify_backend_integration.dart` is a manual (not automated) script
that exercises the real `AuthRepository`/`ApiClient` against a live backend
— run it with `flutter test tool/verify_backend_integration.dart` while the
backend is up, to sanity-check the two sides are actually talking to each
other correctly.
