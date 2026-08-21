import { AlertTriangle, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export function ErrorState({
  title = "Something went wrong.",
  description = "Please try again.",
  onRetry,
  offline,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  offline?: boolean;
  className?: string;
}) {
  const Icon = offline ? WifiOff : AlertTriangle;
  return (
    <div className={cn("flex flex-col items-center justify-center text-center px-8 py-16 gap-3", className)}>
      <div className="w-16 h-16 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center mb-1">
        <Icon size={26} className="text-danger" />
      </div>
      <p className="text-white font-semibold text-base">{title}</p>
      <p className="text-muted text-sm max-w-xs">{description}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-2">
          Retry
        </Button>
      )}
    </div>
  );
}
