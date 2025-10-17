'use client'

import { useEffect, useRef, useState } from 'react'

import { Textarea } from '@/components/ui/textarea'

interface MarkdownSectionEditorProps {
  content: string
  onSave: (markdown: string) => void
  onCancel?: () => void
}

/**
 * Minimal textarea-based editor with a light debounce before persisting changes.
 */
export function MarkdownSectionEditor({ content, onSave, onCancel }: MarkdownSectionEditorProps) {
  const [value, setValue] = useState(content)
  const lastPersisted = useRef(content)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setValue(content)
    lastPersisted.current = content
  }, [content])

  useEffect(() => {
    if (value === lastPersisted.current) return

    const timeout = window.setTimeout(() => {
      lastPersisted.current = value
      onSave(value)
    }, 400)

    return () => window.clearTimeout(timeout)
  }, [value, onSave])

  // Handle Escape key to exit editing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Save before exit
        if (value !== lastPersisted.current) {
          lastPersisted.current = value
          onSave(value)
        }
        onCancel?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [value, onSave, onCancel])

  return (
    <div ref={containerRef}>
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => {
          // Save and exit on blur
          if (value !== lastPersisted.current) {
            lastPersisted.current = value
            onSave(value)
          }
          // Exit editing mode after a short delay to allow save
          setTimeout(() => {
            onCancel?.()
          }, 100)
        }}
        autoFocus
        spellCheck="false"
        className="min-h-[160px] resize-y rounded-lg border-0 bg-transparent px-3 py-2 text-sm leading-relaxed focus-visible:ring-0 focus-visible:outline-none shadow-none hover:bg-muted/20 transition-colors"
        placeholder="在这里编写 Markdown 内容..."
      />
    </div>
  )
}
