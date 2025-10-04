# Fundley Landing Page 战略分析

## 核心定位调整

### 从"全能AI平台"到"金融分析专家"

**原始问题：**
- Landing page 试图展示所有能力（多智能体、实时协作、所有金融分析场景）
- 用户看完后不知道 Fundley 到底解决什么具体问题
- 与通用 AI 聊天工具（ChatGPT）的差异不清晰

**新策略：**
- **单一核心价值主张**："将复杂金融问题转化为可复用的分析报告"
- **明确边界**：我们专注公司财务数据分析，不做所有事
- **差异化武器**：Analysis Block System（知识卡片系统）

---

## 三大核心优势（基于技术架构）

### 1. Analysis Block System - 核心创新

**技术基础：**
- 前端：`AnalysisBlockRenderer` 组件支持 3 种内容格式
  - Markdown 文本（narrative summary）
  - JSON 数据表（sortable, exportable）
  - HTML 可视化（Plotly 等交互图表）
- 后端：Data Coding Agent 在 E2B 沙箱执行 Python 生成内容
- 数据库：PostgreSQL JSONB 灵活存储，支持搜索和版本控制

**用户价值：**
- **可复用**：分析结果持久化，后续对话可引用
- **可分享**：团队协作，分析成果变机构知识资产
- **可扩展**：组合多个 blocks 形成完整投资报告

**Landing Page 呈现：**
- Section 3 专门展示 Analysis Block 概念
- 用实际案例（Revenue Trend Analysis, Peer Benchmark）说明
- 强调"不只是对话，是生成可复用的知识卡片"

### 2. 专业化 AI 团队 - 多智能体协作

**技术架构：**
```
Orchestrator Agent (协调者)
├── Financial Data Agent (数据获取)
│   └── Tools: get_financial_data, get_company_profile, get_stock_quote
├── Research Agent (研究洞察)
│   └── Tools: extract_mda, extract_risk_factors, web_search
└── Data Coding Agent (编程分析)
    └── Tools: E2B Python sandbox, SQL query, create_analysis_block
```

**用户价值：**
- **自动分工**：用户只问问题，AI 团队自动决定谁来处理
- **透明过程**：看到每个 agent 的工作状态（"Financial Agent 正在获取数据..."）
- **专业深度**：每个 agent 针对特定任务优化（vs 通用 LLM 的泛泛而谈）

**Landing Page 呈现：**
- Section 4 "How It Works" 展示三步流程
- 可视化 4 个 agent 协作动画
- 强调"你看得见的 AI 思考过程"

### 3. 数据深度与准确性 - 机构级标准

**数据能力盘点：**
- **Financial Data**: 6 大维度（损益表、资产负债表、现金流、财务比率、关键指标、公司概况）
- **Coverage**: 6,000+ 上市公司
- **SEC Filings**: 10-K/10-Q 的 MD&A、风险因素、业务描述
- **Calculation Engine**: Python 沙箱执行，所有计算可审计
- **Data Validation**: MotherDuck 数据库作为统一数据源

**用户价值：**
- **准确性**：程序化计算，无人工计算错误
- **可验证**：显示数据来源、计算公式、假设条件
- **机构级**：符合投资机构的合规要求（审计追踪）

**Landing Page 呈现：**
- Section 6 对比表：Fundley vs ChatGPT（准确性、数据访问、透明度）
- Section 9 信任与安全：强调数据隔离、计算透明、合规审计

---

## 明确 Scope - 我们擅长什么，不做什么

### ✅ Fundley 的甜区（Sweet Spot）

1. **比较性财务分析**
   - 案例：对比 5 家 SaaS 公司的收入增长率
   - 技术：Financial Agent 并行获取数据 → Python 计算 CAGR → 生成趋势图

2. **自定义指标计算**
   - 案例：计算半导体公司的 ROCE（资本回报率）
   - 技术：SQL 查询历史数据 → Python 窗口函数计算 → 数据表 + 图表

3. **SEC 文件智能提取**
   - 案例：提取 10-K 中的风险因素并分类
   - 技术：Research Agent 调用 SEC-API → LLM 分类 → Markdown 摘要

4. **可视化数据洞察**
   - 案例：5 年收入趋势图 + 同行对比
   - 技术：Plotly 生成 HTML → 嵌入 Analysis Block → 用户可交互

### ❌ Fundley 不做的（明确边界）

- **实时交易执行**：我们分析基本面，不是交易平台
- **私募公司数据**：专注公开市场数据
- **新闻摘要**：集成研究功能，但不是新闻聚合器
- **通用 AI 助手**：不回答"如何学 Python"等非金融问题

**为什么明确边界很重要？**
- 避免用户期望错配（"我以为 Fundley 什么都能做"）
- 强化专业定位（"深度胜过广度"）
- 建立信任（"我们知道自己的限制"）

---

## 未来能力路线图（基于现有架构的可信拓展）

### 已交付能力（技术验证）
- ✅ 多格式输出（Markdown + JSON + HTML）
- ✅ Python 沙箱执行（E2B 集成）
- ✅ 多智能体协作（Orchestrator + 3 specialists）
- ✅ 持久化知识库（Analysis Blocks）

### 自然延伸功能（无需重构架构）

1. **自定义数据源上传**
   - 技术可行性：已有 E2B 沙箱可处理用户上传的 CSV/Excel
   - 用户价值：将私有数据与公开数据合并分析

2. **定时报告生成**
   - 技术可行性：Orchestrator 可被定时任务触发
   - 用户价值：自动生成周报/月报 Analysis Blocks

3. **自然语言转 SQL**
   - 技术可行性：已有 SQL Query Tool，增强提示工程
   - 用户价值：查询内部数据仓库（非 FMP 数据）

4. **多 Block 组合导出**
   - 技术可行性：Analysis Blocks 已存 PostgreSQL，可批量查询
   - 用户价值：一键生成投资备忘录 PDF

5. **告警驱动分析**
   - 技术可行性：监控层触发 Orchestrator，自动运行预设分析
   - 用户价值：指标超阈值时自动诊断原因

**为什么这些是可信的承诺？**
- 都基于现有技术组件的组合/增强
- 不需要从头构建新能力
- 展示架构的灵活性和前瞻性

---

## Landing Page 内容架构（11 个模块）

### Section 1: Hero - 抓住注意力
**目标**：3 秒内传达核心价值
- 标题："问复杂金融问题，得到交互式分析报告"
- 副标题：对话式 AI + 程序化分析 + 可复用洞察
- 视觉：左右分屏（聊天界面 vs 生成的 Analysis Block）

### Section 2: Pain-to-Promise - 建立共鸣
**目标**：让用户产生"这就是我的痛点"共鸣
- Before：在 Bloomberg、Excel、Python、PPT 之间跳转
- After：一次提问，完整报告（数据+计算+可视化）
- 差异化：不只是回答问题，是创建可复用资产

### Section 3: Analysis Block System - 核心创新
**目标**：展示独特价值
- 什么是 Analysis Block？（3 个组成部分）
- 为什么重要？（可复用、可分享、可堆叠）
- 视觉案例：3 个真实 block 卡片

### Section 4: How It Works - 建立信任
**目标**：透明化过程
- Step 1: 自然提问
- Step 2: AI 团队协作（展示 4 个 agents）
- Step 3: 获得交互式报告

### Section 5: Scope Definition - 管理期望
**目标**：明确我们擅长什么
- ✅ 我们的甜区（5 个能力点）
- ❌ 我们不做的（4 个边界）
- 核心信息："深度胜过广度"

### Section 6: Fundley vs ChatGPT - 竞争对比
**目标**：解释为什么需要专业工具
- 对比表：数据访问、计算准确性、输出格式、工作流
- 核心信息："ChatGPT 解释概念，Fundley 运行分析"

### Section 7: Use Cases - 具体场景
**目标**：帮助用户代入自己的工作
- 案例 1：投资尽调
- 案例 2：组合公司监控
- 案例 3：主题研究
- 每个案例：场景 → Fundley 实操 → 节省时间对比

### Section 8: Future Roadmap - 增长空间
**目标**：展示长期价值
- 已交付能力（建立可信度）
- 未来功能（基于现有架构的自然延伸）
- 核心信息："在验证的基础上构建，不是空中楼阁"

### Section 9: Trust & Security - 消除顾虑
**目标**：机构级保障
- 数据隔离、计算透明、合规审计、企业认证
- 核心信息："像对待 Bloomberg 终端一样严谨"

### Section 10: Getting Started - 降低门槛
**目标**：提供多种参与方式
- Path 1: 演示（30 分钟）
- Path 2: 试点项目（2 周）
- Path 3: 自助试用（Q2 2025）

### Section 11: Final CTA - 转化
**目标**：明确行动号召
- 主 CTA：预约演示
- 次 CTA：下载产品简介 / 加入候补名单

---

## 设计与文案原则

### 文案语气（Tone of Voice）
- **自信的专家**，不是泛泛的 AI 炒作
  - ✅ "我们在金融分析上做得极好"
  - ❌ "AI 将革新一切"

- **具体的成果**，不是模糊的特性
  - ✅ "5 分钟完成同行对比"
  - ❌ "多智能体编排系统"

- **诚实的边界**，不是全能幻觉
  - ✅ "我们不做 X，我们擅长 Y"
  - ❌ "金融领域所有问题都能解决"

### 视觉策略
- **展示真实产品**：实际截图胜过概念图
- **动画展示流程**：Hero 部分展示从问题到报告的流程
- **数据可视化案例**：用真实数据（NVDA vs AMD）增强可信度

### 转化策略
- **主转化目标**：预约演示（高意向客户）
- **次转化目标**：下载 PDF（培育潜在客户）
- **A/B 测试重点**：
  - Hero 标题（速度 vs 质量）
  - 用例顺序（尽调 vs 监控）
  - 对比表位置（早放 vs 晚放）

---

## 关键信息矩阵

| 受众关心的问题 | Fundley 的回答 | 证据/展示方式 |
|---------------|---------------|--------------|
| 这和 ChatGPT 有什么区别？ | 直接访问金融数据 + 程序化计算 + 可复用报告 | Section 6 对比表 |
| 我为什么要信任这个结果？ | 所有计算可审计，数据来源透明 | Section 9 安全说明 + Section 4 流程展示 |
| 能解决我的具体问题吗？ | 展示 3 个真实场景（尽调/监控/研究） | Section 7 用例详解 |
| 会不会太复杂/需要学习？ | 自然语言提问，无需 SQL/Python | Section 4 Step 1 强调 |
| 未来会不会停止支持？ | 展示技术架构的可扩展性 + 路线图 | Section 8 未来能力 |
| 数据安全吗？ | 沙箱隔离、合规审计、企业级认证 | Section 9 信任支柱 |

---

## 实施建议

### 第一优先级（MVP Landing Page）
1. **Hero + Section 2-4**：建立核心价值认知
2. **Section 6 对比表**：解决"为什么不用 ChatGPT"
3. **Section 7 一个用例**：先做投资尽调场景
4. **Section 11 CTA**：预约演示表单

### 第二优先级（完整版）
5. **Section 5 Scope**：管理期望，建立专业形象
6. **Section 8 Roadmap**：展示长期价值
7. **Section 9 Security**：消除机构客户顾虑

### 第三优先级（优化）
8. **Section 3 Block System**：深入展示核心创新
9. **Section 7 其他用例**：覆盖更多场景
10. **A/B 测试优化**：基于数据迭代

---

## 成功指标

### 定性指标
- 用户看完后能用一句话说清楚 Fundley 是什么
- 用户能区分 Fundley 和 ChatGPT 的差异
- 用户知道自己的场景是否适合 Fundley

### 定量指标
- **主指标**：演示预约转化率（目标 >3%）
- **辅助指标**：
  - 平均页面停留时间（目标 >2 分钟）
  - Section 6 对比表交互率（目标 >40%）
  - PDF 下载率（目标 >8%）
  - Section 7 用例展开率（目标 >50%）

---

## 总结：Landing Page 的核心逻辑

**单一叙事线**：
问题（分析工作繁琐） → 解决方案（对话式+程序化分析） → 核心创新（Analysis Blocks） → 具体能力（3 个用例） → 差异化（vs ChatGPT） → 未来空间（Roadmap） → 信任建立（安全） → 行动号召（演示）

**关键差异化**：
不是"更好的 AI 聊天工具"，是"金融分析的新工作流"

**可信度来源**：
- 技术架构真实可验证
- 明确能力边界
- 未来承诺基于现有基础
- 真实数据案例

**情感共鸣点**：
"我理解你的痛苦（Excel 地狱），我提供更好的方式（对话 + 自动化），我给你可以信赖的结果（透明 + 可复用）"
