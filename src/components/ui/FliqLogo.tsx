import { cn } from "@/lib/utils";

export function FliqMark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="fliq-mark-g" x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7c3aed" />
          <stop offset="0.45" stopColor="#d946ef" />
          <stop offset="0.7" stopColor="#ec4899" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="#0b0b12" />
      <rect x="1.5" y="1.5" width="61" height="61" rx="16.5" stroke="url(#fliq-mark-g)" strokeWidth="2" />
      <path
        d="M24 20a3 3 0 0 1 4.55-2.57l16 9.5a3 3 0 0 1 0 5.14l-16 9.5A3 3 0 0 1 24 39V20Z"
        fill="url(#fliq-mark-g)"
      />
    </svg>
  );
}

export function FliqLogo({ className, markSize = 30 }: { className?: string; markSize?: number }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <FliqMark size={markSize} />
      <span className="text-xl font-bold tracking-tight text-white">Fliq</span>
    </div>
  );
}
