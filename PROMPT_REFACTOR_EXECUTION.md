# 提示词实战重构方案

**基于实际业务需求的务实重构（非盲目简化）**

---

## 🎯 重构目标

**不是**追求Kimi CLI的100行，而是：
1. ✅ **保留必要的业务逻辑**（前后端协作、数据源规范、财务流程）
2. ✅ **删除冗余重复**（同一规则在3处重复说明）
3. ✅ **理清结构层次**（核心原则 vs 操作细节 vs 技术实现）
4. ✅ **提炼高频模式**（不是删除，而是抽象）

**目标长度**: 600-800行（vs 当前1500行，减少40-50%）

---

## 📊 当前状态分析

### 工具docstring梳理（已有文档）

**关键发现**: 工具docstring质量极高，无需额外.md文件！

| 工具 | Docstring质量 | 是否需要简化 | 原因 |
|------|--------------|--------------|------|
| `create_analysis_block` | ⭐⭐⭐⭐⭐ | ❌ 保留 | 前后端协作核心，必须详细说明 |
| `update_analysis_block` | ⭐⭐⭐⭐⭐ | ❌ 保留 | 参数选择复杂，需要Guide |
| `switch_analysis_block` | ⭐⭐⭐⭐ | ❌ 保留 | block_history使用示例必要 |
| `E2BTools.run_python_code` | ⭐⭐⭐⭐⭐ | ❌ 保留 | Notebook操作复杂，示例代码关键 |
| `read_script` | ⭐⭐⭐⭐ | ✅ 可简化 | Output limits说明可简化 |
| `search_in_script` | ⭐⭐⭐⭐ | ❌ 保留 | 新增glob_pattern需要示例 |
| `apply_diff` | ⭐⭐⭐ | ✅ 可简化 | Diff格式说明可简化 |
| `sql_query` | ⭐⭐⭐⭐ | ❌ 保留 | DuckDB schema说明必须详细 |

**结论**: 工具docstring已经是独立文档，质量高于Kimi CLI的.md文件！

---

## 🔍 主提示词冗余分析

### 1. **重复规则识别**

#### 规则A: "NO DUPLICATE ANALYSIS IN CHAT"

**出现位置**（3处）:
1. `create_analysis_block` docstring (line 34-38)
2. `update_analysis_block` docstring (line 344-348)
3. 主提示词 `<output_types>` section (line 234, 269)

**重复内容**:
```markdown
# 位置1 (create_analysis_block docstring)
**⚠️ CRITICAL - NO DUPLICATE ANALYSIS IN CHAT:**
- Detailed analysis goes IN THE BLOCK (sections + files)
- Chat message should be BRIEF summary only (1-2 sentences)
- DO NOT repeat block content in chat messages
- User sees block in right panel - no need to duplicate in chat

# 位置2 (update_analysis_block docstring)
**⚠️ CRITICAL - NO DUPLICATE ANALYSIS IN CHAT:**
- Detailed analysis goes IN THE BLOCK (sections + files)
- Chat message should be BRIEF summary only (e.g., "✅ Updated analysis with latest data.")
- DO NOT repeat block content in chat messages
- User sees block in right panel - no need to duplicate in chat

# 位置3 (主提示词 <output_types>)
**Do not duplicate** detailed block content in chat. When you create/update a block,
provide a **brief chat summary** and list the attached artifacts by name.
```

**重构建议**:
- ✅ 保留在主提示词（全局规则）
- ❌ 从工具docstring删除（避免重复）
- 📏 简化为1-2行原则

---

#### 规则B: "CODE DELIVERY POLICY"

**出现位置**（2处）:
1. `create_analysis_block` docstring (line 40-42)
2. `update_analysis_block` docstring (line 350-352)

**重复内容**:
```markdown
**⚠️ CRITICAL - CODE DELIVERY POLICY:**
- **Simple tasks (<2 min)**: Execute directly, put results in blocks. NEVER expose code to user.
- **Complex tasks (>2 min)**: Execute simplified version, deliver full code package as .py files.
```

**重构建议**:
- ✅ 移至主提示词`<code_delivery_policy>`（新section）
- ❌ 从工具docstring删除
- 📏 保留详细说明（这是业务规则，必须清楚）

---

#### 规则C: "PRIORITIZE SECTIONS FOR TEXTUAL ANALYSIS"

**出现位置**（2处）:
1. `create_analysis_block` docstring (line 44-54)
2. `update_analysis_block` docstring (line 354-364)

**重复内容**:
```markdown
**⚠️ CRITICAL - PRIORITIZE SECTIONS FOR TEXTUAL ANALYSIS:**
- **MOST textual analysis should go in SECTIONS**, not just in files
- Sections are markdown content that displays directly in the block UI
- Files (HTML/CSV) are for interactive visualizations and structured data tables
... (10 lines detailed explanation)
```

**重构建议**:
- ✅ 移至主提示词`<analysis_block_structure>`（新section）
- ❌ 从工具docstring删除
- 📏 简化为核心原则 + 1个示例

---

### 2. **技术实现细节过度详细**

#### 问题A: HTML Dashboard完整代码示例（300行）

**当前位置**: 主提示词 `<csv_and_files>` section (line 656-715)

**内容**:
```python
# 完整的Jinja2模板示例
html = Template('''<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<script src="https://cdn.plot.ly/plotly-2.32.0.min.js"></script>
... (100+ lines HTML template)
</script>
</body></html>''').render(...)
```

**问题**:
- LLM已经知道如何写HTML/Jinja2
- 这是实现细节，不是业务规则
- 占用大量context

**重构建议**:
- ❌ 删除完整代码示例
- ✅ 保留核心要求：
  ```markdown
  **HTML Dashboards**:
  - Use Jinja2 for multi-chart dashboards
  - MUST serialize fig to JSON: `fig.to_json()`
  - MUST call `Plotly.newPlot()` for each chart
  - Set `min-height` on chart divs for responsiveness
  ```
- 📂 完整示例 → 迁移到`DEVELOPER_GUIDE.md`

---

#### 问题B: SQL查询示例过多（80行）

**当前位置**: 主提示词 `<data_sources_and_workflow>` (line 392-450)

**内容**:
```sql
**Options Table Schema (`options_eod_data`)**:
```
- underlying_symbol (VARCHAR): Stock ticker (e.g., 'AAPL')
- ticker (VARCHAR): Full option contract ID
... (20 lines schema details)
```

**Options Query Best Practices**:
```sql
SELECT * FROM options_eod_data
WHERE underlying_symbol = 'AAPL'
  AND option_type = 'put'
... (15 lines SQL example)
```
```

**问题**:
- Schema应该动态查询（`sql_query("SELECT * FROM options_eod_data LIMIT 5")`）
- SQL示例可以更简洁

**重构建议**:
- ❌ 删除完整schema定义
- ✅ 改为动态引用：
  ```markdown
  **DuckDB Tables**:
  - financial_statements, eod_data, company_profiles, options_eod_data
  - Use `sql_query("SELECT * FROM table LIMIT 5")` to inspect schema
  ```
- 📂 详细schema → 迁移到独立文档或工具返回

---

#### 问题C: DuckDB语法细节（50行）

**当前位置**: 主提示词 `<data_sources_and_workflow>` (line 414-418)

**内容**:
```sql
-- DuckDB syntax notes:
-- DATE_DIFF('day', date1, date2) for date differences
-- INTERVAL 60 DAY (not INTERVAL '60 days')
-- CAST(column AS DATE) for type conversion
```

**问题**:
- LLM已经知道DuckDB语法
- 错误时会自己debug

**重构建议**:
- ❌ 删除语法细节
- ✅ 保留关键差异：
  ```markdown
  **DuckDB Notes**: Use `INTERVAL 60 DAY` (no quotes), `DATE_DIFF('day', d1, d2)`
  ```

---

### 3. **workflow流程过度详细**

#### 问题: 分步流程vs原则导向

**当前（详细步骤，100行）**:
```markdown
<workflow_planning>
Before executing any substantial analysis, follow this protocol:

1. **Plan the workflow internally** (data needs → analysis steps → deliverables).
2. **Decide block placement** using context and session_state:
   * If `session_state['current_block_id']` exists and request **refines or extends** → update that block.
   * If topic is **materially different** → create a new block.
   * Use your judgment based on context - don't ask user.
3. **Make financial assumptions** (time periods, metric definitions):
   * Default to widely-accepted industry practices
   * Document all assumptions in analysis sections
4. **Create the block early** if needed (before heavy computation):
   * Clear title (company/topic-specific).
   * `primary_symbol` (main ticker for logo display).
5. **Then execute** the data fetching, analysis, artifact generation.
6. **Update the block** with final artifacts and narrative sections.

**Rationale**: Creating the block early provides context isolation...
```

**重构（原则导向，20行）**:
```markdown
<workflow>

**Analysis Workflow**:
1. Understand user request and identify required data sources
2. Plan analysis approach (metrics, timeframes, assumptions)
3. Execute using available tools (DuckDB first, API fallback)
4. Deliver via chat (quick answers) or blocks (structured reports)

**Block Management**:
- Extend existing block when refining same topic
- Create new block for different topic/company
- Document all financial assumptions in sections

**Execution Principles**:
- DuckDB primary, APIs fallback
- Professional assumptions (document them)
- KISS - minimal changes to achieve goal
```

**减少**: 100行 → 20行（-80行）

---

## 🛠️ 重构实施方案

### Phase 1: 删除重复（目标: -300行）

#### 1.1 工具docstring去重

**待删除内容**（从工具docstring）:
- ❌ "NO DUPLICATE ANALYSIS IN CHAT" (出现在2个工具)
- ❌ "CODE DELIVERY POLICY" (出现在2个工具)
- ❌ "PRIORITIZE SECTIONS" (出现在2个工具)

**迁移位置**（主提示词新sections）:
```markdown
<block_output_policy>
## Analysis Block Output Policy

**Block vs Chat**:
- Detailed analysis → SECTIONS (markdown) + FILES (charts/data)
- Chat → brief summary only (1-2 sentences)
- Never duplicate block content in chat

**Content Structure**:
- Sections: Narrative analysis, insights, conclusions (markdown)
- HTML files: Interactive dashboards (Plotly/Panel)
- CSV files: Data tables for export

**Example**:
- Section 1: Executive Summary
- Section 2: Fundamental Analysis
- Section 3: Risk Assessment
- Files: dashboard.html, metrics.csv

## Code Delivery Policy

**Simple tasks (<2 min)**:
- Execute directly, put results in blocks
- NEVER expose code to user

**Complex tasks (>2 min)**:
- Execute simplified preview version
- Deliver full code package as .py files in block scripts/
- Include: requirements.txt, 01_fetch.py, 02_process.py, 90_report.py, README.md
</block_output_policy>
```

**预期节省**: ~100行（删除重复 + 简化措辞）

---

#### 1.2 删除技术实现细节

**待删除sections**（主提示词）:
- ❌ 完整HTML/Jinja2代码示例（300行）
- ❌ DuckDB完整schema定义（80行）
- ❌ SQL语法详细说明（50行）
- ❌ Plotly配置示例（100行）

**替换为原则 + 动态引用**:
```markdown
<data_sources>
## Data Sources

**Primary: DuckDB/MotherDuck**
- Tables: financial_statements, eod_data, company_profiles, options_eod_data
- Inspect schema: `sql_query("SELECT * FROM table LIMIT 5")`
- DuckDB syntax: `INTERVAL 60 DAY`, `DATE_DIFF('day', d1, d2)`

**API Fallback**:
- FMP (preferred): ownership, filings, earnings calls
- Polygon.io (use sparingly): real-time options data only

**Options Data**:
- Primary: options_eod_data (121M rows, EOD only)
- Real-time Greeks: Polygon.io (explicit user request only)
- Default: Use EOD data first, inform user of limitations
</data_sources>

<artifacts>
## Artifact Creation

**HTML Dashboards**:
- Single chart: `fig.write_html('report.html')`
- Multi-chart: Use Jinja2 with `fig.to_json()` + `Plotly.newPlot()`
- Requirements: Self-contained, CDN resources, min-height on divs

**CSV Data**:
- Format: `df.to_csv(index=False)` for clean output
- Use for: Structured data tables, export needs

**Validation**: Files must exist, be non-empty, have correct extensions
</artifacts>
```

**预期节省**: ~400行

---

### Phase 2: 结构重组（目标: 理清层次）

#### 2.1 新的提示词结构

```markdown
# Financial Analyst Agent System Prompt

## 1. Core Identity (10 lines)
- Role: Professional financial analyst for institutional investors
- Approach: Critical thinking, cross-checking, risk-aware

## 2. Core Principles (20 lines)
- KISS: Keep it stupidly simple
- Minimal Changes: Only necessary changes
- Professional Standards: Industry best practices
- Critical Thinking: Question all data

## 3. Communication Style (15 lines)
- Match user language (EN/中文)
- Include units and timeframes
- Lead with answers
- Never expose technical details

## 4. Block Output Policy (40 lines)
### Block vs Chat
- Sections for narrative
- Files for charts/data
- Chat for brief summaries

### Code Delivery
- Simple tasks: execute only
- Complex tasks: deliver .py package

### Content Structure
- Example structure
- Best practices

## 5. Data Sources (60 lines)
### DuckDB (Primary)
- Tables and schemas
- Query best practices
- Options data limitations

### APIs (Fallback)
- FMP vs Polygon.io
- When to use each
- Error handling

### Backtesting
- Data limitations
- Cost assumptions
- Default approach

## 6. Workflow (40 lines)
### Analysis Execution
- Plan → Execute → Deliver

### Block Management
- When to create/update/switch

### Tool Usage
- DuckDB first
- API fallback
- Parallel calls

## 7. Working Environment (50 lines)
### Current Context
- User, Block, History
- Data Memo
- Custom Metrics

### Environment Variables
- Pre-configured APIs
- Sandbox setup

### Project Information
- CLAUDE.md content
- Coding standards

## 8. Artifact Guidelines (60 lines)
### HTML Dashboards
- Single vs multi-chart
- Jinja2 requirements
- Validation

### CSV Data
- Format requirements
- Best practices

### Python Scripts
- When to deliver
- Package structure

## 9. Financial Standards (30 lines)
### Assumptions
- Default periods (TTM)
- Default rates (WACC)
- Documentation requirements

### Metrics
- Custom formulas priority
- Standard definitions

## 10. Output Router (30 lines)
### Decision Logic
- Chat: Quick answers, ≤4 metrics
- Block: Complex analysis, ≥4 companies

### Auto-upgrade
- When to switch formats

## 11. Special Cases (50 lines)
### Options Analysis
- EOD vs real-time
- Polygon.io usage policy

### Currency Conversion
- API source
- Best practices

### News Analysis
- Temporal RAG
- EODHD integration

### Error Recovery
- User dissatisfaction handling
- Root cause analysis
- Incremental fixing

## 12. Display Message Policy (40 lines)
### Business Language
- Translation rules
- Forbidden terms
- Language matching

### Error Translation
- Technical → Business
- Examples

## 13. Suggestions (10 lines)
- End every response with 4 action chips
- JSON format
- Language matching

## 14. Final Checklist (5 lines)
- Lead with answer
- Units present
- No technical leakage
```

**Total Estimated**: ~500-600行（vs 当前1500行）

---

### Phase 3: 关键保留内容

**必须保留的详细说明**（因为是业务规则，非LLM常识）:

#### 3.1 Analysis Block Structure（40行）
- Sections vs Files区别
- create vs update vs switch使用场景
- primary_symbol for logo display
- Redis同步机制

#### 3.2 DuckDB Schema（60行）
- 核心表概述
- options_eod_data特殊说明（EOD限制）
- 与API的分工

#### 3.3 Code Delivery Policy（30行）
- Simple vs Complex任务判断
- .py package结构要求
- 用户可执行性要求

#### 3.4 Display Message Translation（40行）
- 技术→业务语言映射
- 语言匹配规则
- 禁用术语列表

#### 3.5 Options Data Policy（50行）
- EOD vs 实时数据区别
- Polygon.io使用限制
- 默认行为说明

**总计保留**: ~220行核心业务规则

---

## 📈 预期效果

### 量化指标

| 指标 | 当前 | 重构后 | 改善 |
|------|------|--------|------|
| 总长度 | 1500行 | 600行 | -60% |
| 重复规则 | ~200行 | 0行 | -100% |
| 技术示例代码 | 500行 | 50行 | -90% |
| 核心业务规则 | 分散 | 集中220行 | 结构清晰 |
| 工具docstring重复 | 100行 | 0行 | -100% |

### 质量提升

1. **可维护性** ⭐⭐⭐⭐⭐
   - 添加工具: 0改动（docstring已完整）
   - 修改规则: 集中在对应section
   - Schema更新: 动态查询，无需改提示词

2. **可读性** ⭐⭐⭐⭐⭐
   - 结构清晰（14个sections）
   - 每section职责单一
   - 层次分明（原则→规则→细节）

3. **业务对齐** ⭐⭐⭐⭐⭐
   - 保留所有必要业务规则
   - 删除冗余技术细节
   - 强化核心原则

---

## 🚀 实施计划

### Day 1: 删除重复（4小时）

**上午（2小时）**:
1. ✅ 从工具docstring删除3个重复规则
2. ✅ 在主提示词新建`<block_output_policy>`集中这些规则
3. ✅ 测试：create_analysis_block调用是否正常

**下午（2小时）**:
4. ✅ 删除HTML/Jinja2完整代码示例（300行）
5. ✅ 替换为原则 + 要求（20行）
6. ✅ 创建`DEVELOPER_GUIDE.md`存放完整示例

**预期结果**: 1500行 → 1200行（-20%）

---

### Day 2: 删除技术细节（4小时）

**上午（2小时）**:
1. ✅ 删除DuckDB完整schema定义
2. ✅ 改为动态查询引用
3. ✅ 删除SQL语法详细说明

**下午（2小时）**:
4. ✅ 删除Plotly配置示例
5. ✅ 简化backtesting guidelines
6. ✅ 测试：sql_query调用是否正常

**预期结果**: 1200行 → 800行（-33%）

---

### Day 3: 结构重组（4小时）

**上午（2小时）**:
1. ✅ 重组为14个清晰sections
2. ✅ 每section添加简明标题
3. ✅ 调整顺序（核心原则优先）

**下午（2小时）**:
4. ✅ 简化workflow描述（100行→40行）
5. ✅ 整合分散的communication rules
6. ✅ 最终review & cleanup

**预期结果**: 800行 → 600行（-40%）

---

### Day 4: 测试与优化（4小时）

**测试用例**:
1. ✅ 创建Analysis Block（验证sections理解）
2. ✅ 更新Block（验证update_section vs sections区分）
3. ✅ DuckDB查询（验证schema动态查询）
4. ✅ HTML dashboard生成（验证Jinja2要求理解）
5. ✅ Options分析（验证EOD限制理解）
6. ✅ Code delivery（验证simple vs complex判断）

**预期结果**: 600行稳定版本，业务功能无损

---

## ✅ 总结

### 核心差异：我们 vs Kimi CLI

| 维度 | Kimi CLI | 我们 |
|------|----------|------|
| 应用场景 | 通用coding | 垂直领域（金融分析） |
| 前后端关系 | CLI独立 | Agent驱动前端UI |
| 数据源 | 任意 | 固定（DuckDB + FMP/Polygon） |
| 输出格式 | 文件 | Analysis Block（sections+files）|
| 业务规则 | 少 | 多（backtesting、options、code delivery） |
| 工具文档 | 独立.md | 已集成在docstring |

### 重构原则

1. **保留业务规则** - 这是领域知识，LLM不会自己知道
2. **删除技术细节** - LLM已经知道HTML/SQL/Python
3. **消除重复** - 同一规则只在一处说明
4. **结构清晰** - 14个sections，职责分明
5. **原则导向** - 减少step-by-step，增加原则说明

### 不做的事

❌ 删除Analysis Block详细说明（前后端协作核心）
❌ 删除Options data限制说明（业务规则）
❌ 删除Code delivery policy（业务规则）
❌ 删除Display message翻译（用户体验关键）
❌ 简化工具docstring（已经是最佳实践）

### 立即行动

**建议从Day 1开始**（4小时工作量，立即见效）:
1. 删除工具docstring中的重复规则
2. 删除HTML完整代码示例
3. 创建`<block_output_policy>`集中规则

**预期立即收益**:
- 提示词-20%（1500行→1200行）
- 规则更集中（不再分散在工具和主提示词）
- 维护更简单（修改规则只需改一处）
