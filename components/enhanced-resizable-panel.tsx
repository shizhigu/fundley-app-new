'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeft, PanelRight, GripVertical } from 'lucide-react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EnhancedResizablePanelProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode | ((onCollapse: () => void) => React.ReactNode);
  defaultLeftSize?: number;
  minLeftSize?: number;
  minRightSize?: number;
  className?: string;
}

export function EnhancedResizablePanel({
  leftPanel,
  rightPanel,
  defaultLeftSize = 55,
  minLeftSize = 30,
  minRightSize = 25,
  className = '',
}: EnhancedResizablePanelProps) {
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [isHoveringHandle, setIsHoveringHandle] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('panel.rightCollapsed');
    if (saved === 'true') {
      setIsRightCollapsed(true);
    }
  }, []);

  // Keyboard shortcut: Cmd/Ctrl + B to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        toggleRightPanel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRightCollapsed]);

  const toggleRightPanel = () => {
    const newState = !isRightCollapsed;
    setIsRightCollapsed(newState);
    localStorage.setItem('panel.rightCollapsed', String(newState));
  };

  return (
    <div className={cn('relative h-full w-full', className)}>
      <ResizablePanelGroup
        direction="horizontal"
        className="h-full w-full"
        onLayout={(sizes) => {
          // Save panel sizes to localStorage
          if (sizes.length >= 2 && !isRightCollapsed) {
            localStorage.setItem('panel.sizes', JSON.stringify(sizes));
          }
        }}
      >
        {/* Left Panel */}
        <ResizablePanel
          defaultSize={defaultLeftSize}
          minSize={minLeftSize}
          className="relative"
        >
          {leftPanel}
        </ResizablePanel>

        {/* Resizable Handle - Enhanced Design */}
        {!isRightCollapsed && (
          <ResizableHandle
            className="group relative w-px bg-border data-[resize-handle-active]:bg-primary transition-colors"
            onMouseEnter={() => setIsHoveringHandle(true)}
            onMouseLeave={() => setIsHoveringHandle(false)}
          >
            {/* Extended hover area */}
            <div className="absolute inset-y-0 -left-2 -right-2 z-10" />

            {/* Animated grip indicator */}
            <AnimatePresence>
              {isHoveringHandle && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
                >
                  <div className="flex items-center justify-center w-8 h-16 rounded-md bg-background border border-border shadow-lg">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Toggle button on handle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8 rounded-full bg-background border border-border shadow-md',
                  'hover:bg-muted hover:border-primary/50',
                  'transition-all duration-200',
                  'opacity-0 group-hover:opacity-100'
                )}
                onClick={toggleRightPanel}
                title="Collapse right panel"
              >
                <PanelRight className="h-4 w-4" />
              </Button>
            </div>
          </ResizableHandle>
        )}

        {/* Right Panel */}
        {!isRightCollapsed && (
          <ResizablePanel
            defaultSize={100 - defaultLeftSize}
            minSize={minRightSize}
            className="relative"
          >
            {typeof rightPanel === 'function' ? rightPanel(toggleRightPanel) : rightPanel}
          </ResizablePanel>
        )}
      </ResizablePanelGroup>

      {/* Floating expand button when collapsed */}
      <AnimatePresence>
        {isRightCollapsed && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="absolute top-1/2 right-4 -translate-y-1/2 z-50"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="icon"
                  className={cn(
                    'h-10 w-10 rounded-full shadow-lg',
                    'bg-primary hover:bg-primary/90',
                    'border-2 border-primary-foreground/10',
                    'transition-all duration-200',
                    'hover:scale-110 active:scale-95'
                  )}
                  onClick={toggleRightPanel}
                >
                  <PanelLeft className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p className="text-xs">
                  Open panel <kbd className="ml-1 px-1 py-0.5 bg-muted rounded text-xs">⌘B</kbd>
                </p>
              </TooltipContent>
            </Tooltip>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
