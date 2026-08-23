"use client";

import { Button } from "@/components/ui/Button";

export function OAuthButtons() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Button
        variant="secondary"
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- deliberate full navigation into an OAuth redirect, not a Next.js page
        onClick={() => (window.location.href = "/api/auth/google")}
        type="button"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
          />
          <path fill="currentColor" d="M5.84 14.09A6.6 6.6 0 0 1 5.5 12c0-.73.12-1.43.34-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93z" />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.07L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z"
          />
        </svg>
        Google
      </Button>
      <Button
        variant="secondary"
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- deliberate full navigation into an OAuth redirect, not a Next.js page
        onClick={() => (window.location.href = "/api/auth/apple")}
        type="button"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M16.365 1.43c0 1.14-.468 2.2-1.23 3.02-.83.9-2.19 1.6-3.32 1.51-.14-1.1.42-2.24 1.19-3.03.83-.87 2.28-1.55 3.36-1.5zM20.6 17.13c-.55 1.28-1.22 2.42-2.03 3.44-.94 1.17-2.05 2.6-3.55 2.6-1.31 0-1.7-.85-3.44-.84-1.74.01-2.17.85-3.48.83-1.5-.02-2.55-1.33-3.49-2.5-2.4-2.98-3.14-6.5-1.87-9.42.9-2.07 2.68-3.32 4.6-3.35 1.34-.03 2.47.9 3.44.9.96 0 2.4-1.11 4.04-.95.68.03 2.6.28 3.83 2.09-.1.06-2.28 1.33-2.26 3.97.03 3.15 2.76 4.2 2.79 4.21z" />
        </svg>
        Apple
      </Button>
    </div>
  );
}
