"use client";

import { useEffect } from "react";
import { useAuthStore, type SessionUser } from "@/store/auth";
import { Toaster } from "@/components/ui/Toaster";

export function AppProviders({
  initialUser,
  children,
}: {
  initialUser: SessionUser | null;
  children: React.ReactNode;
}) {
  const setUser = useAuthStore((s) => s.setUser);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  useEffect(() => {
    setUser(initialUser);
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
