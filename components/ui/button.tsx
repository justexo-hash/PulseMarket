import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transition-all duration-200 ease-out",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/80",
        destructive:
          "bg-destructive/10 border border-destructive/50 text-destructive hover:bg-destructive/20 hover:border-destructive hover:shadow-[0_0_12px_rgba(239,68,68,0.3)]",
        success:
          "bg-success/10 border border-success/50 text-success hover:bg-success/20 hover:border-success hover:shadow-[0_0_12px_rgba(34,197,94,0.3)]",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-muted/50",
        marketing: "bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "bg-secondary border border-border text-secondary-foreground hover:bg-muted",
        ghost: "text-muted-foreground hover:text-foreground hover:bg-muted/50",
        link: "text-foreground underline-offset-4 hover:underline",
        selected: "bg-muted text-foreground border border-border",
        sidebar: "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      },
      // Heights are set as "min" heights, because sometimes Ai will place large amount of content
      // inside buttons. With a min-height they will look appropriate with small amounts of content,
      // but will expand to fit large amounts of content.
      size: {
        default: "min-h-9 px-4 py-2",
        sm: "min-h-8 rounded-md px-3 text-xs",
        lg: "min-h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
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
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
