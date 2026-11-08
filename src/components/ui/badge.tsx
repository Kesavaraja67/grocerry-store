import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-leaf focus:ring-offset-2 tabular-nums",
  {
    variants: {
      variant: {
        default:
          "bg-leaf text-white",
        secondary:
          "bg-leaf-light text-leaf border border-[#D5E3DA]",
        turmeric:
          "bg-turmeric text-ink font-semibold",
        destructive:
          "bg-red-light text-red border border-[#FAD2CF]",
        outline:
          "border border-border text-ink bg-surface",
        muted:
          "bg-page text-muted border border-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
