import type { UserType } from '@/lib/auth/clerk';
import type { ChatModel } from './models';

interface Entitlements {
  maxMessagesPerDay: number;
  availableChatModelIds: Array<ChatModel['id']>;
}

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /*
   * For users without an account
   */
  guest: {
    maxMessagesPerDay: 10000, // 临时增加到10000，实际生产环境需要调整
    availableChatModelIds: ['grok-3', 'gemini-2.5-pro', 'gpt-5', 'Fast'],
  },

  /*
   * For users with an account
   */
  regular: {
    maxMessagesPerDay: 10000, // 临时增加到10000，实际生产环境需要调整
    availableChatModelIds: ['grok-3', 'gemini-2.5-pro', 'gpt-5', 'Fast'],
  },

  /*
   * TODO: For users with an account and a paid membership
   */
};
