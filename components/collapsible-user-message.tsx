'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleUserMessageProps {
  content: string;
  maxLines?: number; // 默认显示的最大行数
  maxChars?: number; // 默认显示的最大字符数
}

export function CollapsibleUserMessage({
  content,
  maxLines = 3,
  maxChars = 200,
}: CollapsibleUserMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // 判断是否需要折叠（基于字符数或行数）
  const lines = content.split('\n');
  const needsCollapse = content.length > maxChars || lines.length > maxLines;

  // 如果不需要折叠，直接显示全部内容
  if (!needsCollapse) {
    return <div className="whitespace-pre-wrap">{content}</div>;
  }

  // 生成预览内容（只显示前几行或前N个字符）
  const getPreviewContent = () => {
    if (lines.length > maxLines) {
      // 基于行数截断
      return lines.slice(0, maxLines).join('\n');
    } else {
      // 基于字符数截断
      return content.slice(0, maxChars);
    }
  };

  const previewContent = getPreviewContent();

  return (
    <div className="w-full">
      <div className="whitespace-pre-wrap">
        {isExpanded ? content : previewContent}
        {!isExpanded && <span className="text-muted-foreground">...</span>}
      </div>

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-md",
          "text-xs font-medium text-muted-foreground",
          "hover:text-foreground hover:bg-muted/50",
          "transition-all duration-150"
        )}
      >
        {isExpanded ? (
          <>
            <ChevronUp className="h-3 w-3" />
            <span>收起</span>
          </>
        ) : (
          <>
            <ChevronDown className="h-3 w-3" />
            <span>展开</span>
          </>
        )}
      </button>
    </div>
  );
}
