"use client";

import React from "react";
import { cn } from "@/lib/utils";

export function Shimmer({
  className,
  duration = 2,
}: {
  className?: string;
  duration?: number;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 -z-10 overflow-hidden rounded-xl pointer-events-none",
        className
      )}
    >
      <div
        className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/10 to-transparent"
        style={{
          animation: `shimmer ${duration}s infinite`,
        }}
      />
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}

export function ShimmerButton({
  children,
  className,
  shimmerClassName,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  shimmerClassName?: string;
}) {
  return (
    <button
      className={cn(
        "relative overflow-hidden rounded-lg transition-all",
        className
      )}
      {...props}
    >
      {/* Shimmer effect */}
      <Shimmer className={shimmerClassName} />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </button>
  );
}
