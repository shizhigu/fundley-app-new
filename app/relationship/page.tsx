'use client';

/**
 * Relationship Management - Agent-Native UI
 *
 * 架构:
 * 1. 不再有固定dashboard
 * 2. UI完全由Agent Team生成(JSON配置)
 * 3. 所有按钮背后是自然语言消息,不是API调用
 * 4. 通过AgentOS Team API与后端通信
 */

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Search, Clock, Mic } from 'lucide-react';
import { VIEW_COMPONENTS } from './components';

// ============================================
// AgentOS Team Client
// ============================================

const TEAM_API_BASE = process.env.NEXT_PUBLIC_CHATBOT_SERVICE_URL || 'http://localhost:8000';
const TEAM_ID = 'relationship-team';

async function sendMessageToTeam(message: string, userId: string) {
  const requestParams = new URLSearchParams({
    message,
    user_id: userId,
    session_id: userId,  // 使用userId作为session_id保持会话
    stream: 'false'  // 不需要流式,直接获取完整结果
  });

  const response = await fetch(`${TEAM_API_BASE}/teams/${TEAM_ID}/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: requestParams.toString()
  });

  if (!response.ok) {
    throw new Error(`Team API error: ${response.statusText}`);
  }

  return response.json();
}

function extractUIConfig(teamResponse: any): any {
  /**
   * 从Team response中提取UI配置
   *
   * Team的最后一个Agent(UI Generator)返回JSON配置
   * 需要从response中解析出来
   */
  try {
    // AgentOS response格式可能是:
    // 1. response.content (字符串)
    // 2. response.messages[last].content
    // 3. response.output

    let content = teamResponse.content ||
                  teamResponse.output ||
                  teamResponse.messages?.slice(-1)[0]?.content;

    if (!content) {
      console.error('No content in team response:', teamResponse);
      return null;
    }

    // UI Generator返回的是JSON字符串,需要parse
    if (typeof content === 'string') {
      // 尝试提取JSON (可能包含在markdown代码块中)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                       content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        content = jsonMatch[1] || jsonMatch[0];
      }

      return JSON.parse(content);
    }

    return content;
  } catch (e) {
    console.error('Failed to extract UI config:', e);
    console.error('Team response:', teamResponse);
    return null;
  }
}

// ============================================
// Main Component
// ============================================

export default function RelationshipView() {
  const { user } = useUser();
  const [uiConfig, setUiConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbUserId, setDbUserId] = useState<string | null>(null);

  // 获取数据库 user_id (UUID) from Clerk user_id
  useEffect(() => {
    if (!user) return;

    const fetchDbUserId = async () => {
      try {
        console.log('🔍 Fetching database user ID for Clerk user:', user.id);
        const response = await fetch('/api/user-id');

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Got database user ID:', data.userId);
          setDbUserId(data.userId);
        } else {
          const errorData = await response.json();
          console.error('❌ Failed to get user ID:', errorData);
          setError('Failed to get user ID: ' + (errorData.error || 'Unknown error'));
          setLoading(false);
        }
      } catch (err) {
        console.error('❌ Error fetching user ID:', err);
        setError('Failed to fetch user ID');
        setLoading(false);
      }
    };

    fetchDbUserId();
  }, [user]);

  // 加载初始UI
  useEffect(() => {
    if (!dbUserId) return;

    loadInitialView();
  }, [dbUserId]);

  const loadInitialView = async () => {
    await sendMessageToAgent("render_current_context");
  };

  // 核心函数:发送消息给Agent Team
  const sendMessageToAgent = async (message: string) => {
    if (!dbUserId) return;

    setLoading(true);
    setError(null);

    try {
      console.log('🤖 Sending message to Agent Team:', message);

      const result = await sendMessageToTeam(message, dbUserId);

      console.log('✅ Team response:', result);

      // 提取UI配置
      const config = extractUIConfig(result);

      if (!config) {
        throw new Error('No UI config returned from team');
      }

      console.log('🎨 UI Config:', config);

      setUiConfig(config);
    } catch (err: any) {
      console.error('❌ Failed to send message:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Loading状态
  if (loading && !uiConfig) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Agent正在分析上下文...</p>
        </div>
      </div>
    );
  }

  // Error状态
  if (error) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-600 mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">出错了</h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadInitialView}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 backdrop-blur-sm bg-white/90">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-gray-900">关系</h1>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>
                  {new Date().toLocaleString('zh-CN', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <Search className="w-4 h-4" />
                <span>搜索</span>
                <kbd className="px-2 py-0.5 text-xs font-semibold text-gray-800 bg-white border border-gray-200 rounded">
                  ⌘K
                </kbd>
              </button>

              {/* Quick Capture */}
              <button
                onClick={() => sendMessageToAgent("语音记录新的互动")}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="语音记录"
              >
                <Mic className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Agent生成的UI */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* 开发模式: 显示Agent推理 */}
        {process.env.NODE_ENV === 'development' && uiConfig?.ai_reasoning && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <div className="text-blue-600 text-sm font-medium">🤖 Agent推理:</div>
              <p className="text-xs text-blue-700">{uiConfig.ai_reasoning}</p>
            </div>
          </div>
        )}

        {/* 渲染Agent生成的组件 */}
        {uiConfig?.layout?.map((block: any, i: number) => {
          const Component = VIEW_COMPONENTS[block.component as keyof typeof VIEW_COMPONENTS];

          if (!Component) {
            console.warn(`未知组件: ${block.component}`);
            return (
              <div key={i} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800">
                  未知组件: {block.component}
                </p>
              </div>
            );
          }

          return (
            <Component
              key={block.key || i}
              {...block.props}
              onButtonClick={sendMessageToAgent}
            />
          );
        })}

        {/* 无组件时的提示 */}
        {!uiConfig?.layout?.length && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">暂无内容</p>
            <button
              onClick={() => sendMessageToAgent("显示最近的联系人")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              查看最近联系
            </button>
          </div>
        )}
      </div>

      {/* Loading Overlay (当切换视图时) */}
      {loading && uiConfig && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-600">Agent正在处理...</p>
          </div>
        </div>
      )}
    </div>
  );
}
