'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

interface ResizableSplitPanelProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  defaultLeftWidth?: number;
  minLeftWidth?: number;
  minRightWidth?: number;
  className?: string;
}

export function ResizableSplitPanel({
  leftPanel,
  rightPanel,
  defaultLeftWidth = 50,
  minLeftWidth = 20,
  minRightWidth = 20,
  className = '',
}: ResizableSplitPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Initialize state from localStorage with robust error handling
  const [leftWidth, setLeftWidth] = useState(() => {
    if (typeof window === 'undefined') return defaultLeftWidth;

    try {
      const saved = localStorage.getItem('splitPanel.leftWidth');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= minLeftWidth && parsed <= 100 - minRightWidth) {
          return parsed;
        }
      }
    } catch (error) {
      console.warn('Failed to load split panel width from localStorage:', error);
    }

    return defaultLeftWidth;
  });

  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;

    try {
      const saved = localStorage.getItem('splitPanel.isRightPanelCollapsed');
      return saved === 'true';
    } catch (error) {
      console.warn('Failed to load collapsed state from localStorage:', error);
      return false;
    }
  });

  const [lastLeftWidth, setLastLeftWidth] = useState(() => {
    if (typeof window === 'undefined') return defaultLeftWidth;

    try {
      const saved = localStorage.getItem('splitPanel.lastLeftWidth');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= minLeftWidth && parsed <= 100 - minRightWidth) {
          return parsed;
        }
      }
    } catch (error) {
      console.warn('Failed to load last width from localStorage:', error);
    }

    return defaultLeftWidth;
  });

  // Save to localStorage with error handling
  const saveToLocalStorage = useCallback((key: string, value: string) => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn(`Failed to save ${key} to localStorage:`, error);
    }
  }, []);

  // Mouse down handler
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  // Mouse move handler with boundary constraints
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;

    if (containerWidth === 0) return; // Prevent division by zero

    const newLeftWidth = ((e.clientX - containerRect.left) / containerWidth) * 100;

    // Clamp within constraints
    const clampedWidth = Math.max(
      minLeftWidth,
      Math.min(100 - minRightWidth, newLeftWidth)
    );

    setLeftWidth(clampedWidth);
    saveToLocalStorage('splitPanel.leftWidth', clampedWidth.toString());
  }, [isDragging, minLeftWidth, minRightWidth, saveToLocalStorage]);

  // Mouse up handler
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Global mouse event listeners with cleanup
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Toggle right panel collapse/expand
  const toggleRightPanel = useCallback(() => {
    if (isRightPanelCollapsed) {
      // Expand: restore previous width
      setLeftWidth(lastLeftWidth);
      setIsRightPanelCollapsed(false);
      saveToLocalStorage('splitPanel.leftWidth', lastLeftWidth.toString());
      saveToLocalStorage('splitPanel.isRightPanelCollapsed', 'false');
    } else {
      // Collapse: save current width and set to 100%
      setLastLeftWidth(leftWidth);
      setLeftWidth(100);
      setIsRightPanelCollapsed(true);
      saveToLocalStorage('splitPanel.lastLeftWidth', leftWidth.toString());
      saveToLocalStorage('splitPanel.leftWidth', '100');
      saveToLocalStorage('splitPanel.isRightPanelCollapsed', 'true');
    }
  }, [isRightPanelCollapsed, leftWidth, lastLeftWidth, saveToLocalStorage]);

  const rightWidth = isRightPanelCollapsed ? 0 : 100 - leftWidth;

  return (
    <div ref={containerRef} className={`flex h-full relative ${className}`}>
      {/* Left Panel */}
      <div
        className="flex-shrink-0 min-w-0 overflow-hidden"
        style={{ width: `${leftWidth}%` }}
      >
        {leftPanel}
      </div>

      {/* Divider - Ultra Clean 2025 Design */}
      {!isRightPanelCollapsed && (
        <div
          className={`
            relative flex-shrink-0 w-0.5 cursor-col-resize transition-colors duration-200
            ${isDragging ? 'bg-brand-primary/30' : 'bg-border hover:bg-brand-primary/30'}
          `}
          onMouseDown={handleMouseDown}
        >
          {/* Extended hit area for easier dragging */}
          <div className="absolute inset-y-0 -left-2 -right-2 cursor-col-resize" />
        </div>
      )}

      {/* Right Panel */}
      {!isRightPanelCollapsed && (
        <div
          className="flex-shrink-0 min-w-0 overflow-hidden"
          style={{ width: `${rightWidth}%` }}
        >
          {rightPanel}
        </div>
      )}

      {/* Collapse Button - Positioned at divider */}
      {!isRightPanelCollapsed && (
        <Button
          variant="outline"
          size="sm"
          className="
            absolute top-1/2 z-20 h-8 w-6 p-0
            bg-background border-border
            hover:border-brand-primary/30
            transition-all duration-200
            rounded-md
          "
          style={{
            left: `${leftWidth}%`,
            transform: 'translate(-50%, -50%)'
          }}
          onClick={toggleRightPanel}
          title="Collapse right panel"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* Expand Button - Shown when right panel is collapsed */}
      {isRightPanelCollapsed && (
        <Button
          variant="outline"
          size="sm"
          className="
            absolute top-1/2 right-4 z-10 h-8 w-6 p-0
            bg-background border-border
            hover:border-brand-primary/30
            transition-all duration-200
            rounded-md
          "
          style={{ transform: 'translateY(-50%)' }}
          onClick={toggleRightPanel}
          title="Expand right panel"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
