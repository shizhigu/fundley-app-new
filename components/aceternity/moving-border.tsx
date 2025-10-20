"use client";

import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function MovingBorder({
  children,
  duration = 2000,
  className,
  containerClassName,
  borderRadius = "1.75rem",
  borderClassName,
  ...otherProps
}: {
  children: React.ReactNode;
  duration?: number;
  className?: string;
  containerClassName?: string;
  borderRadius?: string;
  borderClassName?: string;
  as?: any;
} & React.HTMLAttributes<HTMLButtonElement>) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      className={cn(
        "relative text-xl p-[1px] overflow-hidden",
        containerClassName
      )}
      style={{
        borderRadius: borderRadius,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...otherProps}
    >
      <div
        className="absolute inset-0"
        style={{ borderRadius: `calc(${borderRadius} * 0.96)` }}
      >
        <MovingBorderAnimation duration={duration} hovered={hovered}>
          <div
            className={cn(
              "h-20 w-20 opacity-[0.8] bg-[radial-gradient(hsl(var(--primary))_40%,transparent_60%)]",
              borderClassName
            )}
          />
        </MovingBorderAnimation>
      </div>

      <div
        className={cn(
          "relative bg-background border border-border backdrop-blur-xl text-foreground flex items-center justify-center w-full h-full antialiased",
          className
        )}
        style={{
          borderRadius: `calc(${borderRadius} * 0.96)`,
        }}
      >
        {children}
      </div>
    </button>
  );
}

export const MovingBorderAnimation = ({
  children,
  duration = 2000,
  hovered = false,
}: {
  children: React.ReactNode;
  duration?: number;
  hovered?: boolean;
}) => {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      initial={{
        rotate: 0,
      }}
      animate={{
        rotate: hovered ? 360 : 0,
      }}
      transition={{
        duration: duration / 1000,
        repeat: Infinity,
        ease: "linear",
      }}
    >
      {children}
    </motion.div>
  );
};
