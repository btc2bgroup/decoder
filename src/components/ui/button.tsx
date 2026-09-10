import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-none border-2 border-transparent text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-orange border-orange font-heading text-xs font-bold uppercase tracking-[0.15em] text-white hover:-translate-y-0.5 hover:bg-orange-light hover:border-orange-light",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border-navy bg-transparent font-heading text-xs font-bold uppercase tracking-[0.15em] text-navy hover:-translate-y-0.5 hover:bg-navy hover:text-white dark:border-white/60 dark:text-white dark:hover:border-orange dark:hover:bg-orange",
        secondary:
          "bg-secondary text-secondary-foreground font-heading text-xs font-bold uppercase tracking-[0.15em] hover:-translate-y-0.5 hover:bg-secondary/90",
        ghost: "hover:bg-accent hover:text-orange",
        link: "text-orange underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-12 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
