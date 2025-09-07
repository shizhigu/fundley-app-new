'use client'

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { NodeViewWrapper } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calculator, TrendingUp, TrendingDown, Activity, DollarSign, Percent } from 'lucide-react'
import { useState } from 'react'

// 财务指标块的React组件
const FinancialMetricsBlockComponent = ({ node, updateAttributes, deleteNode }) => {
  const [company, setCompany] = useState(node.attrs.company || 'AAPL')
  const [period, setPeriod] = useState(node.attrs.period || 'annual')
  const [isLoading, setIsLoading] = useState(false)

  const handleCompanyChange = (newCompany) => {
    setCompany(newCompany)
    updateAttributes({ company: newCompany })
  }

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod)
    updateAttributes({ period: newPeriod })
  }

  const handleRefresh = () => {
    setIsLoading(true)
    // 模拟数据加载
    setTimeout(() => {
      setIsLoading(false)
    }, 2000)
  }

  // 模拟财务指标数据
  const mockMetrics = {
    AAPL: {
      revenue: { value: '394.33B', change: 8.2, trend: 'up' },
      netIncome: { value: '99.80B', change: 5.4, trend: 'up' },
      grossMargin: { value: '45.96%', change: 1.2, trend: 'up' },
      operatingMargin: { value: '29.87%', change: -0.8, trend: 'down' },
      roe: { value: '147.9%', change: 12.3, trend: 'up' },
      roa: { value: '28.3%', change: 2.1, trend: 'up' },
      currentRatio: { value: '1.04', change: -3.2, trend: 'down' },
      debtToEquity: { value: '1.95', change: 8.7, trend: 'down' }
    }
  }

  const metrics = mockMetrics[company] || mockMetrics.AAPL

  const MetricCard = ({ title, value, change, trend, icon: Icon }) => (
    <div className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">{title}</span>
        </div>
        {trend === 'up' ? (
          <TrendingUp className="w-4 h-4 text-green-500" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-500" />
        )}
      </div>
      <div className="text-xl font-bold text-gray-900 mb-1">{value}</div>
      <div className={`text-xs font-medium ${
        trend === 'up' ? 'text-green-600' : 'text-red-600'
      }`}>
        {trend === 'up' ? '+' : ''}{change}% YoY
      </div>
    </div>
  )

  return (
    <NodeViewWrapper className="financial-metrics-block">
      <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-violet-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-purple-600" />
              <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                财务指标
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
            {company} 关键财务指标
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {/* 控制面板 */}
          <div className="flex gap-4 mb-4 p-3 bg-white rounded-lg border border-purple-200">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                公司
              </label>
              <Select value={company} onValueChange={handleCompanyChange}>
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
                期间
              </label>
              <Select value={period} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">年度</SelectItem>
                  <SelectItem value="quarter">季度</SelectItem>
                  <SelectItem value="ttm">TTM</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="animate-spin w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full mr-2" />
                ) : (
                  <Activity className="w-3 h-3 mr-2" />
                )}
                刷新
              </Button>
            </div>
          </div>

          {/* 指标网格 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <MetricCard
              title="营收"
              value={metrics.revenue.value}
              change={metrics.revenue.change}
              trend={metrics.revenue.trend}
              icon={DollarSign}
            />
            <MetricCard
              title="净利润"
              value={metrics.netIncome.value}
              change={metrics.netIncome.change}
              trend={metrics.netIncome.trend}
              icon={TrendingUp}
            />
            <MetricCard
              title="毛利率"
              value={metrics.grossMargin.value}
              change={metrics.grossMargin.change}
              trend={metrics.grossMargin.trend}
              icon={Percent}
            />
            <MetricCard
              title="营业利润率"
              value={metrics.operatingMargin.value}
              change={metrics.operatingMargin.change}
              trend={metrics.operatingMargin.trend}
              icon={Percent}
            />
            <MetricCard
              title="ROE"
              value={metrics.roe.value}
              change={metrics.roe.change}
              trend={metrics.roe.trend}
              icon={TrendingUp}
            />
            <MetricCard
              title="ROA"
              value={metrics.roa.value}
              change={metrics.roa.change}
              trend={metrics.roa.trend}
              icon={TrendingUp}
            />
            <MetricCard
              title="流动比率"
              value={metrics.currentRatio.value}
              change={metrics.currentRatio.change}
              trend={metrics.currentRatio.trend}
              icon={Activity}
            />
            <MetricCard
              title="负债权益比"
              value={metrics.debtToEquity.value}
              change={metrics.debtToEquity.change}
              trend={metrics.debtToEquity.trend}
              icon={Activity}
            />
          </div>

          {/* 底部信息 */}
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-500">
              数据来源: Financial Modeling Prep • 更新时间: {new Date().toLocaleString('zh-CN')}
            </div>
            <Badge variant="secondary" className="text-xs">
              {period === 'annual' ? '年度数据' : period === 'quarter' ? '季度数据' : 'TTM数据'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </NodeViewWrapper>
  )
}

// TipTap节点定义
export const FinancialMetricsBlock = Node.create({
  name: 'financialMetrics',
  group: 'block',
  content: '',
  atom: true,
  
  addAttributes() {
    return {
      company: {
        default: 'AAPL',
      },
      period: {
        default: 'annual',
      },
      metrics: {
        default: {},
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="financial-metrics"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'financial-metrics' }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(FinancialMetricsBlockComponent)
  },

  addCommands() {
    return {
      setFinancialMetricsBlock: (attributes) => ({ commands }) => {
        return commands.setNode(this.name, attributes)
      },
    }
  },
})