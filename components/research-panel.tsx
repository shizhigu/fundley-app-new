'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import TiptapEditor from '@/components/tiptap/tiptap-editor';
import { FileText } from 'lucide-react';

export function ResearchPanel() {
  const [content, setContent] = useState('<h3>投资调研报告</h3><p>开始写作您的投资调研报告...</p>');

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Editor Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">调研报告</span>
        </div>
        <Button size="sm" variant="outline" className="text-xs">
          保存
        </Button>
      </div>

      {/* TipTap Editor */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className="h-full">
          <TiptapEditor
            content={content}
            onChange={handleContentChange}
            editable={true}
            placeholder="开始写作你的投资调研报告..."
          />
        </div>
      </div>
    </div>
  );
}