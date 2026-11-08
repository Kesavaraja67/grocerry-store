import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-leaf text-white hover:bg-leaf-hover active:bg-leaf-hover shadow-xs",
        turmeric:
          "bg-turmeric text-ink font-semibold hover:bg-turmeric-hover shadow-xs",
        outline:
          "border border-border bg-surface text-ink hover:bg-page hover:border-border-strong",
        secondary:
          "bg-leaf-light text-leaf hover:bg-[#DEE8E1] font-medium",
        destructive:
          "bg-red text-white hover:bg-[#9B2019] shadow-xs",
        ghost:
          "text-ink hover:bg-leaf-light hover:text-leaf",
        link:
          "text-leaf underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-11 px-4 py-2 min-h-[44px]", // 44px min touch target
        sm: "h-9 rounded-md px-3 text-xs min-h-[36px]",
        lg: "h-12 rounded-md px-6 text-base min-h-[48px]",
        icon: "h-11 w-11 min-h-[44px] min-w-[44px]",
        iconSm: "h-8 w-8 min-h-[32px] min-w-[32px] rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
