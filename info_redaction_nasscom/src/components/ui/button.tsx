import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-cyber focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 font-rajdhani font-medium",
  {
    variants: {
      variant: {
        default: "bg-gradient-primary text-primary-foreground hover:shadow-glow-primary transition-glow border border-primary/20",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-cyber border border-destructive/30",
        outline: "border border-glass-border bg-glass backdrop-blur-sm hover:bg-primary/20 hover:border-primary hover:shadow-glow-soft transition-glow",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-cyber border border-secondary/30",
        ghost: "hover:bg-primary/20 hover:text-primary transition-glow",
        link: "text-primary underline-offset-4 hover:underline transition-glow animate-neon-pulse",
        success: "bg-gradient-success text-success-foreground hover:shadow-glow-success transition-glow border border-success/20",
        warning: "bg-warning text-warning-foreground hover:shadow-glow-warning transition-glow border border-warning/20",
        cyber: "bg-gradient-cyber border border-primary text-primary hover:shadow-neon hover:bg-primary/10 transition-glow backdrop-blur-sm",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
