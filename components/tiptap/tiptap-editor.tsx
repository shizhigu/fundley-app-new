'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import { FloatingMenu, BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import { useState } from 'react'
import { AiAnalysisBlock } from './extensions/ai-analysis-block'
import { ChartBlock } from './extensions/chart-block'
import { FinancialMetricsBlock } from './extensions/financial-metrics-block'
import { DataTableBlock } from './extensions/data-table-block'
import { Brain, BarChart3, Calculator, Database } from 'lucide-react'

interface TiptapEditorProps {
  content?: string
  onChange?: (content: string) => void
  editable?: boolean
  placeholder?: string
}

const TiptapEditor = ({ 
  content = '<p>开始写作...</p>', 
  onChange,
  editable = true,
  placeholder = '在这里输入内容...'
}: TiptapEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6]
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      AiAnalysisBlock,
      ChartBlock,
      FinancialMetricsBlock,
      DataTableBlock,
      // SlashCommand, // Temporarily disabled - complex ProseMirror plugin issue
    ],
    content,
    editable,
    // 关键！避免SSR问题
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange?.(html)
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] p-4',
        'data-placeholder': placeholder,
      },
    },
  })

  // 根据官方文档，简单检查editor是否存在
  if (!editor) {
    return null
  }

  return (
    <div className="tiptap-editor border border-gray-200 rounded-lg overflow-hidden">
      {/* 工具栏 */}
      {editable && (
        <div className="border-b border-gray-200 p-2 bg-gray-50 flex flex-wrap gap-1">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              editor.isActive('bold') 
                ? 'bg-blue-100 text-blue-700' 
                : 'hover:bg-gray-200 text-gray-700'
            }`}
          >
            B
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`px-3 py-1 rounded text-sm italic transition-colors ${
              editor.isActive('italic') 
                ? 'bg-blue-100 text-blue-700' 
                : 'hover:bg-gray-200 text-gray-700'
            }`}
          >
            I
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`px-3 py-1 rounded text-sm line-through transition-colors ${
              editor.isActive('strike') 
                ? 'bg-blue-100 text-blue-700' 
                : 'hover:bg-gray-200 text-gray-700'
            }`}
          >
            S
          </button>
          <div className="w-px h-6 bg-gray-300 mx-1" />
          {[1, 2, 3].map((level) => (
            <button
              key={level}
              onClick={() => editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run()}
              className={`px-3 py-1 rounded text-sm font-bold transition-colors ${
                editor.isActive('heading', { level }) 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'hover:bg-gray-200 text-gray-700'
              }`}
            >
              H{level}
            </button>
          ))}
          <div className="w-px h-6 bg-gray-300 mx-1" />
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              editor.isActive('bulletList') 
                ? 'bg-blue-100 text-blue-700' 
                : 'hover:bg-gray-200 text-gray-700'
            }`}
          >
            • 列表
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              editor.isActive('orderedList') 
                ? 'bg-blue-100 text-blue-700' 
                : 'hover:bg-gray-200 text-gray-700'
            }`}
          >
            1. 列表
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              editor.isActive('blockquote') 
                ? 'bg-blue-100 text-blue-700' 
                : 'hover:bg-gray-200 text-gray-700'
            }`}
          >
            引用
          </button>
          <div className="w-px h-6 bg-gray-300 mx-1" />
          <button
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`px-3 py-1 rounded text-sm font-mono transition-colors ${
              editor.isActive('codeBlock') 
                ? 'bg-blue-100 text-blue-700' 
                : 'hover:bg-gray-200 text-gray-700'
            }`}
          >
            代码块
          </button>
          
          <div className="w-px h-6 bg-gray-300 mx-1" />
          {/* AI功能块按钮 */}
          <button
            onClick={() => {
              editor.chain().focus().insertContent('<div data-type="ai-analysis"></div>').run()
            }}
            className="px-3 py-1 rounded text-sm transition-colors hover:bg-blue-50 text-blue-700 flex items-center gap-1"
          >
            <Brain className="w-3 h-3" />
            AI分析
          </button>
          <button
            onClick={() => {
              editor.chain().focus().insertContent('<div data-type="chart-block"></div>').run()
            }}
            className="px-3 py-1 rounded text-sm transition-colors hover:bg-green-50 text-green-700 flex items-center gap-1"
          >
            <BarChart3 className="w-3 h-3" />
            图表
          </button>
          <button
            onClick={() => {
              editor.chain().focus().insertContent('<div data-type="financial-metrics"></div>').run()
            }}
            className="px-3 py-1 rounded text-sm transition-colors hover:bg-purple-50 text-purple-700 flex items-center gap-1"
          >
            <Calculator className="w-3 h-3" />
            指标
          </button>
          <button
            onClick={() => {
              editor.chain().focus().insertContent('<div data-type="data-table"></div>').run()
            }}
            className="px-3 py-1 rounded text-sm transition-colors hover:bg-emerald-50 text-emerald-700 flex items-center gap-1"
          >
            <Database className="w-3 h-3" />
            表格
          </button>
        </div>
      )}

      {/* 编辑器内容区域 */}
      <div className="relative">
        <EditorContent editor={editor} />
        
        {/* 浮动菜单 - 空行时显示 */}
        {editable && editor && (
          <>
            <FloatingMenu editor={editor}>
              <div className="flex bg-white border border-gray-200 rounded-lg shadow-lg p-1 gap-1">
                <button
                  onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  className="p-2 hover:bg-gray-100 rounded text-sm"
                >
                  标题
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  className="p-2 hover:bg-gray-100 rounded text-sm"
                >
                  列表
                </button>
                <div className="w-px h-6 bg-gray-300 mx-1 self-center" />
                <button
                  onClick={() => {
                    editor.chain().focus().insertContent('<div data-type="ai-analysis"></div>').run()
                  }}
                  className="p-2 hover:bg-blue-50 rounded text-sm text-blue-700 flex items-center gap-1"
                >
                  <Brain className="w-3 h-3" />
                  AI分析
                </button>
                <button
                  onClick={() => {
                    editor.chain().focus().insertContent('<div data-type="chart-block"></div>').run()
                  }}
                  className="p-2 hover:bg-green-50 rounded text-sm text-green-700 flex items-center gap-1"
                >
                  <BarChart3 className="w-3 h-3" />
                  图表
                </button>
                <button
                  onClick={() => {
                    editor.chain().focus().insertContent('<div data-type="financial-metrics"></div>').run()
                  }}
                  className="p-2 hover:bg-purple-50 rounded text-sm text-purple-700 flex items-center gap-1"
                >
                  <Calculator className="w-3 h-3" />
                  指标
                </button>
                <button
                  onClick={() => {
                    editor.chain().focus().insertContent('<div data-type="data-table"></div>').run()
                  }}
                  className="p-2 hover:bg-emerald-50 rounded text-sm text-emerald-700 flex items-center gap-1"
                >
                  <Database className="w-3 h-3" />
                  表格
                </button>
              </div>
            </FloatingMenu>

            <BubbleMenu editor={editor}>
              <div className="flex bg-black text-white rounded-lg shadow-lg p-1">
                <button
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={`p-2 hover:bg-gray-700 rounded text-sm ${
                    editor.isActive('bold') ? 'bg-gray-600' : ''
                  }`}
                >
                  粗体
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={`p-2 hover:bg-gray-700 rounded text-sm ${
                    editor.isActive('italic') ? 'bg-gray-600' : ''
                  }`}
                >
                  斜体
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleStrike().run()}
                  className={`p-2 hover:bg-gray-700 rounded text-sm ${
                    editor.isActive('strike') ? 'bg-gray-600' : ''
                  }`}
                >
                  删除线
                </button>
              </div>
            </BubbleMenu>
          </>
        )}
      </div>
    </div>
  )
}

export default TiptapEditor