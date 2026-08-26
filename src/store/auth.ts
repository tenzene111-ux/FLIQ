"use client";

import { create } from "zustand";

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  website: string | null;
  location: string | null;
  genderVisible: boolean;
  gender: string | null;
  isVerified: boolean;
  isCreator: boolean;
  isAdmin: boolean;
  isPrivate: boolean;
  status: string;
  createdAt: string;
  email: string;
  emailVerified: boolean;
  interests: string;
  usernameChangedAt: string | null;
}

interface AuthState {
  user: SessionUser | null;
  hydrated: boolean;
  setUser: (user: SessionUser | null) => void;
  patchUser: (patch: Partial<SessionUser>) => void;
  setHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  hydrated: false,
  setUser: (user) => set({ user }),
  patchUser: (patch) => set((s) => (s.user ? { user: { ...s.user, ...patch } } : s)),
  setHydrated: (v) => set({ hydrated: v }),
}));
