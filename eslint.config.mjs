import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // React Compiler-oriented rules that flag idiomatic data-fetching
      // useEffect patterns (fetch → setState) used throughout this app.
      // Not a correctness issue here since the app doesn't opt into the
      // React Compiler; keep as a warning rather than a build-blocking error.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Separate sub-projects with their own toolchains (NestJS/oxlint,
    // Flutter/Dart) — not part of this Next.js app's lint target.
    "backend/**",
    "mobile/**",
  ]),
]);

export default eslintConfig;
