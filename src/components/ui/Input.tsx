import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-muted-2 outline-none transition-colors focus:border-fliq-magenta/60 focus:ring-2 focus:ring-fliq-magenta/20",
          className
        )}
        {...props}
      />
    );
  }
);

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-muted-2 outline-none transition-colors focus:border-fliq-magenta/60 focus:ring-2 focus:ring-fliq-magenta/20 resize-none",
          className
        )}
        {...props}
      />
    );
  }
);

export function Label({ children, htmlFor, className }: { children: React.ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn("text-xs font-medium text-muted mb-1.5 block", className)}>
      {children}
    </label>
  );
}
