# 文件系统重构进度

## ✅ 已完成部分

### 1. Python Files API （完成）
**文件**: `chatbot-service/app/api/v1/endpoints/analysis_files.py`

**变更**:
- ✅ 路由改为: `/files/{user_id}/{file_path:path}` (支持相对路径)
- ✅ 安全检查：防止目录穿越，路径解析验证
- ✅ 直接从workspace读取文件：`/tmp/fundley/{user_id}/{file_path}`
- ✅ 移除了subdirectory分类逻辑（reports/data/artifacts）

**示例**:
```
GET /api/v1/analysis/files/{user_id}/nvda_analysis/report.html
→ 读取 /tmp/fundley/{user_id}/nvda_analysis/report.html
```

### 2. Next.js Files API （完成）
**文件**: `app/api/files/[[...path]]/route.ts`

**变更**:
- ✅ Catch-all路由支持多级路径
- ✅ 移除filename的`/`限制
- ✅ 正确转发相对路径到Python服务

**示例**:
```
GET /api/files/nvda_analysis/report.html
→ Python: /api/v1/analysis/files/{user_id}/nvda_analysis/report.html
```

### 3. Block Tools （完成）
**文件**: `chatbot-service/tools/block_tools.py`

**变更**:
- ✅ `_categorize_files()` 支持相对路径
- ✅ artifacts数组新增`path`字段（完整相对路径）
- ✅ 保留`filename`字段（仅文件名）用于向后兼容
- ✅ 移除create_analysis_block中的block目录复制逻辑

**DB Content结构**:
```json
{
  "title": "NVDA Analysis",
  "sections": [...],
  "files": {
    "artifacts": [
      {
        "path": "nvda_analysis/report.html",  // 新架构
        "filename": "report.html",             // 向后兼容
        "type": "chart",
        "extension": ".html"
      }
    ],
    "charts": ["nvda_analysis/report.html"]  // 向后兼容
  }
}
```

### 4. E2B _auto_download （完成）
**文件**: `chatbot-service/tools/e2b.py`

**变更**:
- ✅ 签名改为: `_auto_download_artifacts(sandbox, user_id, working_dir="")`
- ✅ 下载到: `/tmp/fundley/{user_id}/{working_dir}/file.html`
- ✅ 移除subdirectory分类（reports/data/artifacts）
- ✅ 返回相对路径列表：`["nvda_analysis/report.html"]`
- ✅ 移除`_touch_block_after_download()`函数

**示例**:
```python
artifacts = await self._auto_download_artifacts(
    sandbox,
    user_id="user123",
    working_dir="nvda_analysis"
)
# 返回: ["nvda_analysis/report.html", "nvda_analysis/data.csv"]
```

---

## ⏳ 待完成部分

### 5. E2B run_script （未完成）
**文件**: `chatbot-service/tools/e2b.py` (line 1304-1441)

**需要改动**:

```python
# 当前 (line 1349-1350)
workspace = Path(f"/tmp/fundley/{user_id}/blocks/{block_id}")
script_path = workspace / 'scripts' / script_name

# 改为
workspace = Path(f"/tmp/fundley/{user_id}")
script_path = workspace / script_name  # Agent提供完整相对路径

# 当前 (line 1383)
artifacts = await self._auto_download_artifacts(sandbox, user_id, block_id)

# 改为
script_dir = Path(script_name).parent  # 提取脚本所在目录
artifacts = await self._auto_download_artifacts(sandbox, user_id, str(script_dir))
```

**函数签名改为**:
```python
async def run_script(self, session_state, display_message: str, script_path: str) -> str:
    """
    Args:
        script_path: 相对于workspace的脚本路径
                    例如: "nvda_analysis/fetch_data.py"
    """
```

**调用示例**:
```python
run_script(
    session_state,
    display_message="Analyzing revenue growth",
    script_path="nvda_analysis/fetch_data.py"  # 完整相对路径
)
```

### 6. E2B run_pipeline （未完成）
**文件**: `chatbot-service/tools/e2b.py` (line 1443+)

**需要改动**:

```python
# 当前 (line 1467)
scripts_dir = Path(f"/tmp/fundley/{user_id}/blocks/{block_id}/scripts")

# 改为
workspace = Path(f"/tmp/fundley/{user_id}")
scripts_dir = workspace / pipeline_dir  # Agent指定pipeline目录
```

**建议新签名**:
```python
async def run_pipeline(self, session_state, display_message: str, pipeline_dir: str) -> str:
    """
    Args:
        pipeline_dir: pipeline所在目录（相对于workspace）
                     例如: "nvda_analysis" 或 "projects/2024q4"
    """
```

### 7. E2B write_script （未完成）
**文件**: `chatbot-service/tools/e2b.py`

**需要改动**:
- 签名改为接受相对路径：`write_script(session_state, script_path, content)`
- 移除`scripts/`目录假设
- Agent提供完整路径：`"nvda_analysis/fetch_data.py"`

### 8. Frontend Renderer （未完成）
**文件**: `components/analysis-block-renderer.tsx`

**需要改动**:

```typescript
// 当前 (line 337, 425, 539, 551, 1302, 1769)
`/api/files/${filename}?block_id=${blockId}&v=${blockVersion}`

// 改为
`/api/files/${file.path}?v=${blockVersion}`
// 其中 file.path 可能包含 "/"，如 "nvda_analysis/report.html"
```

**注意**: 需要处理artifacts数组，使用`path`字段而不是`filename`

### 9. Agent Instructions （未完成）
**文件**: `chatbot-service/agents/analyst/agent.py`

**需要更新提示词**:
- 说明workspace在`/tmp/fundley/{user_id}/`
- Agent可以自由组织文件结构
- 创建/更新block时提供相对路径
- 移除"blocks/{block_id}/scripts/"等结构假设
- 强调"workspace = 代码库，block = 交付物"

---

## 测试清单

重构完成后需要测试：

1. ✅ Python files API能正确处理相对路径
2. ✅ Next.js API catch-all路由工作正常
3. ✅ block_tools存储相对路径到DB
4. ✅ _auto_download下载到正确目录
5. ⏳ run_script执行Agent指定路径的脚本
6. ⏳ 前端能正确渲染带路径的文件
7. ⏳ Agent能理解新的文件组织方式
8. ⏳ 端到端：Agent创建文件→下载→交付→前端显示

---

## 架构对比

### 旧架构（已废弃）
```
/tmp/fundley/{user_id}/
└── blocks/
    └── {block_id}/
        ├── scripts/
        │   └── analysis.py
        ├── data/
        │   └── data.csv
        └── reports/
            └── report.html
```

### 新架构（目标）
```
/tmp/fundley/{user_id}/
├── nvda_analysis/
│   ├── fetch_data.py
│   ├── report.html
│   └── data.csv
├── projects/
│   └── 2024q4/
│       └── earnings_analysis.py
└── temp/
```

**关键概念**:
- Workspace = Agent的代码库和工作区
- Block = 交付物（选择workspace中的文件交付给用户）
- Agent调用`create/update_analysis_block(filenames=["nvda_analysis/report.html"])`

---

## 下一步行动

**优先级顺序**:
1. 完成E2B run_script重构（最关键）
2. 完成E2B run_pipeline重构
3. 更新E2B write_script和其他脚本工具
4. 更新前端renderer
5. 更新Agent提示词
6. 端到端测试

**预计剩余工作量**: 2-3小时
