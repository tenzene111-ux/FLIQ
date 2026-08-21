import { cn } from "@/lib/utils";

/** Standard scrollable-page wrapper: leaves room for the fixed bottom nav on mobile. */
export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex-1 min-h-screen pb-20 md:pb-8", className)}>{children}</div>;
}
