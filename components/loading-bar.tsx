'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface LoadingBarProps {
  isLoading: boolean;
  className?: string;
}

export function LoadingBar({ isLoading, className = '' }: LoadingBarProps) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          exit={{ opacity: 0, scaleX: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className={`
            fixed top-0 left-0 right-0 h-[2px] z-50
            bg-gradient-to-r from-violet-500/80 via-blue-500/80 to-cyan-500/80
            shadow-[0_0_20px_rgba(139,92,246,0.3)]
            ${className}
          `}
          style={{ transformOrigin: 'left' }}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent w-1/4"
            animate={{
              x: ['-100%', '400%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// 高级毛玻璃版本 - 用于聊天界面
export function InlineLoadingBar({ isLoading, className = '' }: LoadingBarProps) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className={`
            h-[1px] relative overflow-hidden rounded-full
            bg-gradient-to-r from-violet-500/20 via-blue-500/30 to-cyan-500/20
            backdrop-blur-xl
            ${className}
          `}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-violet-400/40 via-blue-400/60 to-cyan-400/40 w-1/3"
            animate={{
              x: ['-100%', '300%'],
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: [0.4, 0, 0.2, 1],
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}