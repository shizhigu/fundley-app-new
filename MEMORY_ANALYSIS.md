# 消息内存分析与清理工具

## 问题描述

用户报告浏览器tab内存占用达到1.1GB，但heap snapshot只有291MB。经过分析发现主要原因是：

1. **Tab内存 vs Heap内存差异**: Tab内存包含DOM渲染、V8引擎开销、浏览器缓存等，而heap只是JavaScript对象内存
2. **Reasoning Parts冗余**: 消息中可能存在大量空的或重复的reasoning parts，导致数据冗余

## 分析工具

### 1. 浏览器控制台分析 (推荐)

运行 `node debug-messages.js` 获取浏览器控制台代码，然后：

1. 打开 http://localhost:3001
2. 登录应用
3. 打开浏览器开发者工具 (F12) → Console
4. 粘贴并运行分析代码

**分析结果包括：**
- 总消息数量和parts统计
- Reasoning parts数量和占比
- 空reasoning parts识别
- 重复reasoning text分析
- 最大消息分析
- 内存使用估算

### 2. 服务端API分析

```bash
# 获取用户消息统计 (需要登录)
curl "http://localhost:3001/api/analyze"

# 预览清理效果 (干运行)
curl "http://localhost:3001/api/cleanup?dryRun=true"
```

## 清理工具

### 自动清理API

```bash
# 预览清理效果（不会实际修改数据）
curl "http://localhost:3001/api/cleanup?dryRun=true"

# 执行实际清理
curl -X POST "http://localhost:3001/api/cleanup"
# 或者
curl "http://localhost:3001/api/cleanup?dryRun=false"
```

### 清理逻辑

清理工具会执行以下操作：

1. **移除空reasoning parts**: 删除text为空或只有空白的reasoning parts
2. **去重同一消息内的重复reasoning**: 在同一条消息内，删除重复的reasoning text
3. **保持数据完整性**: 只清理reasoning parts，保留所有其他类型的parts

**注意**: 不会删除跨消息的重复reasoning，因为它们可能在不同上下文中有不同含义。

## 使用流程

### 步骤1: 分析现状

```bash
# 运行分析脚本查看详细信息
node debug-messages.js

# 在浏览器控制台运行分析代码
# 或者使用API (需要先登录应用)
curl "http://localhost:3001/api/analyze"
```

### 步骤2: 预览清理效果

```bash
# 干运行清理，查看可节省的内存
curl "http://localhost:3001/api/cleanup?dryRun=true"
```

### 步骤3: 执行清理 (可选)

如果分析结果显示有显著的冗余数据：

```bash
# 执行实际清理
curl -X POST "http://localhost:3001/api/cleanup"
```

## 清理效果预期

根据类似案例，清理后可能实现：

- 删除空reasoning parts: 节省 ~50 bytes × 空parts数量
- 去除重复reasoning text: 节省重复文本大小
- 总内存节省: 通常为几KB到几十KB

## 技术实现

### Convex数据库函数

- `cleanup.cleanupReasoningParts`: 清理冗余reasoning parts
- `cleanup.analyzeUserMessages`: 分析用户消息统计

### API端点

- `GET /api/analyze`: 获取消息分析结果
- `GET /api/cleanup?dryRun=true`: 预览清理效果
- `POST /api/cleanup`: 执行实际清理

### 安全措施

- 用户认证: 只能清理当前用户的消息
- 干运行模式: 默认为预览模式，避免意外删除
- 数据完整性: 只处理reasoning parts，保护其他数据

## 故障排除

### 常见问题

1. **API返回401**: 需要先登录应用
2. **分析结果为空**: 确认用户有消息数据
3. **清理无效果**: 可能数据已经很干净，无需清理

### 调试方法

```bash
# 检查服务器日志
# 查看Convex开发者控制台
# 使用浏览器网络面板检查API调用
```

## 后续优化建议

1. **定期自动清理**: 考虑在消息保存时自动去重
2. **更智能的reasoning管理**: 避免生成重复reasoning
3. **消息归档**: 对历史消息进行压缩存储
4. **内存监控**: 添加客户端内存使用监控