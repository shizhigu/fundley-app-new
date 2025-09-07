// @ts-nocheck
'use client'

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { NodeViewWrapper } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Database, Download, Filter, ArrowUpDown, Plus, Minus } from 'lucide-react'
import { useState } from 'react'

// 数据表格块的React组件
const DataTableBlockComponent = ({ node, updateAttributes, deleteNode }) => {
  const [tableType, setTableType] = useState(node.attrs.tableType || 'financial')
  const [sortColumn, setSortColumn] = useState('')
  const [filterValue, setFilterValue] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  const handleTableTypeChange = (type) => {
    setTableType(type)
    updateAttributes({ tableType: type })
  }

  // 模拟数据
  const mockData = {
    financial: {
      title: '财务数据对比表',
      headers: ['公司', '营收(B)', '净利润(B)', '毛利率', 'P/E', 'ROE'],
      rows: [
        ['苹果 (AAPL)', '$394.33', '$99.80', '45.96%', '29.2', '147.9%'],
        ['微软 (MSFT)', '$245.12', '$88.14', '68.4%', '34.8', '39.1%'],
        ['谷歌 (GOOGL)', '$307.39', '$76.03', '57.4%', '24.5', '25.8%'],
        ['特斯拉 (TSLA)', '$96.77', '$15.00', '19.3%', '65.1', '28.4%'],
        ['Meta (META)', '$134.90', '$39.10', '80.9%', '25.7', '24.9%']
      ]
    },
    portfolio: {
      title: '投资组合分析表',
      headers: ['持仓', '股数', '成本价', '当前价', '收益', '权重'],
      rows: [
        ['AAPL', '1,000', '$150.00', '$195.80', '+30.5%', '35.2%'],
        ['MSFT', '500', '$280.00', '$415.20', '+48.3%', '27.8%'],
        ['GOOGL', '200', '$120.00', '$138.90', '+15.8%', '18.5%'],
        ['TSLA', '300', '$200.00', '$248.50', '+24.3%', '12.3%'],
        ['META', '150', '$180.00', '$265.30', '+47.4%', '6.2%']
      ]
    },
    ratios: {
      title: '财务比率分析表',
      headers: ['指标', 'AAPL', 'MSFT', 'GOOGL', '行业均值', '评级'],
      rows: [
        ['流动比率', '1.04', '2.50', '4.10', '2.15', 'B+'],
        ['速动比率', '0.98', '2.45', '3.95', '1.95', 'B'],
        ['负债权益比', '1.95', '0.35', '0.20', '1.10', 'C+'],
        ['总资产周转率', '1.12', '0.58', '0.51', '0.85', 'A'],
        ['净资产收益率', '147.9%', '39.1%', '25.8%', '35.5%', 'A+']
      ]
    }
  }

  const currentData = mockData[tableType] || mockData.financial

  const handleAddRow = () => {
    setIsEditing(true)
  }

  const handleRemoveRow = () => {
    console.log('Remove row')
  }

  const getCellClass = (value, columnIndex) => {
    if (tableType === 'portfolio' && columnIndex === 4) {
      // 收益列颜色处理
      return value.includes('+') ? 'text-green-600 font-medium' : 'text-red-600 font-medium'
    }
    if (tableType === 'ratios' && columnIndex === 5) {
      // 评级列颜色处理
      const rating = value
      if (rating.includes('A')) return 'text-green-600 font-bold bg-green-50'
      if (rating.includes('B')) return 'text-yellow-600 font-bold bg-yellow-50'
      if (rating.includes('C')) return 'text-red-600 font-bold bg-red-50'
    }
    return ''
  }

  return (
    <NodeViewWrapper className="data-table-block">
      <Card className="border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-600" />
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                数据表格
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
            {currentData.title}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {/* 控制面板 */}
          <div className="flex gap-4 mb-4 p-3 bg-white rounded-lg border border-emerald-200">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                表格类型
              </label>
              <Select value={tableType} onValueChange={handleTableTypeChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="financial">财务数据对比</SelectItem>
                  <SelectItem value="portfolio">投资组合分析</SelectItem>
                  <SelectItem value="ratios">财务比率分析</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                筛选
              </label>
              <div className="relative">
                <Filter className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="筛选数据..." 
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="flex items-end gap-1">
              <Button variant="outline" size="sm" onClick={handleAddRow}>
                <Plus className="w-3 h-3 mr-1" />
                添加行
              </Button>
              <Button variant="outline" size="sm" onClick={handleRemoveRow}>
                <Minus className="w-3 h-3 mr-1" />
                删除行
              </Button>
            </div>
          </div>

          {/* 数据表格 */}
          <div className="bg-white rounded-lg border border-emerald-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-emerald-50">
                  {currentData.headers.map((header, index) => (
                    <TableHead 
                      key={index}
                      className="font-semibold text-emerald-800 cursor-pointer hover:bg-emerald-100 transition-colors"
                      onClick={() => setSortColumn(header)}
                    >
                      <div className="flex items-center gap-1">
                        {header}
                        {sortColumn === header && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentData.rows
                  .filter(row => 
                    !filterValue || 
                    row.some(cell => 
                      cell.toLowerCase().includes(filterValue.toLowerCase())
                    )
                  )
                  .map((row, rowIndex) => (
                  <TableRow key={rowIndex} className="hover:bg-emerald-25">
                    {row.map((cell, cellIndex) => (
                      <TableCell 
                        key={cellIndex}
                        className={`${getCellClass(cell, cellIndex)} ${
                          cellIndex === 0 ? 'font-medium' : ''
                        }`}
                      >
                        {cell}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* 底部操作栏 */}
          <div className="flex justify-between items-center mt-4">
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="w-3 h-3 mr-1" />
                导出CSV
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-3 h-3 mr-1" />
                导出Excel
              </Button>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-500">
                显示 {currentData.rows.length} 行数据
              </span>
              <Badge variant="secondary" className="text-xs">
                实时数据
              </Badge>
            </div>
          </div>

          {/* 数据统计信息 */}
          <div className="mt-3 p-2 bg-emerald-50 rounded text-xs text-emerald-700">
            💡 提示: 点击列标题排序，使用筛选框快速查找数据，支持导出到Excel或CSV格式
          </div>
        </CardContent>
      </Card>
    </NodeViewWrapper>
  )
}

// TipTap节点定义
export const DataTableBlock = Node.create({
  name: 'dataTable',
  group: 'block',
  content: '',
  atom: true,
  
  addAttributes() {
    return {
      tableType: {
        default: 'financial',
      },
      data: {
        default: [],
      },
      headers: {
        default: [],
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="data-table"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'data-table' }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(DataTableBlockComponent)
  },

  addCommands() {
    return {
      setDataTableBlock: (attributes) => ({ commands }) => {
        return commands.setNode(this.name, attributes)
      },
    }
  },
})