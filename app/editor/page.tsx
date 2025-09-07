'use client'

import { useState } from 'react'
import TiptapEditor from '@/components/tiptap/tiptap-editor'

export default function EditorPage() {
  const [content, setContent] = useState('<h1>欢迎使用 TipTap 编辑器</h1><p>这是一个功能强大的富文本编辑器，支持：</p><ul><li><strong>粗体</strong> 和 <em>斜体</em> 文本</li><li>多级标题</li><li>有序和无序列表</li><li>引用块</li><li>代码块</li></ul><blockquote><p>你可以开始编辑这些内容，体验编辑器的各种功能！</p></blockquote>')
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit')

  const handleContentChange = (newContent: string) => {
    setContent(newContent)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面标题栏 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">TipTap 编辑器</h1>
              <p className="mt-1 text-sm text-gray-500">
                基于 ProseMirror 的现代富文本编辑器
              </p>
            </div>
            
            {/* 视图切换按钮 */}
            <div className="flex rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => setViewMode('edit')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'edit'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                编辑模式
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'preview'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                预览模式
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm">
          <TiptapEditor
            content={content}
            onChange={handleContentChange}
            editable={viewMode === 'edit'}
            placeholder="开始写作..."
          />
        </div>

        {/* 功能说明 */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">编辑器功能</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h3 className="font-medium mb-2">文本格式化:</h3>
              <ul className="space-y-1">
                <li>• <kbd className="bg-blue-100 px-1 rounded">Ctrl/Cmd + B</kbd> - 粗体</li>
                <li>• <kbd className="bg-blue-100 px-1 rounded">Ctrl/Cmd + I</kbd> - 斜体</li>
                <li>• <kbd className="bg-blue-100 px-1 rounded">Ctrl/Cmd + Shift + S</kbd> - 删除线</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">结构化内容:</h3>
              <ul className="space-y-1">
                <li>• <kbd className="bg-blue-100 px-1 rounded">Ctrl/Cmd + Alt + 1-6</kbd> - 标题</li>
                <li>• <kbd className="bg-blue-100 px-1 rounded">Ctrl/Cmd + Shift + 8</kbd> - 无序列表</li>
                <li>• <kbd className="bg-blue-100 px-1 rounded">Ctrl/Cmd + Shift + 7</kbd> - 有序列表</li>
                <li>• <kbd className="bg-blue-100 px-1 rounded">Ctrl/Cmd + Shift + {'>'}</kbd> - 引用</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 原始HTML显示（开发调试用） */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 bg-gray-100 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">生成的HTML（开发模式）</h2>
            <pre className="text-xs bg-white p-4 rounded border overflow-auto max-h-40">
              <code>{content}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}