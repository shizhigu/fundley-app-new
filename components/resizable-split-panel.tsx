'use client';

import React, { useState, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

interface ResizableSplitPanelProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  defaultLeftWidth?: number; // 默认左侧宽度百分比 (0-100)
  minLeftWidth?: number; // 最小左侧宽度百分比
  minRightWidth?: number; // 最小右侧宽度百分比
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
  // 从localStorage获取保存的宽度和收起状态
  const [leftWidth, setLeftWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('splitPanel.leftWidth');
      return saved ? parseFloat(saved) : defaultLeftWidth;
    }
    return defaultLeftWidth;
  });

  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('splitPanel.isRightPanelCollapsed');
      return saved === 'true';
    }
    return false;
  });

  const [isDragging, setIsDragging] = useState(false);
  const [lastLeftWidth, setLastLeftWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('splitPanel.lastLeftWidth');
      return saved ? parseFloat(saved) : defaultLeftWidth;
    }
    return defaultLeftWidth;
  });

  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

    // 确保在最小和最大范围内
    const clampedWidth = Math.max(
      minLeftWidth,
      Math.min(100 - minRightWidth, newLeftWidth)
    );

    setLeftWidth(clampedWidth);
    // 保存到localStorage
    localStorage.setItem('splitPanel.leftWidth', clampedWidth.toString());
  }, [isDragging, minLeftWidth, minRightWidth]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 添加全局鼠标事件监听
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // 切换右侧面板收起/展开
  const toggleRightPanel = useCallback(() => {
    if (isRightPanelCollapsed) {
      // 展开：恢复之前的宽度
      setLeftWidth(lastLeftWidth);
      setIsRightPanelCollapsed(false);
      localStorage.setItem('splitPanel.leftWidth', lastLeftWidth.toString());
      localStorage.setItem('splitPanel.isRightPanelCollapsed', 'false');
    } else {
      // 收起：保存当前宽度，设置为100%
      setLastLeftWidth(leftWidth);
      setLeftWidth(100);
      setIsRightPanelCollapsed(true);
      localStorage.setItem('splitPanel.lastLeftWidth', leftWidth.toString());
      localStorage.setItem('splitPanel.leftWidth', '100');
      localStorage.setItem('splitPanel.isRightPanelCollapsed', 'true');
    }
  }, [isRightPanelCollapsed, leftWidth, lastLeftWidth]);

  const rightWidth = isRightPanelCollapsed ? 0 : 100 - leftWidth;

  return (
    <div ref={containerRef} className={`flex h-full relative ${className}`}>
      {/* 左侧面板 */}
      <div
        className="flex-shrink-0 min-w-0 border-r border-border"
        style={{ width: `${leftWidth}%` }}
      >
        {leftPanel}
      </div>

      {/* 拖拽分隔条 */}
      {!isRightPanelCollapsed && (
        <div
          className={`
            relative flex-shrink-0 w-1 bg-border hover:bg-primary/20 cursor-col-resize
            transition-colors duration-200 group
            ${isDragging ? 'bg-primary/30' : ''}
          `}
          onMouseDown={handleMouseDown}
        >
          {/* 拖拽手柄 - 在中央显示三个点 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="flex flex-col space-y-1 opacity-40 group-hover:opacity-80 transition-opacity">
              <div className="w-1 h-1 bg-foreground/60 rounded-full"></div>
              <div className="w-1 h-1 bg-foreground/60 rounded-full"></div>
              <div className="w-1 h-1 bg-foreground/60 rounded-full"></div>
            </div>
          </div>

          {/* 扩展的拖拽区域 - 增加拖拽目标的大小 */}
          <div className="absolute inset-y-0 -left-1 -right-1 cursor-col-resize" />
        </div>
      )}

      {/* 右侧面板 */}
      {!isRightPanelCollapsed && (
        <div
          className="flex-shrink-0 min-w-0 bg-transparent"
          style={{ width: `${rightWidth}%` }}
        >
          {rightPanel}
        </div>
      )}

      {/* 展开/收起按钮 - 放在分割线上 */}
      {!isRightPanelCollapsed && (
        <Button
          variant="outline"
          size="sm"
          className="absolute top-1/2 -translate-y-1/2 z-20 h-8 w-6 p-0 bg-background/90 backdrop-blur-sm border border-gray-200 hover:bg-background hover:border-gray-300 hover:shadow-md transition-all duration-300 ease-in-out hover:scale-110 rounded-md shadow-sm"
          style={{
            left: `${leftWidth}%`,
            transform: 'translate(-50%, -50%)'
          }}
          onClick={toggleRightPanel}
          title="收起右侧面板"
        >
          <div className="transition-transform duration-200 ease-in-out">
            <ChevronRight className="h-4 w-4" />
          </div>
        </Button>
      )}

      {/* 展开按钮 - 右侧面板收起时显示 */}
      {isRightPanelCollapsed && (
        <Button
          variant="outline"
          size="sm"
          className="absolute top-1/2 right-4 -translate-y-1/2 z-10 h-8 w-6 p-0 bg-background/90 backdrop-blur-sm border border-gray-200 hover:bg-background hover:border-gray-300 hover:shadow-md transition-all duration-300 ease-in-out hover:scale-110 rounded-md shadow-sm"
          onClick={toggleRightPanel}
          title="展开右侧面板"
        >
          <div className="transition-transform duration-200 ease-in-out">
            <ChevronLeft className="h-4 w-4" />
          </div>
        </Button>
      )}
    </div>
  );
}