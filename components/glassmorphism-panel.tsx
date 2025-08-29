'use client';

import type { ReactNode } from 'react';

interface GlassmorphismPanelProps {
  children: ReactNode;
}

export function GlassmorphismPanel({ children }: GlassmorphismPanelProps) {
  return (
    <div className="w-64 h-screen bg-transparent backdrop-blur-sm p-3">
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/50 h-[calc(100vh-1.5rem)] flex flex-col overflow-hidden relative">
        {children}
      </div>
    </div>
  );
}