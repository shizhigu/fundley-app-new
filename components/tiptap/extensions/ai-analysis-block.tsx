'use client'

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Brain, Zap, BarChart3, TrendingUp } from 'lucide-react'
import { useState } from 'react'

// AI分析块的React组件
const AiAnalysisBlockComponent = ({ node, updateAttributes, deleteNode }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState(node.attrs.result || '')

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    // 模拟AI分析过程
    setTimeout(() => {
      const mockResult = `
        根据分析，苹果公司(AAPL)的财务表现显示：
        
        📈 **营收增长**: 过去5年CAGR为8.2%，表现稳健
        💰 **盈利能力**: 净利润率保持在25%以上，行业领先
        📊 **现金流**: 自由现金流充足，支撑股息和回购
        
        **投资建议**: 基于强劲的基本面，建议"买入"评级
      `
      setResult(mockResult)
      updateAttributes({ result: mockResult })
      setIsAnalyzing(false)
    }, 2000)
  }

  return (
    <NodeViewWrapper className="ai-analysis-block">
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-4">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-600" />
              <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                AI分析
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={deleteNode}
              className="text-gray-400 hover:text-red-500"
            >
              ×
            </Button>
          </div>

          {/* 查询输入 */}
          <div className="mb-4">
            <NodeViewContent className="min-h-[40px] p-3 bg-white rounded-lg border border-blue-200 focus-within:border-blue-400 transition-colors" />
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2 mb-4">
            <Button
              size="sm"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full mr-2" />
                  分析中...
                </>
              ) : (
                <>
                  <Zap className="w-3 h-3 mr-1" />
                  开始分析
                </>
              )}
            </Button>
            <Button variant="outline" size="sm">
              <BarChart3 className="w-3 h-3 mr-1" />
              生成图表
            </Button>
            <Button variant="outline" size="sm">
              <TrendingUp className="w-3 h-3 mr-1" />
              趋势预测
            </Button>
          </div>

          {/* 分析结果 */}
          {result && (
            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-line text-sm text-gray-700">
                  {result}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </NodeViewWrapper>
  )
}

// TipTap节点定义
export const AiAnalysisBlock = Node.create({
  name: 'aiAnalysis',
  group: 'block',
  content: 'text*',
  
  addAttributes() {
    return {
      query: {
        default: '',
      },
      result: {
        default: '',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="ai-analysis"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'ai-analysis' }),
      0,
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(AiAnalysisBlockComponent)
  },

  addCommands() {
    return {
      setAiAnalysisBlock: (attributes) => ({ commands }) => {
        return commands.setNode(this.name, attributes)
      },
    }
  },
})