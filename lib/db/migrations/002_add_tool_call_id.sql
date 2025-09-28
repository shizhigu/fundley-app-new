-- 添加 tool_call_id 字段用于工具调用事件配对
-- 这样可以将 ToolCallStarted 和 ToolCallCompleted 事件关联起来

ALTER TABLE messages ADD COLUMN tool_call_id TEXT;

-- 创建索引用于快速查找
CREATE INDEX idx_messages_tool_call_id ON messages(tool_call_id);