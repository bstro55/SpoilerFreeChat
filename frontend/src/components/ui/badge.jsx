import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border border-transparent px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-zinc-400 focus-visible:ring-zinc-400/50 focus-visible:ring-[3px] aria-invalid:ring-red-500/20 aria-invalid:border-red-500 transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-zinc-900 text-white [a&]:hover:bg-zinc-800",
        secondary:
          "bg-zinc-100 text-zinc-900 [a&]:hover:bg-zinc-200",
        destructive:
          "bg-red-500 text-white [a&]:hover:bg-red-600 focus-visible:ring-red-500/20",
        outline:
          "border-zinc-200 text-zinc-950 [a&]:hover:bg-zinc-100",
        ghost: "[a&]:hover:bg-zinc-100 [a&]:hover:text-zinc-900",
        link: "text-zinc-900 underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props} />
  );
}

export { Badge, badgeVariants }
