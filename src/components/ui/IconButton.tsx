import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export const IconButton = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  function IconButton({ className, children, ...props }, ref) {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-full w-9 h-9 text-white hover:bg-white/10 active:scale-90 transition-all tap-highlight-none disabled:opacity-40",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
