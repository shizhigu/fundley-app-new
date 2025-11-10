'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Textarea } from '@/components/ui/textarea'

interface MarkdownSectionEditorProps {
  content: string
  onSave: (markdown: string) => void
  onCancel?: () => void
}

/**
 * 极简 textarea 编辑器 - 无感自动保存
 *
 * 改进：
 * - 本地优先：立即更新本地 state，无延迟
 * - localStorage 备份：防止数据丢失
 * - 保存队列：防止并发请求冲突
 * - 静默重试：保存失败自动重试（用户无感）
 */
export function MarkdownSectionEditor({ content, onSave, onCancel }: MarkdownSectionEditorProps) {
  const [value, setValue] = useState(content)

  const lastSavedValue = useRef(content)
  const saveTimeoutRef = useRef<number>()
  const isSavingRef = useRef(false)
  const retryTimeoutRef = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 静默保存函数（无 UI 反馈）
  const performSave = useCallback(async (valueToSave: string) => {
    // 防止并发保存
    if (isSavingRef.current || valueToSave === lastSavedValue.current) {
      return
    }

    isSavingRef.current = true

    try {
      await onSave(valueToSave)
      lastSavedValue.current = valueToSave
      // 成功后从 localStorage 清除备份
      localStorage.removeItem(`block-edit-${content.slice(0, 50)}`)
    } catch (error) {
      console.error('Save failed, retrying...', error)
      // 静默重试一次（3秒后）
      // Clear existing retry timeout if any
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      retryTimeoutRef.current = window.setTimeout(() => {
        isSavingRef.current = false
        performSave(valueToSave)
        retryTimeoutRef.current = null
      }, 3000) as unknown as number
      return // 不设置 isSavingRef = false，等重试
    } finally {
      isSavingRef.current = false
    }
  }, [onSave, content])

  // localStorage 备份
  useEffect(() => {
    const key = `block-edit-${content.slice(0, 50)}`
    localStorage.setItem(key, value)
  }, [value, content])

  // 2秒 debounce 自动保存
  useEffect(() => {
    if (value === lastSavedValue.current) return

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      performSave(value)
    }, 2000) as unknown as number

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [value, performSave])

  // Escape 键退出
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (value !== lastSavedValue.current) {
          performSave(value)
        }
        setTimeout(() => onCancel?.(), 200)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [value, performSave, onCancel])

  // Cleanup retry timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div ref={containerRef}>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          if (value !== lastSavedValue.current) {
            performSave(value)
          }
          setTimeout(() => onCancel?.(), 200)
        }}
        autoFocus
        spellCheck="false"
        className="min-h-[160px] resize-y rounded-lg border-0 bg-transparent px-3 py-2 text-sm leading-relaxed focus-visible:ring-0 focus-visible:outline-none shadow-none hover:bg-muted/20 transition-colors"
        placeholder="在这里编写 Markdown 内容..."
      />
    </div>
  )
}
