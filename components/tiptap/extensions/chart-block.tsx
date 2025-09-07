'use client'

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { NodeViewWrapper } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart3, LineChart, PieChart, Settings, Download } from 'lucide-react'
import { useState } from 'react'

// 图表块的React组件
const ChartBlockComponent = ({ node, updateAttributes, deleteNode }) => {
  const [chartType, setChartType] = useState(node.attrs.chartType || 'line')
  const [symbol, setSymbol] = useState(node.attrs.symbol || 'AAPL')

  const handleChartTypeChange = (type) => {
    setChartType(type)
    updateAttributes({ chartType: type })
  }

  const handleSymbolChange = (newSymbol) => {
    setSymbol(newSymbol)
    updateAttributes({ symbol: newSymbol })
  }

  // 模拟图表数据
  const renderMockChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <div className="h-64 bg-gradient-to-t from-blue-100 to-blue-50 rounded-lg flex items-end justify-around p-4">
            {[65, 80, 45, 90, 70, 55, 85].map((height, i) => (
              <div
                key={i}
                className="bg-blue-500 rounded-t"
                style={{ height: `${height}%`, width: '12%' }}
              />
            ))}
          </div>
        )
      case 'pie':
        return (
          <div className="h-64 flex items-center justify-center">
            <div className="relative w-48 h-48 rounded-full bg-gradient-to-r from-blue-400 via-green-400 to-yellow-400 flex items-center justify-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold">Portfolio</span>
              </div>
            </div>
          </div>
        )
      default: // line
        return (
          <div className="h-64 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 flex items-end">
            <svg viewBox="0 0 300 200" className="w-full h-full">
              <polyline
                points="10,150 50,120 90,80 130,100 170,60 210,70 250,40 290,50"
                stroke="#3B82F6"
                strokeWidth="3"
                fill="none"
                className="drop-shadow"
              />
              <circle cx="10" cy="150" r="3" fill="#3B82F6" />
              <circle cx="50" cy="120" r="3" fill="#3B82F6" />
              <circle cx="90" cy="80" r="3" fill="#3B82F6" />
              <circle cx="130" cy="100" r="3" fill="#3B82F6" />
              <circle cx="170" cy="60" r="3" fill="#3B82F6" />
              <circle cx="210" cy="70" r="3" fill="#3B82F6" />
              <circle cx="250" cy="40" r="3" fill="#3B82F6" />
              <circle cx="290" cy="50" r="3" fill="#3B82F6" />
            </svg>
          </div>
        )
    }
  }

  return (
    <NodeViewWrapper className="chart-block">
      <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              <Badge className="bg-green-100 text-green-700 border-green-200">
                图表分析
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
          <CardTitle className="text-lg">
            {symbol} 股价走势分析
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {/* 控制面板 */}
          <div className="flex gap-4 mb-4 p-3 bg-white rounded-lg border border-green-200">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                股票代码
              </label>
              <Select value={symbol} onValueChange={handleSymbolChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AAPL">AAPL - 苹果</SelectItem>
                  <SelectItem value="MSFT">MSFT - 微软</SelectItem>
                  <SelectItem value="GOOGL">GOOGL - 谷歌</SelectItem>
                  <SelectItem value="TSLA">TSLA - 特斯拉</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                图表类型
              </label>
              <Select value={chartType} onValueChange={handleChartTypeChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">
                    <div className="flex items-center gap-2">
                      <LineChart className="w-4 h-4" />
                      折线图
                    </div>
                  </SelectItem>
                  <SelectItem value="bar">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      柱状图
                    </div>
                  </SelectItem>
                  <SelectItem value="pie">
                    <div className="flex items-center gap-2">
                      <PieChart className="w-4 h-4" />
                      饼图
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 图表显示 */}
          {renderMockChart()}

          {/* 操作按钮 */}
          <div className="flex justify-between items-center mt-4">
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Settings className="w-3 h-3 mr-1" />
                设置
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-3 h-3 mr-1" />
                导出
              </Button>
            </div>
            <Badge variant="secondary" className="text-xs">
              实时数据
            </Badge>
          </div>
        </CardContent>
      </Card>
    </NodeViewWrapper>
  )
}

// TipTap节点定义
export const ChartBlock = Node.create({
  name: 'chartBlock',
  group: 'block',
  content: '',
  atom: true,
  
  addAttributes() {
    return {
      chartType: {
        default: 'line',
      },
      symbol: {
        default: 'AAPL',
      },
      timeRange: {
        default: '1Y',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="chart-block"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'chart-block' }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ChartBlockComponent)
  },

  addCommands() {
    return {
      setChartBlock: (attributes) => ({ commands }) => {
        return commands.setNode(this.name, attributes)
      },
    }
  },
})