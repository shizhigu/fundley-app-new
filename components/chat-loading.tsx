'use client';

import { motion } from 'framer-motion';

export function ChatLoading() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-6">
      <div className="flex gap-2">
        <motion.div
          className="w-3 h-3 bg-blue-500 dark:bg-blue-400 rounded-full"
          animate={{
            y: [0, -12, 0],
          }}
          transition={{
            duration: 0.6,
            repeat: Number.POSITIVE_INFINITY,
            repeatDelay: 0.1,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="w-3 h-3 bg-blue-500 dark:bg-blue-400 rounded-full"
          animate={{
            y: [0, -12, 0],
          }}
          transition={{
            duration: 0.6,
            repeat: Number.POSITIVE_INFINITY,
            repeatDelay: 0.1,
            ease: "easeInOut",
            delay: 0.2,
          }}
        />
        <motion.div
          className="w-3 h-3 bg-blue-500 dark:bg-blue-400 rounded-full"
          animate={{
            y: [0, -12, 0],
          }}
          transition={{
            duration: 0.6,
            repeat: Number.POSITIVE_INFINITY,
            repeatDelay: 0.1,
            ease: "easeInOut",
            delay: 0.4,
          }}
        />
      </div>
      <p className="text-sm text-muted-foreground">Loading messages...</p>
    </div>
  );
}