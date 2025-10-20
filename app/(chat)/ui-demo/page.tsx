"use client";

import { MovingBorder } from "@/components/aceternity/moving-border";
import { CardContainer, CardBody, CardItem } from "@/components/aceternity/card-3d";
import { GridBackground } from "@/components/aceternity/grid-background";
import { Button } from "@/components/ui/button";

export default function UIDemo() {
  return (
    <GridBackground className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Fundley UI Component Demo</h1>
          <p className="text-muted-foreground">
            Showcase of upgraded UI components with Aceternity effects
          </p>
        </div>

        {/* Section 1: MovingBorder Buttons */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">Moving Border Buttons</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MovingBorder
              duration={3000}
              className="px-8 py-4 text-white bg-primary hover:bg-primary/90"
            >
              开始分析
            </MovingBorder>

            <MovingBorder
              duration={2000}
              className="px-8 py-4"
              borderRadius="0.75rem"
            >
              创建新 Block
            </MovingBorder>

            <MovingBorder
              duration={4000}
              className="px-8 py-4"
              borderClassName="bg-gradient-to-r from-primary via-purple-500 to-primary"
            >
              Premium Feature
            </MovingBorder>
          </div>

          {/* Comparison with normal button */}
          <div className="flex gap-4 items-center">
            <span className="text-sm text-muted-foreground">对比普通按钮：</span>
            <Button size="lg" className="bg-primary">
              普通按钮
            </Button>
          </div>
        </section>

        {/* Section 2: 3D Cards */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">3D Card Effects</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Card 1 */}
            <CardContainer className="inter-var">
              <CardBody className="bg-gray-50 relative group/card dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1] dark:bg-black dark:border-white/[0.2] border-black/[0.1] w-auto h-auto rounded-xl p-6 border">
                <CardItem
                  translateZ="50"
                  className="text-xl font-bold text-neutral-600 dark:text-white"
                >
                  NVDA 分析报告
                </CardItem>
                <CardItem
                  as="p"
                  translateZ="60"
                  className="text-neutral-500 text-sm max-w-sm mt-2 dark:text-neutral-300"
                >
                  AI 生成的深度财务分析
                </CardItem>
                <CardItem translateZ="100" className="w-full mt-4">
                  <div className="h-32 w-full rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                    <span className="text-4xl font-bold">$186.42</span>
                  </div>
                </CardItem>
                <div className="flex justify-between items-center mt-6">
                  <CardItem
                    translateZ={20}
                    as="button"
                    className="px-4 py-2 rounded-xl text-xs font-normal dark:text-white"
                  >
                    查看详情 →
                  </CardItem>
                  <CardItem
                    translateZ={20}
                    as="button"
                    className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold"
                  >
                    分享
                  </CardItem>
                </div>
              </CardBody>
            </CardContainer>

            {/* Card 2 */}
            <CardContainer className="inter-var">
              <CardBody className="bg-gray-50 relative group/card dark:hover:shadow-2xl dark:hover:shadow-primary/[0.1] dark:bg-black dark:border-white/[0.2] border-black/[0.1] w-auto h-auto rounded-xl p-6 border">
                <CardItem
                  translateZ="50"
                  className="text-xl font-bold text-neutral-600 dark:text-white"
                >
                  TSLA Q4 财报
                </CardItem>
                <CardItem
                  as="p"
                  translateZ="60"
                  className="text-neutral-500 text-sm max-w-sm mt-2 dark:text-neutral-300"
                >
                  营收增长 25% YoY
                </CardItem>
                <CardItem translateZ="100" className="w-full mt-4">
                  <div className="h-32 w-full rounded-xl bg-gradient-to-br from-green-500/20 to-blue-500/20 flex items-center justify-center">
                    <span className="text-2xl font-bold">+25%</span>
                  </div>
                </CardItem>
                <div className="flex justify-between items-center mt-6">
                  <CardItem
                    translateZ={20}
                    className="text-xs text-muted-foreground"
                  >
                    2 天前
                  </CardItem>
                  <CardItem
                    translateZ={20}
                    as="button"
                    className="px-4 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-bold"
                  >
                    打开
                  </CardItem>
                </div>
              </CardBody>
            </CardContainer>

            {/* Card 3 */}
            <CardContainer className="inter-var">
              <CardBody className="bg-gray-50 relative group/card dark:hover:shadow-2xl dark:hover:shadow-purple-500/[0.1] dark:bg-black dark:border-white/[0.2] border-black/[0.1] w-auto h-auto rounded-xl p-6 border">
                <CardItem
                  translateZ="50"
                  className="text-xl font-bold text-neutral-600 dark:text-white"
                >
                  AAPL vs MSFT
                </CardItem>
                <CardItem
                  as="p"
                  translateZ="60"
                  className="text-neutral-500 text-sm max-w-sm mt-2 dark:text-neutral-300"
                >
                  估值对比分析
                </CardItem>
                <CardItem translateZ="100" className="w-full mt-4">
                  <div className="h-32 w-full rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center flex-col gap-2">
                    <span className="text-sm">P/E Ratio</span>
                    <span className="text-3xl font-bold">31.2 vs 35.8</span>
                  </div>
                </CardItem>
                <div className="flex justify-between items-center mt-6">
                  <CardItem
                    translateZ={20}
                    className="text-xs text-muted-foreground"
                  >
                    今天
                  </CardItem>
                  <CardItem
                    translateZ={20}
                    as="button"
                    className="px-4 py-2 rounded-xl border border-border text-xs font-bold"
                  >
                    对比
                  </CardItem>
                </div>
              </CardBody>
            </CardContainer>
          </div>
        </section>

        {/* Section 3: Integration Example */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">集成效果演示</h2>
          <div className="p-8 rounded-xl border border-border bg-card space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Analysis Blocks</h3>
                <p className="text-sm text-muted-foreground">
                  您的分析工作区
                </p>
              </div>
              <MovingBorder
                duration={2000}
                className="px-6 py-3 text-sm bg-primary text-white"
                borderRadius="0.75rem"
              >
                + 创建新 Block
              </MovingBorder>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <CardContainer key={i} className="inter-var">
                  <CardBody className="bg-background relative group/card border-border w-auto h-auto rounded-xl p-4 border">
                    <CardItem
                      translateZ="50"
                      className="text-lg font-semibold"
                    >
                      分析 Block #{i}
                    </CardItem>
                    <CardItem
                      as="p"
                      translateZ="60"
                      className="text-muted-foreground text-sm mt-2"
                    >
                      鼠标悬停查看 3D 效果
                    </CardItem>
                    <CardItem translateZ="100" className="w-full mt-4">
                      <div className="h-20 w-full rounded-lg bg-muted flex items-center justify-center">
                        <span className="text-sm text-muted-foreground">
                          图表区域
                        </span>
                      </div>
                    </CardItem>
                  </CardBody>
                </CardContainer>
              ))}
            </div>
          </div>
        </section>

        {/* Section 4: Guidelines */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">使用指南</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl border border-border bg-card space-y-3">
              <h3 className="font-semibold">MovingBorder Button</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• 用于主要行动号召（CTA）按钮</li>
                <li>• 适合："开始分析"、"创建 Block"等重要操作</li>
                <li>• 可自定义 duration（动画速度）</li>
                <li>• 支持自定义 borderRadius 和颜色</li>
              </ul>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card space-y-3">
              <h3 className="font-semibold">3D Card Effect</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• 用于 Analysis Blocks 展示</li>
                <li>• 鼠标悬停时产生 3D 倾斜效果</li>
                <li>• CardItem 的 translateZ 控制层次深度</li>
                <li>• 适合内容卡片、产品展示</li>
              </ul>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card space-y-3">
              <h3 className="font-semibold">Grid Background</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• 用于页面背景装饰</li>
                <li>• 提供网格和点阵两种样式</li>
                <li>• 自动适配 light/dark 主题</li>
                <li>• 不影响页面性能</li>
              </ul>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card space-y-3">
              <h3 className="font-semibold">性能建议</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• 3D 效果在移动端可能需要优化</li>
                <li>• 建议在关键位置使用，避免过度</li>
                <li>• 尊重 prefers-reduced-motion 设置</li>
                <li>• 保持一致的设计语言</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </GridBackground>
  );
}
