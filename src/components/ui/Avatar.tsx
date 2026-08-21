import { cn } from "@/lib/utils";
import { paletteForSeed } from "@/lib/placeholders";
import { BadgeCheck } from "lucide-react";

const sizeMap = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 88,
  "2xl": 112,
};

export function Avatar({
  src,
  alt,
  size = "md",
  ring,
  verified,
  className,
}: {
  src?: string | null;
  alt: string;
  size?: keyof typeof sizeMap;
  ring?: boolean;
  verified?: boolean;
  className?: string;
}) {
  const px = sizeMap[size];
  const initials = alt
    .split(/[\s_.]+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const [c1, c2] = paletteForSeed(alt);

  return (
    <div className={cn("relative shrink-0 inline-block", className)} style={{ width: px, height: px }}>
      <div
        className={cn("rounded-full overflow-hidden flex items-center justify-center", ring && "p-[2.5px] bg-gradient-brand-diag")}
        style={{ width: px, height: px }}
      >
        <div
          className={cn("rounded-full overflow-hidden flex items-center justify-center w-full h-full relative", ring && "ring-2 ring-background")}
          style={!src ? { background: `linear-gradient(135deg, ${c1}, ${c2})` } : undefined}
        >
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={alt} className="object-cover w-full h-full" />
          ) : (
            <span className="text-white font-semibold" style={{ fontSize: px * 0.36 }}>
              {initials}
            </span>
          )}
        </div>
      </div>
      {verified && (
        <BadgeCheck
          className="absolute -bottom-0.5 -right-0.5 text-fliq-cyan bg-background rounded-full"
          size={Math.max(14, px * 0.28)}
          fill="#22d3ee"
          color="#050509"
        />
      )}
    </div>
  );
}
