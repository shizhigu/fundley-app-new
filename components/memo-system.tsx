'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Plus, Edit3, Eye, GripHorizontal, StickyNote } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { markdownRenderer } from '@/lib/markdown-renderer';
import { useMermaid } from '@/hooks/use-mermaid';

// 示例Memo数据 - 使用String concatenation避免模板字符串问题
const TSLA_CONTENT = '# Tesla (TSLA) 财务分析要点\n\n' +
  '## 关键财务指标\n' +
  '- **毛利率**: ~19.3% (2023 Q4)\n' +
  '- **自由现金流**: $2.1B (季度)\n' +
  '- **交付量增长**: 38% YoY\n\n' +
  '## 风险因素\n' +
  '- [ ] 竞争加剧（传统车企转型）\n' +
  '- [ ] 中国市场政策变化\n' +
  '- [x] 产能利用率优化\n\n' +
  '## 估值模型\n\n' +
  '假设DCF模型中的增长率为 **15%**，计算公式：\n\n' +
  '$$PV = \\sum_{t=1}^{n} \\frac{FCF_t}{(1+r)^t}$$\n\n' +
  '其中：\n' +
  '- FCF_t = 第t年自由现金流\n' +
  '- r = 贴现率 (WACC ~8.5%)\n\n' +
  '**DCF估值框架：**\n\n' +
  '```mermaid\n' +
  'graph TD\n' +
  '    A[Revenue Growth 15%] --> B[Free Cash Flow]\n' +
  '    B --> C[Present Value Calculation]\n' +
  '    C --> D[Fair Value: $180-220]\n' +
  '    \n' +
  '    E[Key Assumptions] --> F[WACC: 8.5%]\n' +
  '    E --> G[Growth Rate: 15%]\n' +
  '    E --> H[Terminal Value: 3%]\n' +
  '    \n' +
  '    F --> C\n' +
  '    G --> C\n' +
  '    H --> C\n' +
  '```\n\n' +
  '```python\n' +
  '# 简化估值计算\n' +
  'fcf_growth = 0.15\n' +
  'wacc = 0.085\n' +
  'current_fcf = 2.1  # Billion\n\n' +
  'pv = sum(current_fcf * (1 + fcf_growth)**t / (1 + wacc)**t\n' +
  '         for t in range(1, 11))\n' +
  'print(f"Present Value: $" + "{pv:.2f}B")\n' +
  '```\n\n' +
  '> **结论**: 基于当前假设，目标价位区间为 $180-220\n\n' +
  '---\n' +
  '*最后更新: 2025年1月*';

const SAMPLE_MEMOS = [
  {
    id: 'memo-1',
    title: 'TSLA财务分析要点',
    content: TSLA_CONTENT,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'memo-2', 
    title: 'BYD vs TSLA 对比',
    content: `# BYD vs Tesla 对比分析

## 市场定位对比

| 维度 | Tesla | BYD |
|------|-------|-----|
| 技术路线 | 纯电+FSD | 混动+纯电 |
| 目标市场 | 高端消费者 | 大众市场 |
| 核心优势 | 软件+品牌 | 成本控制 |

## 关键数据点
- **BYD 2023销量**: 302万辆 (+61.9%)
- **Tesla 2023销量**: 181万辆 (+38%)
- **中国市场份额**: BYD 34.1% vs Tesla 7.2%

---
*研究笔记 - 持续更新中*`,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 3600000,
  }
];

interface MemoData {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

interface MemoWindowProps {
  memo: MemoData;
  onClose: () => void;
  onSave: (id: string, content: string) => void;
}

// 可拖拽的Memo窗口组件
function MemoWindow({ memo, onClose, onSave }: MemoWindowProps) {
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [size, setSize] = useState({ width: 630, height: 500 });
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(memo.content);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0 });

  // 设置默认高度为屏幕高度的2/3
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSize(prev => ({
        ...prev,
        height: Math.floor(window.innerHeight * 2 / 3)
      }));
    }
  }, []);

  // 拖拽处理
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.memo-header')) {
      setIsDragging(true);
      dragStart.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      setPosition({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleSave = () => {
    onSave(memo.id, content);
    setIsEditing(false);
  };

  const renderedContent = markdownRenderer.render(content);

  // 优化窗口大小变化时的Mermaid图表重渲染
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout;
    
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        // 重新处理当前窗口中的mermaid图表，使用更精确的选择器
        try {
          const memoWindow = document.querySelector(`[style*="left: ${position.x}px"][style*="top: ${position.y}px"]`);
          if (memoWindow) {
            const mermaidSvgs = memoWindow.querySelectorAll('.mermaid[data-processed="true"] svg');
            mermaidSvgs.forEach((svg: any) => {
              if (svg && svg.parentElement) {
                // 确保SVG继续自适应
                svg.style.width = '100%';
                svg.style.height = 'auto';
                svg.style.maxWidth = '100%';
              }
            });
          }
        } catch (error) {
          console.warn('Error adjusting mermaid charts on resize:', error);
        }
      }, 150); // 去抖动处理
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [position.x, position.y]);

  return (
    <div
      ref={dragRef}
      className="fixed z-50 bg-white/95 backdrop-blur-md border border-orange-200/50 rounded-lg shadow-xl"
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      {/* Header */}
      <div
        className="memo-header flex items-center justify-between p-3 bg-gradient-to-r from-orange-400/80 to-amber-400/80 backdrop-blur-sm rounded-t-lg cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-white/90" />
          <span className="text-sm font-medium text-white/90 truncate max-w-[300px]">
            {memo.title}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-white/80 hover:text-white hover:bg-white/20"
            onClick={() => {
              if (isEditing) {
                handleSave();
              } else {
                setIsEditing(true);
              }
            }}
          >
            {isEditing ? <Eye className="h-3 w-3" /> : <Edit3 className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-white/80 hover:text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isEditing ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-full p-4 bg-transparent border-0 outline-none resize-none text-sm font-mono"
            placeholder="输入 Markdown 内容..."
            style={{ height: size.height - 60 }}
          />
        ) : (
          <div 
            className="h-full overflow-auto p-4 memo-content prose prose-sm max-w-none"
            style={{ height: size.height - 60 }}
            dangerouslySetInnerHTML={{ __html: renderedContent }}
          />
        )}
      </div>

      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-50 hover:opacity-100"
        onMouseDown={(e) => {
          e.preventDefault();
          const startX = e.clientX;
          const startY = e.clientY;
          const startWidth = size.width;
          const startHeight = size.height;

          const handleResize = (e: MouseEvent) => {
            setSize({
              width: Math.max(400, startWidth + (e.clientX - startX)),
              height: Math.max(300, startHeight + (e.clientY - startY)),
            });
          };

          const handleStopResize = () => {
            document.removeEventListener('mousemove', handleResize);
            document.removeEventListener('mouseup', handleStopResize);
          };

          document.addEventListener('mousemove', handleResize);
          document.addEventListener('mouseup', handleStopResize);
        }}
      >
        <GripHorizontal className="h-3 w-3 text-gray-400 transform rotate-45" />
      </div>
    </div>
  );
}

// Memo列表组件
function MemoList({ memos, onOpenMemo }: { memos: MemoData[], onOpenMemo: (memo: MemoData) => void }) {
  return (
    <div className="w-80 bg-white/95 backdrop-blur-md border border-orange-200/50 rounded-lg shadow-lg">
      <div className="p-3 bg-gradient-to-r from-orange-400/80 to-amber-400/80 backdrop-blur-sm rounded-t-lg">
        <h3 className="text-sm font-medium text-white/90 flex items-center gap-2">
          <StickyNote className="h-4 w-4" />
          我的备忘录
        </h3>
      </div>
      
      <div className="max-h-96 overflow-auto">
        {memos.map((memo) => (
          <div
            key={memo.id}
            className="p-3 border-b border-gray-100 hover:bg-orange-50/50 cursor-pointer transition-colors"
            onClick={() => onOpenMemo(memo)}
          >
            <div className="font-medium text-sm text-gray-800 mb-1">{memo.title}</div>
            <div className="text-xs text-gray-500 line-clamp-2">
              {memo.content.split('\n')[0].replace(/[#*`]/g, '').substring(0, 100)}...
            </div>
            <div className="text-xs text-gray-400 mt-2">
              {new Date(memo.updatedAt).toLocaleDateString('zh-CN')}
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-3 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-orange-600 hover:text-orange-700 hover:bg-orange-50"
        >
          <Plus className="h-4 w-4 mr-2" />
          新建备忘录
        </Button>
      </div>
    </div>
  );
}

// 主组件
export function MemoSystem() {
  const [isOpen, setIsOpen] = useState(false);
  const [memos, setMemos] = useState<MemoData[]>(SAMPLE_MEMOS);
  const [openMemos, setOpenMemos] = useState<MemoData[]>([]);
  
  // 初始化Mermaid渲染
  useMermaid();

  const handleOpenMemo = (memo: MemoData) => {
    // 避免重复打开相同memo
    if (!openMemos.find(m => m.id === memo.id)) {
      setOpenMemos([...openMemos, memo]);
    }
    setIsOpen(false);
  };

  const handleCloseMemo = (memoId: string) => {
    setOpenMemos(openMemos.filter(m => m.id !== memoId));
  };

  const handleSaveMemo = (memoId: string, content: string) => {
    setMemos(memos.map(memo => 
      memo.id === memoId 
        ? { ...memo, content, updatedAt: Date.now() }
        : memo
    ));
    
    setOpenMemos(openMemos.map(memo => 
      memo.id === memoId 
        ? { ...memo, content, updatedAt: Date.now() }
        : memo
    ));
  };

  return (
    <>
      {/* 右下角触发按钮 */}
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "h-12 w-12 rounded-full shadow-lg transition-all duration-200",
            "bg-gradient-to-r from-orange-400 to-amber-400 hover:from-orange-500 hover:to-amber-500",
            "border-2 border-white/20 hover:scale-105",
            isOpen && "rotate-45"
          )}
        >
          <StickyNote className="h-5 w-5 text-white" />
        </Button>
      </div>

      {/* Memo列表弹窗 */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-40">
          <MemoList memos={memos} onOpenMemo={handleOpenMemo} />
        </div>
      )}

      {/* 打开的Memo窗口们 */}
      {openMemos.map((memo) => (
        <MemoWindow
          key={memo.id}
          memo={memo}
          onClose={() => handleCloseMemo(memo.id)}
          onSave={handleSaveMemo}
        />
      ))}
    </>
  );
}