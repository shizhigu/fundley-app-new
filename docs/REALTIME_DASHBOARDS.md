# Real-Time Dashboards Architecture

## 快速开始

**完整配置指南**: 请查看 [`REALTIME_DASHBOARD_SETUP.md`](./REALTIME_DASHBOARD_SETUP.md)

**必需步骤**:
1. 配置环境变量 (chatbot-service/.env):
   - `GITHUB_BOT_TOKEN` - GitHub Personal Access Token (必需)
   - `GITHUB_ORG` - GitHub 组织名 (可选，默认用户账户)
   - `VERCEL_TOKEN` - Vercel API Token (可选，手动连接也可以)
2. 运行数据库迁移: `psql "$DATABASE_URL" -f lib/db/migrations/0028_create_data_apps.sql`
3. 重建 E2B 模板: `e2b template build --path /Users/gushizhi/e2b.Dockerfile --name fundley-analyst`
4. 安装 Python 依赖: `cd chatbot-service && pip install -r requirements.txt`

## 概述

用户现在可以要求 Agent 创建**实时、持久化的 Web 应用**（Next.js），自动部署到 Vercel，随时访问。

## 核心设计理念

**完全在 E2B 沙盒内完成所有操作**：
- ✅ Agent 自由创建 Next.js 项目
- ✅ Agent 自由编写任意文件（.ts, .tsx, .js, .json）
- ✅ Agent 自己运行 `pnpm build`、`git push`
- ✅ **没有 hardcoded 工具或模板**
- ✅ Agent 完全自主决定项目结构和实现

## 工作流程

```
用户："创建一个 NVDA 实时监控面板"
  ↓
Agent 在 E2B 沙盒内：
  1. npx create-next-app@latest nvda-monitor
  2. write_script("nvda-monitor/pages/index.tsx", ...)
  3. write_script("nvda-monitor/pages/api/data.ts", ...)
  4. run_command("cd nvda-monitor && pnpm build")
  5. run_command("cd nvda-monitor && git push ...")
  ↓
Vercel 自动部署（60-90秒）
  ↓
返回：https://dashboards-user123.vercel.app
```

## 技术栈

### 前端
- Next.js 14 (App Router)
- TypeScript
- React 18
- Tailwind CSS
- 可选：Plotly.js, Recharts, Chart.js（Agent 自己决定）

### 后端
- Next.js API Routes（Serverless Functions）
- Environment Variables（API keys 保护）

### 部署
- GitHub（代码托管）
- Vercel（自动部署 + CDN）

## 数据库 Schema

```sql
CREATE TABLE data_apps (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  url TEXT NOT NULL,
  github_repo TEXT,
  deployment_status TEXT DEFAULT 'pending',
  code JSONB NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## E2B 工具修改

### `write_script` - 现在支持任意文件类型

**之前**：只支持 Python 文件，强制语法验证

**现在**：
- 支持 `.ts`, `.tsx`, `.js`, `.json`, `.md`, `.txt` 等所有文件
- 只对 `.py` 文件进行语法验证
- Agent 可以自由创建 Next.js 项目的所有文件

```python
# 示例使用
write_script(
    script_path="dashboard-app/pages/index.tsx",
    content="""
import { useState } from 'react';
export default function Home() {
  return <div>Hello Dashboard</div>;
}
    """
)
```

### `run_command` - 已有功能，无需修改

Agent 可以运行任意 shell 命令：
- `npx create-next-app@latest ...`
- `pnpm install`
- `pnpm build`
- `git init && git push ...`

## Agent Prompt 更新

在 `/chatbot-service/agents/analyst/agent.py` 的 `instructions` 中添加了完整的 `<realtime_dashboard_creation>` 指引，包括：
- 何时使用（关键词：real-time, live, always-on）
- 完整工作流程
- API Key 安全最佳实践
- 代码示例（API Route + Frontend Page）
- 常见错误处理

## 安全性

### API Key 保护

**✅ 正确做法**：
```typescript
// pages/api/data.ts
export default async function handler(req, res) {
  const apiKey = process.env.FMP_API_KEY; // 在服务端
  const response = await fetch(`https://api.fmp.com?apikey=${apiKey}`);
  res.json(await response.json());
}
```

**❌ 错误做法**：
```typescript
// pages/index.tsx
const data = await fetch(`https://api.fmp.com?apikey=YOUR_KEY`); // 暴露在浏览器
```

Agent 的 prompt 明确要求 API keys 只能在 API routes 中使用。

### 沙盒隔离

- 所有构建操作在 E2B 沙盒内进行
- 不影响主服务器
- 构建失败不会影响用户环境

## 成本

### MVP 阶段（完全免费）

| 服务 | 免费额度 | 成本 |
|------|---------|------|
| GitHub | 无限 public repos | $0 |
| Vercel | 100 GB 带宽/月 | $0 |
| E2B | 按使用量 | 可控（只在创建时使用）|

**预估**：100 个 dashboards，月成本 < $50

## 与静态 Deliverables 的区别

| 特性 | 静态 Deliverable | Real-Time Dashboard |
|------|----------------|-------------------|
| **存储** | /tmp/fundley/{user_id}/deliverables/ | Vercel Cloud |
| **访问** | 仅当前 session | 随时访问 |
| **刷新** | 静态 HTML | 自动刷新（每 60 秒）|
| **分享** | 无法直接分享 | 公开 URL |
| **持久化** | session 结束可能丢失 | 永久保存 |
| **适用场景** | 一次性分析报告 | 持续监控、团队共享 |

## 下一步

### 待完成
1. **前端 Dashboard 管理 UI**（用户查看已部署的所有 apps）
2. **测试完整工作流**（创建 → 部署 → 访问）

### 可选优化
- Vercel API 集成（自动连接 GitHub repo）
- 部署状态实时追踪
- 错误日志查看
- Dashboard 编辑功能

## 文件清单

### 核心文件
- `/lib/db/migrations/0028_create_data_apps.sql` - 数据库 schema
- `/chatbot-service/tools/e2b.py` - 修改了 `write_script` 工具
- `/chatbot-service/agents/analyst/agent.py` - 添加了 `<realtime_dashboard_creation>` 指引
- `/chatbot-service/agents/analyst/realtime_dashboard_guide.md` - 详细文档（供 Agent 参考）

### 已删除的文件
- ~~`chatbot-service/tools/github_manager.py`~~ - 不需要 hardcoded 工具
- ~~`chatbot-service/tools/vercel_manager.py`~~ - 不需要 hardcoded 工具
- ~~`chatbot-service/tools/nextjs_templates.py`~~ - 不需要预设模板

## 示例对话

**用户**：创建一个 NVDA 实时价格监控面板

**Agent**：
1. 在 E2B 中运行 `npx create-next-app@latest nvda-monitor`
2. 创建 `pages/api/nvda-data.ts`（API Route，保护 API key）
3. 创建 `pages/index.tsx`（前端页面，60 秒自动刷新）
4. 运行 `pnpm build` 验证无错误
5. `git push` 到 GitHub
6. 返回："您的实时面板已部署：https://dashboards-abc123.vercel.app"

**用户打开链接**：看到自动刷新的 NVDA 价格面板

## 总结

这个设计的核心优势：
- ✅ **完全灵活** - Agent 自由发挥，不受限于预设模板
- ✅ **简单易维护** - 只修改了一个工具（`write_script`），没有新增复杂工具
- ✅ **安全可靠** - 所有操作在 E2B 沙盒内，API keys 受保护
- ✅ **成本可控** - 利用 Vercel/GitHub 免费额度

让 Agent 自己决定如何实现，比预设一堆 hardcoded 工具更强大！
