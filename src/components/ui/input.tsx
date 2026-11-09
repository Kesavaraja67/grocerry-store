import * as React from "react";
import { cn } from "@/lib/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          className={cn(
            "flex h-11 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:border-leaf disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]",
            error && "border-red focus-visible:ring-red",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red font-medium">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };

