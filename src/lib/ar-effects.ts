import type { FaceLandmark } from "@/lib/face-tracking";

export interface ArEffectDef {
  id: string;
  label: string;
  emoji: string;
}

export const AR_EFFECTS: ArEffectDef[] = [
  { id: "none", label: "None", emoji: "🚫" },
  { id: "glasses", label: "Glasses", emoji: "🕶️" },
  { id: "ears", label: "Bunny Ears", emoji: "🐰" },
  { id: "nose", label: "Clown Nose", emoji: "🤡" },
  { id: "crown", label: "Crown", emoji: "👑" },
  { id: "freckles", label: "Freckles", emoji: "✨" },
];

// Ordered ring of MediaPipe FaceMesh landmark indices tracing the face's
// outer contour (the standard FACEMESH_FACE_OVAL loop) — used to clip
// beauty smoothing to just the face instead of blurring the whole frame.
const FACE_OVAL_INDICES = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21,
  54, 103, 67, 109,
];

interface Point {
  x: number;
  y: number;
}

function pt(landmarks: FaceLandmark[], i: number, width: number, height: number, mirrored: boolean): Point {
  const lm = landmarks[i];
  return { x: mirrored ? (1 - lm.x) * width : lm.x * width, y: lm.y * height };
}

function dist(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function angleBetween(a: Point, b: Point): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/** Draws a face-anchored AR effect using real detected landmark positions. */
export function drawArEffect(ctx: CanvasRenderingContext2D, effectId: string, landmarks: FaceLandmark[] | null, width: number, height: number, mirrored: boolean) {
  if (!landmarks || !landmarks.length || effectId === "none") return;

  const leftEye = pt(landmarks, 33, width, height, mirrored);
  const rightEye = pt(landmarks, 263, width, height, mirrored);
  const noseTip = pt(landmarks, 1, width, height, mirrored);
  const foreheadTop = pt(landmarks, 10, width, height, mirrored);
  const chin = pt(landmarks, 152, width, height, mirrored);
  const eyeDist = dist(leftEye, rightEye);
  const faceHeight = dist(foreheadTop, chin);
  const eyeAngle = angleBetween(leftEye, rightEye);

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  switch (effectId) {
    case "glasses": {
      const cx = (leftEye.x + rightEye.x) / 2;
      const cy = (leftEye.y + rightEye.y) / 2;
      ctx.translate(cx, cy);
      ctx.rotate(eyeAngle);
      ctx.font = `${Math.round(eyeDist * 2.6)}px sans-serif`;
      ctx.fillText("🕶️", 0, 0);
      break;
    }
    case "ears": {
      ctx.translate(foreheadTop.x, foreheadTop.y - faceHeight * 0.35);
      ctx.rotate(eyeAngle);
      ctx.font = `${Math.round(faceHeight * 0.9)}px sans-serif`;
      ctx.fillText("🐰", 0, 0);
      break;
    }
    case "crown": {
      ctx.translate(foreheadTop.x, foreheadTop.y - faceHeight * 0.4);
      ctx.rotate(eyeAngle);
      ctx.font = `${Math.round(faceHeight * 0.7)}px sans-serif`;
      ctx.fillText("👑", 0, 0);
      break;
    }
    case "nose": {
      ctx.translate(noseTip.x, noseTip.y);
      ctx.font = `${Math.round(eyeDist * 0.85)}px sans-serif`;
      ctx.fillText("🔴", 0, 0);
      break;
    }
    case "freckles": {
      const spots: [number, number][] = [
        [-0.9, 0.35],
        [-0.55, 0.55],
        [-0.75, 0.15],
        [0.9, 0.35],
        [0.55, 0.55],
        [0.75, 0.15],
      ];
      ctx.font = `${Math.round(eyeDist * 0.22)}px sans-serif`;
      for (const [dx, dy] of spots) {
        ctx.fillText("✨", noseTip.x + dx * eyeDist, noseTip.y + dy * eyeDist);
      }
      break;
    }
  }
  ctx.restore();
}

// Blanket-blur beauty fallback for when real face-aware smoothing (below)
// can't run — no face tracking library loaded yet, or no face detected this
// frame. Used both as a live-preview approximation and as a last-resort
// bake fallback so Beauty still does *something* rather than silently no-op.
export function getBeautyFallbackCss(beauty: number): string {
  if (beauty <= 0) return "";
  return `blur(${(beauty / 100) * 0.6}px) brightness(${1 + (beauty / 100) * 0.08}) contrast(${1 - (beauty / 100) * 0.05})`;
}

let scratchCanvas: HTMLCanvasElement | null = null;
function getScratchCanvas(width: number, height: number): HTMLCanvasElement {
  if (!scratchCanvas) scratchCanvas = document.createElement("canvas");
  scratchCanvas.width = width;
  scratchCanvas.height = height;
  return scratchCanvas;
}

/**
 * Real, face-aware beauty smoothing: softens skin only inside the detected
 * face oval (never hair/background/hands), instead of blurring the whole
 * frame. Intensity is 0-100, matching the existing Beauty slider.
 */
export function drawFaceSmoothing(ctx: CanvasRenderingContext2D, landmarks: FaceLandmark[] | null, width: number, height: number, intensity: number, mirrored: boolean) {
  if (!landmarks || !landmarks.length || intensity <= 0) return;

  const pts = FACE_OVAL_INDICES.map((i) => pt(landmarks, i, width, height, mirrored));
  const scratch = getScratchCanvas(width, height);
  const sctx = scratch.getContext("2d");
  if (!sctx) return;
  sctx.clearRect(0, 0, width, height);
  sctx.drawImage(ctx.canvas, 0, 0, width, height);

  ctx.save();
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();

  const blurPx = Math.max(0.5, (intensity / 100) * 5);
  ctx.filter = `blur(${blurPx}px) saturate(1.05)`;
  ctx.globalAlpha = Math.min(1, 0.35 + (intensity / 100) * 0.5);
  ctx.drawImage(scratch, 0, 0, width, height);
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.restore();
}
