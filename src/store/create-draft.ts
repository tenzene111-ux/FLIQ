"use client";

import { create } from "zustand";

export interface ClipSource {
  id: string;
  url: string; // object URL
  duration: number;
}

export interface TextLayer {
  id: string;
  text: string;
  x: number; // percent 0-100
  y: number; // percent 0-100
  color: string;
}

export interface StickerLayer {
  id: string;
  emoji: string;
  x: number;
  y: number;
}

export const FILTER_PRESETS = [
  { id: "none", label: "Original", css: "" },
  { id: "vivid", label: "Vivid", css: "saturate(1.5) contrast(1.1)" },
  { id: "bw", label: "B&W", css: "grayscale(1) contrast(1.1)" },
  { id: "warm", label: "Warm", css: "sepia(0.35) saturate(1.3) brightness(1.05)" },
  { id: "cool", label: "Cool", css: "hue-rotate(-15deg) saturate(1.2) brightness(1.02)" },
  { id: "vintage", label: "Vintage", css: "sepia(0.5) contrast(0.9) brightness(0.95) saturate(0.8)" },
  { id: "soft", label: "Soft", css: "brightness(1.08) contrast(0.92) saturate(1.05)" },
] as const;

export function buildFilterCss(filterId: string): string {
  return FILTER_PRESETS.find((f) => f.id === filterId)?.css || "";
}

interface CreateDraftState {
  clips: ClipSource[];
  maxDuration: number;
  speed: number;
  filterId: string;
  beauty: number; // 0-100
  zoom: number;
  arEffectId: string;
  muteOriginal: boolean;
  transition: "cut" | "fade";
  textLayers: TextLayer[];
  stickerLayers: StickerLayer[];
  soundId: string | null;
  soundLabel: string | null;
  duetOfId: string | null;
  duetOfUsername: string | null;
  stitchOfId: string | null;
  stitchOfUsername: string | null;
  captionsRequested: boolean;
  photoFiles: File[];
  photoPreviewUrls: string[];
  finalBlobUrl: string | null;
  finalDuration: number;
  coverDataUrl: string | null;
  addClip: (clip: ClipSource) => void;
  removeLastClip: () => void;
  setClips: (clips: ClipSource[]) => void;
  setMaxDuration: (n: number) => void;
  setSpeed: (n: number) => void;
  setFilterId: (id: string) => void;
  setBeauty: (n: number) => void;
  setZoom: (n: number) => void;
  setArEffectId: (id: string) => void;
  setMuteOriginal: (v: boolean) => void;
  setTransition: (t: "cut" | "fade") => void;
  addTextLayer: (l: TextLayer) => void;
  updateTextLayer: (id: string, patch: Partial<TextLayer>) => void;
  removeTextLayer: (id: string) => void;
  addStickerLayer: (l: StickerLayer) => void;
  updateStickerLayer: (id: string, patch: Partial<StickerLayer>) => void;
  removeStickerLayer: (id: string) => void;
  setSound: (id: string | null, label: string | null) => void;
  setDuetOf: (id: string | null, username: string | null) => void;
  setStitchOf: (id: string | null, username: string | null) => void;
  setCaptionsRequested: (v: boolean) => void;
  setPhotos: (files: File[], previewUrls: string[]) => void;
  setFinal: (url: string, duration: number) => void;
  setCover: (dataUrl: string) => void;
  reset: () => void;
}

const initialState = {
  clips: [] as ClipSource[],
  maxDuration: 60,
  speed: 1,
  filterId: "none",
  beauty: 0,
  zoom: 1,
  arEffectId: "none",
  muteOriginal: false,
  transition: "cut" as const,
  textLayers: [] as TextLayer[],
  stickerLayers: [] as StickerLayer[],
  soundId: null as string | null,
  soundLabel: null as string | null,
  duetOfId: null as string | null,
  duetOfUsername: null as string | null,
  stitchOfId: null as string | null,
  stitchOfUsername: null as string | null,
  captionsRequested: false,
  photoFiles: [] as File[],
  photoPreviewUrls: [] as string[],
  finalBlobUrl: null as string | null,
  finalDuration: 0,
  coverDataUrl: null as string | null,
};

export const useCreateDraftStore = create<CreateDraftState>((set) => ({
  ...initialState,
  addClip: (clip) => set((s) => ({ clips: [...s.clips, clip] })),
  removeLastClip: () => set((s) => ({ clips: s.clips.slice(0, -1) })),
  setClips: (clips) => set({ clips }),
  setMaxDuration: (n) => set({ maxDuration: n }),
  setSpeed: (n) => set({ speed: n }),
  setFilterId: (id) => set({ filterId: id }),
  setBeauty: (n) => set({ beauty: n }),
  setZoom: (n) => set({ zoom: n }),
  setArEffectId: (arEffectId) => set({ arEffectId }),
  setMuteOriginal: (v) => set({ muteOriginal: v }),
  setTransition: (t) => set({ transition: t }),
  addTextLayer: (l) => set((s) => ({ textLayers: [...s.textLayers, l] })),
  updateTextLayer: (id, patch) => set((s) => ({ textLayers: s.textLayers.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
  removeTextLayer: (id) => set((s) => ({ textLayers: s.textLayers.filter((t) => t.id !== id) })),
  addStickerLayer: (l) => set((s) => ({ stickerLayers: [...s.stickerLayers, l] })),
  updateStickerLayer: (id, patch) => set((s) => ({ stickerLayers: s.stickerLayers.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
  removeStickerLayer: (id) => set((s) => ({ stickerLayers: s.stickerLayers.filter((t) => t.id !== id) })),
  setSound: (soundId, soundLabel) => set({ soundId, soundLabel }),
  setDuetOf: (duetOfId, duetOfUsername) => set({ duetOfId, duetOfUsername }),
  setStitchOf: (stitchOfId, stitchOfUsername) => set({ stitchOfId, stitchOfUsername }),
  setCaptionsRequested: (captionsRequested) => set({ captionsRequested }),
  setPhotos: (photoFiles, photoPreviewUrls) => set({ photoFiles, photoPreviewUrls }),
  setFinal: (finalBlobUrl, finalDuration) => set({ finalBlobUrl, finalDuration }),
  setCover: (coverDataUrl) => set({ coverDataUrl }),
  reset: () => set({ ...initialState }),
}));
