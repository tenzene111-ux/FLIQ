import { GRADIENT_ID } from "@/components/nav/nav-items";

/** Shared SVG gradient definitions referenced via `url(#id)` for icon strokes/fills. */
export function GradientDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true">
      <defs>
        <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c3aed" />
          <stop offset="0.5" stopColor="#d946ef" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
    </svg>
  );
}
