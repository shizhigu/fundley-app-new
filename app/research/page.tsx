'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import TiptapEditor from '@/components/tiptap/tiptap-editor'
import { 
  MessageSquare, 
  Brain, 
  FileText, 
  TrendingUp,
  Calculator,
  Database,
  BarChart3,
  Zap,
  Target,
  Sparkles
} from 'lucide-react'

export default function ResearchPage() {
  const [content, setContent] = useState('<h1>苹果公司(AAPL) 投资调研报告</h1><p>开始写作您的投资调研报告...</p>')
  
  const [selectedText, setSelectedText] = useState('')
  const [aiSidebarOpen, setAiSidebarOpen] = useState(true)
  const selectionTimeoutRef = useRef<NodeJS.Timeout>()

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent)
  }, [])

  // Handle text selection for AI analysis - debounced to prevent excessive updates
  const handleTextSelection = useCallback(() => {
    if (selectionTimeoutRef.current) {
      clearTimeout(selectionTimeoutRef.current)
    }
    
    selectionTimeoutRef.current = setTimeout(() => {
      const selection = window.getSelection()
      const text = selection?.toString().trim()
      if (text && text.length > 2) {
        setSelectedText(text)
      } else if (!text) {
        setSelectedText('')
      }
    }, 300) // 300ms debounce
  }, [])

  const analyzeSelectedText = useCallback(async (analysisType: string) => {
    if (!selectedText) return
    
    // This would integrate with your AI API
    console.log(`Analyzing "${selectedText}" with type: ${analysisType}`)
    // TODO: Integrate with chat API
  }, [selectedText])

  // Template insertion functions
  const insertFinancialTemplate = useCallback(() => {
    const template = `\n\n<h2>📊 财务指标分析</h2>\n<p>营收增长率：</p>\n<p>净利润率：</p>\n<p>ROE：</p>\n<p>负债率：</p>\n\n`
    setContent(prev => prev + template)
  }, [])

  const insertRiskTemplate = useCallback(() => {
    const template = `\n\n<h2>⚠️ 风险因素</h2>\n<ul>\n<li>市场风险：</li>\n<li>行业风险：</li>\n<li>公司风险：</li>\n<li>流动性风险：</li>\n</ul>\n\n`
    setContent(prev => prev + template)
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Main Content Area */}
        <div className={`flex-1 transition-all duration-300 ${aiSidebarOpen ? 'mr-80' : 'mr-0'}`}>
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Brain className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-semibold">AI Native 调研平台</h1>
                <Badge className="bg-primary/10 text-primary">基于 TipTap</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setAiSidebarOpen(!aiSidebarOpen)}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {aiSidebarOpen ? '隐藏' : '显示'}AI助手
                </Button>
                <Button size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  保存报告
                </Button>
              </div>
            </div>
          </div>

          {/* TipTap Editor Area */}
          <div className="max-w-4xl mx-auto p-6">
            <div className="min-h-[600px]">
              <TiptapEditor
                content={content}
                onChange={handleContentChange}
                editable={true}
                placeholder="开始写作你的投资调研报告..."
              />
            </div>
            
            {/* Usage Tips */}
            <Card className="mt-8 border-blue-200 bg-blue-50/50">
              <CardContent className="p-4">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  编辑器使用技巧
                </h3>
                <div className="text-sm text-blue-800 space-y-1">
                  <p>• <strong>键盘导航：</strong> 使用方向键在段落间无缝切换</p>
                  <p>• <strong>智能删除：</strong> Backspace会自动合并空段落</p>
                  <p>• <strong>AI分析：</strong> 选中任意文本，使用右侧AI助手分析</p>
                  <p>• <strong>快捷格式：</strong> # 标题、* 列表、{'>'} 引用</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* AI Assistant Sidebar */}
        {aiSidebarOpen && (
          <div className="fixed right-0 top-0 h-screen w-80 bg-card border-l shadow-lg">
            <div className="flex flex-col h-full">
              {/* Sidebar Header */}
              <div className="p-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <Brain className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">AI 投研助手</h3>
                    <p className="text-xs text-muted-foreground">选中文本进行分析</p>
                  </div>
                </div>
              </div>

              {/* Selected Text Display */}
              {selectedText && (
                <div className="p-4 border-b bg-muted/50">
                  <div className="text-sm text-muted-foreground mb-2">已选择内容：</div>
                  <div className="text-sm bg-background p-2 rounded border max-h-20 overflow-auto">
                    "{selectedText}"
                  </div>
                </div>
              )}

              {/* AI Analysis Actions */}
              <div className="p-4 border-b">
                <h4 className="text-sm font-medium mb-3">AI分析操作</h4>
                <div className="grid grid-cols-1 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="justify-start h-auto p-3"
                    disabled={!selectedText}
                    onClick={() => analyzeSelectedText('financial')}
                  >
                    <Calculator className="w-4 h-4 mr-2" />
                    <div className="text-left">
                      <div className="text-sm font-medium">财务分析</div>
                      <div className="text-xs text-muted-foreground">深度解读财务指标</div>
                    </div>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="justify-start h-auto p-3"
                    disabled={!selectedText}
                    onClick={() => analyzeSelectedText('market')}
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    <div className="text-left">
                      <div className="text-sm font-medium">市场分析</div>
                      <div className="text-xs text-muted-foreground">行业对比和趋势</div>
                    </div>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="justify-start h-auto p-3"
                    disabled={!selectedText}
                    onClick={() => analyzeSelectedText('chart')}
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    <div className="text-left">
                      <div className="text-sm font-medium">生成图表</div>
                      <div className="text-xs text-muted-foreground">可视化数据分析</div>
                    </div>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="justify-start h-auto p-3"
                    disabled={!selectedText}
                    onClick={() => analyzeSelectedText('risk')}
                  >
                    <Target className="w-4 h-4 mr-2" />
                    <div className="text-left">
                      <div className="text-sm font-medium">风险评估</div>
                      <div className="text-xs text-muted-foreground">识别投资风险点</div>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Quick Insert Templates */}
              <div className="p-4 border-b">
                <h4 className="text-sm font-medium mb-3">快速插入模板</h4>
                <div className="space-y-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start text-xs"
                    onClick={insertFinancialTemplate}
                  >
                    <Calculator className="w-3 h-3 mr-2" />
                    财务指标模板
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start text-xs"
                    onClick={insertRiskTemplate}
                  >
                    <Target className="w-3 h-3 mr-2" />
                    风险评估模板
                  </Button>
                </div>
              </div>

              {/* AI Chat Interface */}
              <div className="flex-1 flex flex-col">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                          <Brain className="w-3 h-3 text-primary-foreground" />
                        </div>
                        <div className="text-sm">
                          <p>你好！我是你的AI投研助手。</p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            💡 选中文档中的任意文本，我可以帮你分析财务数据、评估风险或生成图表。
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                {/* Chat Input */}
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input 
                      placeholder="询问AI助手..." 
                      className="flex-1"
                    />
                    <Button size="icon">
                      <Zap className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}