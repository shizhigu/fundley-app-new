/**
 * Relationship Management UI Components
 *
 * Agent-Native组件库:所有按钮背后都是自然语言消息,不是API调用
 */

import React from 'react';
import {
  AlertCircle, Users, Sparkles, CheckCircle2, TrendingUp,
  ArrowRight, Mail, Coffee, Phone, MessageSquare, Calendar,
  FileText, Clock
} from 'lucide-react';

// ============================================
// 类型定义
// ============================================

interface UIAction {
  label: string;
  message: string;  // 🔥 自然语言消息,不是API endpoint
  variant: 'primary' | 'secondary' | 'ghost';
}

interface ComponentProps {
  onButtonClick: (message: string) => void;  // 🔥 发送消息给Agent
}

// ============================================
// Component 1: UrgentBanner - 紧急提醒横幅
// ============================================

interface UrgentBannerProps extends ComponentProps {
  message: string;
  context: string;
  actions: UIAction[];
}

export function UrgentBanner({ message, context, actions, onButtonClick }: UrgentBannerProps) {
  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 rounded-xl p-6 mb-6">
      <div className="flex items-start gap-4">
        <div className="p-2 bg-amber-100 rounded-lg">
          <AlertCircle className="w-6 h-6 text-amber-600" />
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            ⚡ {message}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {context}
          </p>

          <div className="flex items-center gap-3">
            {actions.map((action, i) => (
              <button
                key={i}
                onClick={() => onButtonClick(action.message)}
                className={`
                  px-4 py-2 rounded-lg font-medium transition-all
                  ${action.variant === 'primary'
                    ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-sm'
                    : action.variant === 'secondary'
                    ? 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    : 'text-gray-600 hover:text-gray-900'
                  }
                `}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Component 2: OpportunityCard - AI发现的机会
// ============================================

interface OpportunityCardProps extends ComponentProps {
  title: string;
  description: string;
  people: Array<{ id: string; name: string; context: string }>;
  reasoning: string[];
  confidence: number;
  actions: UIAction[];
}

export function OpportunityCard({ title, description, people, reasoning, confidence, actions, onButtonClick }: OpportunityCardProps) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6 mb-6">
      <div className="flex items-start gap-4">
        <div className="p-2.5 bg-blue-100 rounded-lg">
          <Users className="w-6 h-6 text-blue-600" />
        </div>

        <div className="flex-1">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
              <p className="text-sm text-gray-600">{description}</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-semibold text-blue-700">
                {Math.round(confidence * 100)}% 匹配
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4 p-3 bg-white/60 rounded-lg">
            {people.map((person, i) => (
              <React.Fragment key={person.id}>
                {i > 0 && <ArrowRight className="w-4 h-4 text-gray-400" />}
                <div>
                  <div className="font-medium text-gray-900">{person.name}</div>
                  <div className="text-xs text-gray-500">{person.context}</div>
                </div>
              </React.Fragment>
            ))}
          </div>

          <div className="mb-4 space-y-1.5">
            {reasoning.map((reason, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>{reason}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {actions.map((action, i) => (
              <button
                key={i}
                onClick={() => onButtonClick(action.message)}
                className={`
                  px-4 py-2 rounded-lg font-medium transition-all
                  ${action.variant === 'primary'
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Component 3: RecentPeople - 最近联系人
// ============================================

interface Person {
  id: string;
  name: string;
  avatar: string;
  company: string;
  last_contact: string;
  strength: number;
  quick_context: string;
}

interface RecentPeopleProps extends ComponentProps {
  title: string;
  people: Person[];
}

export function RecentPeople({ title, people, onButtonClick }: RecentPeopleProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <button
          onClick={() => onButtonClick("显示所有联系人")}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          查看全部
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {people.map((person) => (
          <button
            key={person.id}
            onClick={() => onButtonClick(`查看${person.name}的完整档案`)}
            className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 hover:shadow-md transition-all text-left group border border-transparent hover:border-gray-200"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="text-3xl">{person.avatar}</div>
              <span className="text-xs text-gray-500">{person.last_contact}</span>
            </div>

            <h4 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
              {person.name}
            </h4>
            <p className="text-sm text-gray-500 mb-3">{person.company}</p>

            <p className="text-xs text-gray-600 mb-3 line-clamp-2">
              {person.quick_context}
            </p>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">关系强度</span>
                <span className="font-medium text-gray-900">{person.strength}/10</span>
              </div>
              <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                  style={{ width: `${person.strength * 10}%` }}
                />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Component 4: ActionItems - 待办事项
// ============================================

interface ActionItem {
  id: string;
  text: string;
  person: { id: string; name: string };
  due: string;
  priority: 'high' | 'medium' | 'low';
  agent_actions: Array<{ label: string; message: string }>;
}

interface ActionItemsProps extends ComponentProps {
  title: string;
  items: ActionItem[];
}

export function ActionItems({ title, items, onButtonClick }: ActionItemsProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className={`
              p-2 rounded-lg mt-0.5
              ${item.priority === 'high' ? 'bg-red-100' : 'bg-gray-200'}
            `}>
              <CheckCircle2 className={`w-4 h-4 ${item.priority === 'high' ? 'text-red-600' : 'text-gray-600'}`} />
            </div>

            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-gray-900 mb-1">{item.text}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>{item.person.name}</span>
                    <span>•</span>
                    <span className={item.priority === 'high' ? 'text-red-600 font-medium' : ''}>
                      {item.due}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3">
                {item.agent_actions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => onButtonClick(action.message)}
                    className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Component 5: AIInsights - AI洞察
// ============================================

interface Insight {
  type: 'pattern' | 'health' | 'opportunity';
  icon: 'trending' | 'check' | 'users';
  text: string;
  action?: { label: string; message: string } | null;
}

interface AIInsightsProps extends ComponentProps {
  insights: Insight[];
}

export function AIInsights({ insights, onButtonClick }: AIInsightsProps) {
  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100 p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-purple-600" />
        <h3 className="font-semibold text-gray-900">AI 洞察</h3>
      </div>

      <div className="space-y-3">
        {insights.map((insight, i) => (
          <div key={i} className="bg-white/70 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-start gap-3">
              {insight.icon === 'trending' && <TrendingUp className="w-5 h-5 text-purple-600 mt-0.5" />}
              {insight.icon === 'check' && <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />}
              {insight.icon === 'users' && <Users className="w-5 h-5 text-blue-600 mt-0.5" />}

              <div className="flex-1">
                <p className="text-sm text-gray-700 mb-2">{insight.text}</p>
                {insight.action && (
                  <button
                    onClick={() => onButtonClick(insight.action!.message)}
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    {insight.action.label} →
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Export all components
export const VIEW_COMPONENTS = {
  UrgentBanner,
  OpportunityCard,
  RecentPeople,
  ActionItems,
  AIInsights,
};
