# Stream Error 修复方案

## 问题诊断

**错误**: `Stream error: [TypeError: terminated] { [cause]: [Error: read ECONNRESET] }`

**症状**: 在回复长文本时，前端流式连接中断

## 根本原因

1. **前端读取超时** - 浏览器 fetch API 有默认超时，无数据时会断开
2. **心跳间隔过长** - 15秒心跳在某些环境下不足以保持连接
3. **数据库操作阻塞** - 每个 chunk 都更新数据库，导致流延迟
4. **缓冲区管理不当** - 长响应可能导致内存问题

## 修复清单

### ✅ Fix 1: 缩短心跳间隔（5秒）

**文件**: `/app/api/chat/[chatId]/stream/route.ts:288-291`

```typescript
// 修改前
const heartbeatInterval = setInterval(() => {
  safeEnqueue(encoder.encode(': heartbeat\n\n'));
}, 15000);

// 修改后
const heartbeatInterval = setInterval(() => {
  safeEnqueue(encoder.encode(': heartbeat\n\n'));
}, 5000);  // 5秒心跳，确保连接不会超时
```

**原因**: Next.js 和浏览器在无数据时可能 10 秒就断开，5 秒心跳更安全

### ✅ Fix 2: 减少数据库更新频率（批量更新）

**文件**: `/app/api/chat/[chatId]/stream/route.ts:419-502`

```typescript
// 修改前（每个chunk都更新）
} else {
  assistantContent += content;
  await updateMessage(assistantMessage.id, assistantContent);  // ❌ 每次都写DB
}

// 修改后（批量更新）
} else {
  assistantContent += content;
  // 每5个chunk或每500字符更新一次数据库
  if (
    assistantContent.length % 500 === 0 ||
    assistantContent.length - lastDbUpdate > 500
  ) {
    await updateMessage(assistantMessage.id, assistantContent);
    lastDbUpdate = assistantContent.length;
  }
}
```

**原因**: 减少数据库写操作，避免阻塞流

### ✅ Fix 3: 添加前端超时重连机制

**文件**: `/lib/hooks/use-chat.ts:265-296`

```typescript
// 修改前（无超时处理）
const handleStreamResponse = useCallback(async (response: Response) => {
  if (!response.body) throw new Error('No response body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();  // ❌ 无超时
    if (done) break;
    // ...
  }
}, []);

// 修改后（添加超时和错误恢复）
const handleStreamResponse = useCallback(async (response: Response) => {
  if (!response.body) throw new Error('No response body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let lastChunkTime = Date.now();

  const readTimeout = 30000; // 30秒超时

  while (true) {
    // 创建超时Promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Stream read timeout')), readTimeout);
    });

    try {
      // 竞速：读取 vs 超时
      const { done, value } = await Promise.race([
        reader.read(),
        timeoutPromise
      ]);

      if (done) break;

      lastChunkTime = Date.now();
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // ... rest of processing
    } catch (error) {
      if (error.message === 'Stream read timeout') {
        console.warn('⚠️ Stream read timeout, connection may be lost');
        // 可以在这里尝试重连或优雅降级
        break;
      }
      throw error;
    }
  }
}, []);
```

**原因**: 避免前端无限等待，提供超时保护

### ✅ Fix 4: 添加缓冲区大小限制

**文件**: `/app/api/chat/[chatId]/stream/route.ts:418-431`

```typescript
// 修改后
const decoder = new TextDecoder();
let buffer = '';
let assistantContent = '';

const MAX_BUFFER_SIZE = 10000; // 10KB 缓冲区限制

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value, { stream: true });
  buffer += chunk;

  // 防止缓冲区过大
  if (buffer.length > MAX_BUFFER_SIZE) {
    console.warn('⚠️ Buffer size exceeded, processing...');
    // 处理已有buffer
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';  // 保留最后一行（可能不完整）
    // ... 处理lines
  }

  // ... rest of processing
}
```

**原因**: 防止内存溢出，及时处理数据

## 实施优先级

1. **高优先级** - Fix 1: 缩短心跳间隔（立即生效，风险低）
2. **高优先级** - Fix 2: 减少数据库更新（直接影响性能）
3. **中优先级** - Fix 3: 前端超时保护（提升稳定性）
4. **低优先级** - Fix 4: 缓冲区限制（预防性措施）

## 测试方法

1. **长文本测试**: 请求生成 3000+ 字的长回复
2. **慢速网络测试**: 使用 Chrome DevTools Network Throttling
3. **并发测试**: 同时发送多个请求
4. **断线恢复测试**: 手动断开网络再恢复
