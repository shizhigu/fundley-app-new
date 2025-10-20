"use client";

import React from "react";
import { cn } from "@/lib/utils";

export function GridBackground({
  children,
  className,
  containerClassName,
  gridClassName,
}: {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  gridClassName?: string;
}) {
  return (
    <div className={cn("relative w-full h-full", containerClassName)}>
      {/* Grid pattern */}
      <div
        className={cn(
          "absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]",
          gridClassName
        )}
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.05), transparent 70%)`,
        }}
      />

      {/* Content */}
      <div className={cn("relative z-10", className)}>{children}</div>
    </div>
  );
}

export function DotPattern({
  children,
  className,
  containerClassName,
  dotClassName,
}: {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  dotClassName?: string;
}) {
  return (
    <div className={cn("relative w-full h-full", containerClassName)}>
      {/* Dot pattern */}
      <div
        className={cn(
          "absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]",
          dotClassName
        )}
        style={{
          backgroundImage: `radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)`,
          backgroundSize: "30px 30px",
        }}
      />

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.05), transparent 70%)`,
        }}
      />

      {/* Content */}
      <div className={cn("relative z-10", className)}>{children}</div>
    </div>
  );
}

export function GridSmallBackground({
  children,
  className,
  containerClassName,
}: {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
}) {
  return (
    <div
      className={cn(
        "relative w-full h-full bg-background dark:bg-background",
        containerClassName
      )}
    >
      {/* Small grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.3]"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px",
        }}
      />

      {/* Content */}
      <div className={cn("relative z-10", className)}>{children}</div>
    </div>
  );
}
