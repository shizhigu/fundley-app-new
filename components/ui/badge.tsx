import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-all duration-300 ease-out focus:outline-none",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-[3px_3px_6px_rgba(255,107,26,0.15),-2px_-2px_4px_rgba(255,255,255,0.1)] hover:shadow-[4px_4px_8px_rgba(255,107,26,0.2),-2px_-2px_6px_rgba(255,255,255,0.15)]",
        secondary:
          "neuro-raised-sm bg-gradient-to-br from-gray-100 to-gray-200 text-foreground",
        destructive:
          "neuro-raised-sm bg-gradient-to-br from-red-500 to-red-600 text-white shadow-[3px_3px_6px_rgba(239,68,68,0.15),-2px_-2px_4px_rgba(255,255,255,0.1)]",
        outline: "neuro-raised-sm bg-gradient-to-br from-white to-gray-50 text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }