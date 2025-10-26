# 提示词革命性重构提案

**基于 Kimi CLI 最佳实践的彻底重构方案**

---

## 🚨 核心问题诊断

### 当前状态分析

**我们的 analyst agent.py**:
- **总长度**: ~3000+ 行（包括工具配置）
- **提示词长度**: ~1500+ 行纯文本
- **结构**: 单一巨型 instructions 字符串
- **复杂度**: 极高，包含大量细节规则

**Kimi CLI 的 system.md**:
- **总长度**: 72 行
- **核心提示词**: ~50 行
- **结构**: 清晰分段，变量注入
- **复杂度**: 简洁明了，只说关键事项

### **对比结果**：我们的提示词是 Kimi 的 **30 倍长**！

---

## 📊 详细对比分析

### 1. 提示词结构对比

#### Kimi CLI - 简洁高效 (72 lines total)

```markdown
# system.md Structure

1. Role & Identity (1 line)
2. Prompt and Tool Use (核心规则, 7 lines)
   - 并行工具调用强调（1行）
   - 工具结果处理（2行）
   - 用户语言匹配（1行）
3. General Coding Guidelines (核心原则, 18 lines)
   - KISS原则（1行）
   - 新项目流程（3行）
   - 现有代码流程（7行）
   - MINIMAL changes强调（1行）
4. Working Environment (环境变量注入, 28 lines)
   - 操作系统提醒
   - 工作目录 + ls输出
   - 当前时间
   - AGENTS.md内容注入
5. Project Information (动态注入)
```

**关键特征**:
- ✅ **变量注入**: `${KIMI_WORK_DIR}`, `${KIMI_NOW}`, `${KIMI_AGENTS_MD}`
- ✅ **分段清晰**: 5个主要section，各司其职
- ✅ **规则简练**: "ALWAYS, keep it stupidly simple" (1句话！)
- ✅ **动态内容**: 环境信息通过变量注入，不写死

#### 我们的 Analyst - 复杂臃肿 (1500+ lines)

```markdown
# agent.py instructions Structure

1. <role> (3 lines) ✅ 简洁
2. <critical_thinking_policy> (11 lines) ⚠️ 过度详细
3. <communication_style> (10 lines) ⚠️ 格式化规则太细
4. <sourcing_and_citations> (7 lines) ⚠️ 引用格式细节过多
5. <confidentiality> (3 lines) ✅ 合理
6. <output_types> (17 lines) ⚠️ 输出格式规则太长
7. <output_router> (33 lines) ❌ 路由逻辑太详细（LLM能自己判断）
8. <workflow_planning> (23 lines) ❌ 流程step过于详细
9. <data_and_citations> (3 lines) ✅ 合理
10. <financial_metrics_policy> (3 lines) ✅ 合理
11. <user_opened_analysis_block> (5 lines) ⚠️ 可简化
12. <final_checklist> (9 lines) ❌ 检查清单LLM不需要
13. <suggestions_policy> (13 lines) ⚠️ JSON格式细节过多
14. **Developer Appendix (Internal)** - 900+ lines ❌❌❌
    - <data_sources_and_workflow> (180 lines)
    - <data_memo_system> (15 lines)
    - <output_rules_internal> (7 lines)
    - <analysis_block_policy> (20 lines)
    - <artifact_creation_protocol> (80 lines)
    - <csv_and_files> (12 lines)
    - **HTML Dashboard Guidelines** (300+ lines) ❌❌❌
    - **Brand Color Guidelines** (extracted from viz templates)
    - **Script Mode Guidelines** (600+ lines) ❌❌❌❌

**Visualization Templates** (separate file, 400+ lines):
- Color schemes
- Plotly configurations
- Panel configurations
```

**问题总结**:
- ❌ **过度详细化**: 每个环节都有详细step-by-step
- ❌ **规则冗余**: 很多规则LLM本身就会遵守
- ❌ **技术实现细节**: HTML模板、SQL语法、API endpoint全写进提示词
- ❌ **检查清单**: "Before sending, ensure..." LLM不是人，不需要checklist
- ❌ **示例代码过多**: 完整的Jinja2模板示例（100+行）

---

## 💡 Kimi 的核心设计哲学

### 1. **KISS原则贯穿始终**

**Kimi 的表述**（仅1行）:
```
ALWAYS, keep it stupidly simple. Do not overcomplicate things.
```

**我们的表述**（分散在多处，累计50+行）:
```markdown
<critical_thinking_policy>
* Treat every figure as a claim requiring cross-checking
* Compare across sources, reconcile discrepancies
* Integrate qualitative context with quantitative trends
* If user dissatisfied: 1) Re-examine 2) Identify 3) Fix & validate
</critical_thinking_policy>

<workflow_planning>
1. Plan the workflow internally
2. Decide block placement using context
3. Make financial assumptions
4. Create block early
5. Then execute
6. Update block with final artifacts
</workflow_planning>

... (还有更多workflow细节)
```

**对比**:
- Kimi: 信任LLM，1句话说清原则
- 我们: 不信任LLM，事无巨细列举步骤

---

### 2. **Minimal Changes 原则**

**Kimi 的表述**（1行）:
```
Make MINIMAL changes to achieve the goal. This is very important to your performance.
```

**我们的表述**（分散在Script Mode部分，100+行）:
```markdown
**Script Mode Workflow**:
1. Create initial script with all components
2. Run and check output
3. If errors:
   a. Read the script
   b. Search for error location
   c. Use apply_diff for precision fixes
   d. Never rewrite entire script
4. Iterate until working
5. Generate artifacts
6. Validate artifacts
... (详细的错误处理流程，各种if-else分支)
```

**对比**:
- Kimi: 1句话强调原则
- 我们: 详细的if-else流程图（LLM不需要流程图！）

---

### 3. **变量注入 vs 硬编码**

**Kimi 的做法**（动态注入）:
```markdown
The current working directory is `${KIMI_WORK_DIR}`.

The directory listing of current working directory is:
```
${KIMI_WORK_DIR_LS}
```

The current date and time in ISO format is `${KIMI_NOW}`.

`${KIMI_WORK_DIR}/AGENTS.md`:
---
${KIMI_AGENTS_MD}
---
```

**我们的做法**（全部硬编码）:
```python
instructions=["""
<data_sources_and_workflow>
**Tier 1: DuckDB/MotherDuck (Primary Source)**

Coverage: All financial statements, ratios, daily prices, company info, **options data**

Core tables:
- `financial_statements`: All GAAP line items (revenue, EBIT, assets, equity, cash flow, etc.)
- `eod_data`: Daily OHLCV, volume, market cap
- `company_profiles`: Sector, industry, description, HQ, exchange
- `options_eod_data`: **Options contracts data (~121M rows)** - PRIMARY source for ALL options analysis

**Options Table Schema (`options_eod_data`)**:
```
- underlying_symbol (VARCHAR): Stock ticker (e.g., 'AAPL')
- ticker (VARCHAR): Full option contract ID (e.g., 'AAPL250117P00150000')
- option_type (VARCHAR): 'call' or 'put'
... (完整的schema，10+行)
```

**Options Query Best Practices**:
```sql
-- Find ATM options (30-day expiration)
SELECT * FROM options_eod_data
WHERE underlying_symbol = 'AAPL'
  AND option_type = 'put'
... (完整的SQL示例，15+行)
```
"""]
```

**对比**:
- Kimi: 环境信息通过变量动态注入（目录列表实时获取）
- 我们: 数据库schema、SQL示例全部硬编码（未来schema变更 = 提示词全改）

---

### 4. **工具说明分离**

**Kimi 的做法**（工具描述在独立.md文件）:

```
kimi_cli/src/kimi_cli/tools/file/
├── read.py              # 工具实现
├── read.md              # 工具说明（给LLM看）
├── replace.py
├── replace.md
├── grep.py
└── grep.md
```

**`read.md` 内容示例**（简洁明了）:
```markdown
Read a file from the local filesystem.

Usage:
- The file_path parameter must be an absolute path
- By default, reads up to 2000 lines
- You can specify line offset and limit for long files
- Results are returned with line numbers

Examples:
    read(file_path="/path/to/file.py")
    read(file_path="/path/to/file.py", line_offset=100, n_lines=50)
```

**我们的做法**（工具说明全在docstring + 主提示词重复）:

```python
# tools/e2b.py
async def read_script(self, ...):
    """
    Read a Python script with line numbers and output limits.

    Output limits to prevent context overflow:
    - Max 1000 lines per read
    - Max 100KB file size
    - Truncation warnings if limits hit

    Args:
        display_message: User-facing status message
        script_name: Script filename (e.g., "01_dcf_valuation.py")
        start_line: First line to read (default: 1)
        end_line: Last line to read (default: None = all lines)

    Returns:
        JSON with script content, line numbers, and truncation warnings
    """

# agent.py
instructions = """
... (主提示词里又重复了一遍read_script的使用说明)
**Script Mode Workflow**:
1. Use read_script() to examine code
2. Never read files >1000 lines at once
3. Use start_line/end_line for large files
... (又是详细的使用流程)
"""
```

**对比**:
- Kimi: 工具说明独立文件，主提示词不涉及工具细节
- 我们: 工具docstring + 主提示词重复说明，导致主提示词膨胀

---

## 🎯 革命性重构方案

### Phase 1: 立即削减 (目标: 从1500行→300行)

#### **1.1 删除所有技术实现细节** ❌ 删除900+行

**删除内容**:
- ❌ HTML Dashboard完整代码示例（300行）
- ❌ SQL查询示例代码（100+行）
- ❌ DuckDB schema详细描述（80行）
- ❌ Plotly/Panel配置示例（200行）
- ❌ Jinja2模板完整示例（100行）
- ❌ API endpoint详细说明（100+行）

**原因**:
- LLM已经知道如何写HTML、SQL、Python
- 示例代码应该在文档，不在提示词
- Schema信息应该通过工具动态查询，不是硬编码

**保留方式**:
- 技术细节 → 迁移到独立文档（`DEVELOPER_GUIDE.md`）
- Agent需要时通过工具查询（如`search_docs`）

---

#### **1.2 简化流程描述** ⚠️ 简化400行

**当前（详细流程，100+行）**:
```markdown
<workflow_planning>
**Task Planning & Execution Protocol**

Before executing any substantial analysis, follow this protocol:

1. **Plan the workflow internally** (data needs → analysis steps → deliverables).
2. **Decide block placement** using context and session_state:
   * If `session_state['current_block_id']` exists and the request **refines or extends the same topic** → update that block.
   * If the topic is **materially different** (new company, unrelated question, distinct deliverable) → create a new block.
   * Use your judgment based on context - don't ask user.
3. **Make financial assumptions** (time periods, metric definitions, filters) using professional standards:
   * Default to widely-accepted industry practices (WACC for discount rate, TTM for financials, standard EBITDA definition)
   * Document all assumptions in analysis markdown sections
   * Users can request adjustments after seeing results
4. **Create the block early** if needed (before heavy computation), with:
   * Clear title (company/topic-specific).
   * `primary_symbol` (main ticker for logo display).
   * Placeholder section if necessary; artifacts added later.
5. **Then execute** the data fetching, analysis, and artifact generation.
6. **Update the block** with final artifacts and narrative sections including assumption documentation.
```

**重构后（原则导向，10行）**:
```markdown
## Workflow

1. Understand user's request and plan the analysis
2. Use existing analysis blocks when extending the same topic; create new blocks for different topics
3. Execute analysis using available tools
4. Make reasonable professional assumptions (document them)
5. Deliver results via chat (quick answers) or analysis blocks (structured reports)
```

**删除的内容**:
- 详细的if-else逻辑（LLM会自己判断）
- block placement详细规则（session_state自己看）
- 财务假设详细列表（professional standards足够）
- 分步执行流程（LLM知道先后顺序）

---

#### **1.3 删除检查清单** ❌ 删除50行

**当前**:
```markdown
<final_checklist>
Before sending, ensure:
1. Answer leads;
2. Chat vs Block choice is justified;
3. Period & unit are present;
4. Sources/citations included properly;
5. No internal details leaked;
6. One-line implication when relevant.
</final_checklist>

<artifact_creation_protocol>
**Generate → Validate → Attach** (GVA) is mandatory.

**A. Generate**
- Produce artifacts via code first
- HTML: save as `dashboard.html`
- CSV: save with `df.to_csv(index=False)`
- Use **simple filenames** only

**B. Validate (Basic checks)**
1) **Existence**: File exists on disk
2) **Non-empty**: File size > 0 bytes
3) **Naming**: Simple filename, descriptive extension
4) **Content sanity**: CSV has headers, HTML has visible content

**C. Attach**
- Only if all artifacts pass validation
- New analysis → create_analysis_block()
- Continuation → update_analysis_block()
- If any artifact fails: do not attach

**D. Business-facing status message**
- Use investor-friendly display_message
- Translate technical issues to business language
- Never mention file paths, endpoints, tool names
</artifact_creation_protocol>
```

**重构后（无）**:
```markdown
(完全删除)
```

**原因**:
- LLM不需要checklist（它会自动检查输出质量）
- Validate步骤是代码逻辑，不是提示词职责
- "Before sending, ensure..."假设LLM是人类，实际上LLM生成即final

---

#### **1.4 合并重复规则** ⚠️ 合并100行

**当前（分散在多处）**:
```markdown
<communication_style>
* Mirror the user's language (EN/中文/etc.) automatically.
* **Always include timeframe & unit** for metrics
* Use Markdown for clarity
</communication_style>

<output_rules_internal>
* Localization: mirror user language; localize dates/units.
* **Lead with the answer.** Keep user-visible content concise.
</output_rules_internal>

<artifact_creation_protocol>
**D. Business-facing status message (ZERO technical leakage)**
- **LANGUAGE**: Always use the user's language (EN/中文) in display_message.
</artifact_creation_protocol>
```

**重构后（合并为1处）**:
```markdown
## Communication

- Match user's language automatically (EN/中文/etc.)
- Include units and timeframes for all metrics
- Lead with the answer, keep it concise
- Use Markdown for formatting
- Never expose internal technical details to users
```

---

### Phase 2: 引入变量注入 (灵活性提升10倍)

#### **2.1 环境信息动态化**

**当前（硬编码）**:
```python
instructions = """
<data_sources_and_workflow>
**Tier 1: DuckDB/MotherDuck**
Core tables:
- `financial_statements`: All GAAP line items
- `eod_data`: Daily OHLCV
- `company_profiles`: Sector, industry
- `options_eod_data`: Options contracts data (~121M rows)
"""
```

**重构后（动态注入）**:
```python
instructions = """
## Data Sources

**Primary**: DuckDB/MotherDuck (financial data, daily prices, options)
**API Fallback**: FMP (ownership, filings), Polygon.io (real-time options)

Available tables:
${DATABASE_SCHEMA_SUMMARY}

For schema details, use `sql_query("SELECT * FROM table_name LIMIT 5")` to inspect.
"""

# 动态生成DATABASE_SCHEMA_SUMMARY
def get_schema_summary():
    return """
- financial_statements (123.5M rows, updated daily)
- eod_data (45.2M rows, updated EOD)
- company_profiles (15K rows, updated weekly)
- options_eod_data (121M rows, updated EOD)
""".strip()
```

**好处**:
- Schema变更无需改提示词
- 可以显示实时统计（行数、更新时间）
- 未来支持多数据库时，注入不同schema

---

#### **2.2 工具列表动态注入**

**当前（手动维护）**:
```python
instructions = """
Available tools:
- sql_query: Query DuckDB for financial data
- convert_currency: Cross-market currency conversion
- E2BTools: Python sandbox for analysis
- FMPTools: Financial Modeling Prep API
- search_docs: API documentation search
- call_api: Dynamic API calls
- create_analysis_block: Create new analysis
- update_analysis_block: Update existing analysis
... (手动列举20+个工具)
"""
```

**重构后（自动生成）**:
```python
instructions = """
## Available Tools

${TOOL_LIST}

For tool usage details, call the tool with `--help` or check tool docstrings.
"""

# 自动生成TOOL_LIST
def generate_tool_list(tools):
    return "\n".join([f"- {tool.name}: {tool.description}" for tool in tools])
```

**好处**:
- 添加/删除工具无需改提示词
- 工具描述同步（从docstring自动提取）
- 工具列表永远准确

---

#### **2.3 用户偏好动态注入**

**当前（session_state手动读取）**:
```python
instructions = """
<financial_metrics_policy>
* If the user has defined custom formulas in `session_state['available_metrics']`, use them verbatim.
</financial_metrics_policy>

<user_opened_analysis_block>
If a block is provided in session_state['current_block_id']:
* Deliver updates to that block when refining
* If topic is unrelated, create a new block
</user_opened_analysis_block>
"""
```

**重构后（变量注入）**:
```python
instructions = """
## Current Context

User: ${USER_ID}
Active Block: ${CURRENT_BLOCK_ID}  # None if no block open
Block History: ${RECENT_BLOCKS}    # Last 5 blocks

Custom Metrics:
${CUSTOM_METRICS}  # User-defined formulas from memory

Data Memo:
${DATA_MEMO}  # Recent data discoveries
"""

# 在pre_hook中动态生成
def inject_user_context(session_state):
    return {
        "USER_ID": session_state.get("current_user_id"),
        "CURRENT_BLOCK_ID": session_state.get("current_block_id") or "None",
        "RECENT_BLOCKS": format_block_history(session_state.get("block_history", [])),
        "CUSTOM_METRICS": format_custom_metrics(session_state.get("available_metrics", {})),
        "DATA_MEMO": format_data_memo(session_state.get("data_memo", {}))
    }
```

**好处**:
- 上下文信息一目了然（不需要LLM自己从session_state提取）
- 提示词更短（不需要"If xxx exists, do yyy"的if-else）
- 更新context无需改提示词

---

### Phase 3: 工具描述分离 (提示词再减300行)

#### **3.1 创建独立工具文档**

**新建**: `chatbot-service/tools/descriptions/`

```
tools/descriptions/
├── sql_query.md
├── e2b_tools.md
├── fmp_tools.md
├── analysis_blocks.md
├── search_docs.md
└── ...
```

**示例 - `e2b_tools.md`**:
```markdown
# E2B Python Sandbox Tools

Execute Python code in isolated environment for data analysis and visualization.

## Core Tools

### read_script(script_name, start_line=1, end_line=None)
Read Python script with line numbers. Max 1000 lines per read.

### write_script(script_name, content)
Create new Python script. Syntax is validated before writing.

### search_in_script(pattern, script_name=None, glob_pattern=None, ...)
Search for code patterns. Supports multi-file search via glob.

### apply_diff(script_name, diff_text)
Apply unified diff patch. Use search_in_script() first to find line numbers.

### replace_in_script(script_name, old_text, new_text, replace_all=False)
Replace exact string. Simpler than apply_diff for small changes.

## Best Practices

1. Always search before edit (use search_in_script)
2. Prefer replace_in_script for simple changes (no line numbers needed)
3. Use apply_diff for complex multi-location changes
4. Validate syntax before running (write_script auto-validates)

## Environment

Pre-configured:
- FMP_API_KEY, POLYGON_API_KEY, MOTHERDUCK_TOKEN
- Libraries: pandas, plotly, numpy, requests, duckdb
```

**主提示词简化**:
```python
# 从1500行 → 50行！
instructions = """
${ROLE}

${CORE_PRINCIPLES}

${WORKING_ENVIRONMENT}

${CURRENT_CONTEXT}

For tool usage details, refer to tool documentation.
"""
```

---

#### **3.2 工具说明加载机制**

**Agno框架扩展**（类似Kimi的工具描述注入）:

```python
# tools/base.py
class ToolWithDocs:
    @property
    def description_file(self):
        """Path to markdown documentation for this tool"""
        return Path(__file__).parent / "descriptions" / f"{self.name}.md"

    def get_full_description(self):
        """Combine docstring + markdown file"""
        if self.description_file.exists():
            return self.description_file.read_text()
        return self.__doc__

# agent.py
analyst = Agent(
    tools=[
        E2BTools(),
        FMPTools(),
        sql_query,
        ...
    ],
    load_tool_descriptions=True,  # NEW: Auto-load .md files
    instructions=short_system_prompt  # Now only 50 lines!
)
```

---

### Phase 4: 最终结构 (预期效果)

#### **重构后的 system.md** (目标: 100行)

```markdown
# Financial Analyst Agent

You are a professional financial analyst serving institutional investors. Deliver high-quality analysis with critical thinking.

## Core Principles

1. **Critical Thinking**: Question all data, cross-check sources, highlight risks
2. **Minimal Changes**: Make only necessary changes to achieve goals
3. **KISS**: Keep it stupidly simple, avoid overcomplications
4. **Professional Standards**: Follow industry best practices

## Communication

- Match user's language (EN/中文/etc.)
- Include units and timeframes for all metrics
- Lead with the answer, be concise
- Use Markdown for formatting
- Never expose internal technical details

## Workflow

1. Understand user's request
2. Plan analysis approach
3. Use available tools to gather data
4. Execute analysis
5. Deliver via chat (quick answers) or blocks (structured reports)

## Data Sources

**Primary**: DuckDB/MotherDuck
${DATABASE_SCHEMA_SUMMARY}

**API Fallback**: FMP (ownership, filings), Polygon.io (real-time options)

For schema details: `sql_query("SELECT * FROM table LIMIT 5")`

## Current Context

User: ${USER_ID}
Active Block: ${CURRENT_BLOCK_ID}
${RECENT_BLOCKS}

Custom Metrics:
${CUSTOM_METRICS}

Data Memo:
${DATA_MEMO}

## Tools

${TOOL_LIST}

For detailed usage, refer to tool documentation.

## Output Formats

- **Chat**: Quick answers, small tables (≤5 rows)
- **Analysis Blocks**: Structured reports with:
  - Interactive HTML dashboards
  - CSV data tables
  - Narrative analysis

Use blocks for complex analysis (≥4 companies, ≥8 quarters, or requires visualization).

## Working Environment

Directory: ${WORK_DIR}
```
${WORK_DIR_LS}
```

Current Time: ${NOW}

Project Info (`CLAUDE.md`):
---
${CLAUDE_MD}
---
```

**预期长度**: ~100行（vs 当前1500行，减少93%！）

---

## 📈 预期收益

### 量化指标

| 指标 | 当前 | 重构后 | 改善 |
|------|------|--------|------|
| 提示词长度 | 1500行 | 100行 | -93% |
| Context tokens | ~15K | ~2K | -87% |
| 硬编码规则 | ~200条 | ~10条 | -95% |
| 技术细节行数 | 900行 | 0行 | -100% |
| 工具说明重复度 | 100% | 0% | -100% |
| Schema变更影响 | 全部重写 | 0改动 | 无限大 |
| 添加新工具成本 | 改提示词 | 0成本 | 自动化 |

### 质量提升

1. **可维护性** ⭐⭐⭐⭐⭐
   - 添加工具: 0改动（自动注入）
   - Schema更新: 0改动（动态查询）
   - 规则调整: 只改核心原则（10行以内）

2. **性能提升** ⭐⭐⭐⭐
   - Context减少87% → 推理速度提升
   - 规则简化 → LLM理解更准确
   - 减少hallucination（没有冗长示例干扰）

3. **灵活性** ⭐⭐⭐⭐⭐
   - 变量注入 → 支持多用户定制
   - 工具描述分离 → 支持工具版本化
   - 动态context → 支持A/B测试

---

## 🚀 实施路线图

### Sprint 1: 削减（1天）

1. ✅ 删除所有技术实现细节（HTML/SQL示例）
2. ✅ 删除检查清单和详细流程
3. ✅ 合并重复规则
4. ✅ 简化output_router逻辑

**预期结果**: 1500行 → 600行

---

### Sprint 2: 变量注入（2天）

1. ✅ 实现环境变量注入机制
2. ✅ 动态生成DATABASE_SCHEMA_SUMMARY
3. ✅ 动态生成TOOL_LIST
4. ✅ 注入用户上下文（CURRENT_BLOCK, DATA_MEMO）

**预期结果**: 600行 → 200行

---

### Sprint 3: 工具描述分离（2天）

1. ✅ 创建tools/descriptions/目录
2. ✅ 迁移所有工具说明到.md文件
3. ✅ 实现工具描述自动加载
4. ✅ 从主提示词删除工具细节

**预期结果**: 200行 → 100行

---

### Sprint 4: 测试与优化（1天）

1. ✅ A/B测试新旧提示词
2. ✅ 对比response质量
3. ✅ 调优核心原则措辞
4. ✅ 文档化最佳实践

**预期结果**: 100行稳定版本

---

## 📋 附录: Kimi vs 我们的具体差异

### 并行工具调用强调

**Kimi** (1句话):
```
You have the capability to output any number of tool calls in a single response.
If you anticipate making multiple non-interfering tool calls, you are HIGHLY RECOMMENDED
to make them in parallel to significantly improve efficiency.
```

**我们** (分散各处，无明确强调):
```python
# agent.py
model=OpenAIChat(id="gpt-5")  # parallel_tool_calls默认开启

# instructions中无明确并行调用指导
```

**改进**:
```markdown
## Tool Usage

Make tool calls in parallel whenever possible to improve efficiency.
```

---

### 错误处理哲学

**Kimi** (信任LLM):
```
The results of the tool calls will be returned to you in a `tool` message.
You must decide on your next action based on the tool call results, which could be:
1. Continue working on the task
2. Inform the user that the task is completed or has failed
3. Ask the user for more information
```

**我们** (详细流程):
```markdown
<artifact_creation_protocol>
**B. Validate (Basic checks)**
1) **Existence**: File exists on disk
2) **Non-empty**: File size > 0 bytes
3) **Naming**: Simple filename
4) **Content sanity**: CSV has headers, HTML has visible content

**C. Attach**
- Only if all artifacts pass validation
- If any artifact fails: do not attach
... (20+行详细规则)
</artifact_creation_protocol>
```

**对比**:
- Kimi: 3条原则，LLM自己判断
- 我们: 详细validation checklist（应该是代码逻辑，不是提示词）

---

### 环境信息提供

**Kimi** (动态注入):
```markdown
The current working directory is `${KIMI_WORK_DIR}`.

The directory listing of current working directory is:
```
${KIMI_WORK_DIR_LS}
```
```

**我们** (session_state隐式传递):
```python
# agent.py
pre_hooks=[update_session_state]  # 加载到session_state

# instructions
# 未明确告知LLM当前工作目录和文件结构
```

**改进**:
```markdown
## Working Environment

Directory: ${WORK_DIR}
```
${WORK_DIR_LS}
```

Scripts: ${SCRIPT_LIST}  # 当前block的所有scripts
```

---

## ✅ 总结

### 核心要点

1. **信任LLM**: 不需要详细step-by-step，LLM会自己规划
2. **KISS原则**: 1句话能说清的，不要写10行
3. **变量注入**: 动态信息别硬编码
4. **工具分离**: 工具说明不在主提示词
5. **删除示例代码**: LLM知道怎么写代码
6. **删除checklist**: LLM不是人，不需要"确保xxx"

### 行动号召

**建议立即开始Sprint 1**（1天工作量）:
1. 删除所有技术示例代码（HTML/SQL/Plotly）
2. 删除workflow详细流程
3. 删除final_checklist
4. 合并重复的communication rules

**预期立即收益**:
- 提示词从1500行→600行（-60%）
- Context tokens减少50%+
- LLM推理速度提升
- 维护成本大幅降低

---

**最后的建议**: 先做Sprint 1（删减），立即看到效果，再决定是否做Sprint 2-4（变量注入、工具分离）。删减是低风险高回报的，可以今天就开始！
