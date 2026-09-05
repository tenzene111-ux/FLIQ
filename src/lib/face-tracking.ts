"use client";

// Real, on-device ML face tracking (Google's MediaPipe FaceLandmarker —
// 478 3D landmarks per face) used to anchor AR effects and drive face-aware
// beauty smoothing. The Wasm runtime + model are fetched from Google's own
// CDNs at runtime by the *viewer's* browser, so this needs no server-side
// API key — just a working network connection. If that fetch fails (offline,
// unsupported browser), callers get `null` back and fall back gracefully
// instead of faking an effect.

import type { FaceLandmarker as FaceLandmarkerType } from "@mediapipe/tasks-vision";

const MEDIAPIPE_VERSION = "1.0.1";
const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

let landmarkerPromise: Promise<FaceLandmarkerType | null> | null = null;

async function create(delegate: "GPU" | "CPU"): Promise<FaceLandmarkerType> {
  const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
  return FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: "VIDEO",
    numFaces: 1,
  });
}

export function getFaceLandmarker(): Promise<FaceLandmarkerType | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!landmarkerPromise) {
    landmarkerPromise = create("GPU").catch(() => create("CPU")).catch(() => null);
  }
  return landmarkerPromise;
}

export type FaceLandmark = { x: number; y: number; z: number };
