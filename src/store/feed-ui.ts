"use client";

import { create } from "zustand";

interface FeedUiState {
  muted: boolean;
  setMuted: (v: boolean) => void;
}

export const useFeedUiStore = create<FeedUiState>((set) => ({
  muted: true,
  setMuted: (v) => set({ muted: v }),
}));
