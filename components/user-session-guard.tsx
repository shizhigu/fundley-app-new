'use client';

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

/**
 * 监听用户切换，自动清空 localStorage
 *
 * 场景：
 * 1. 用户 A 登录，localStorage 存了数据
 * 2. 用户 A 退出，localStorage 被清空（在 sidebar-user-nav.tsx 中处理）
 * 3. 用户 B 登录，如果有残留数据则清空
 * 4. 用户 B 使用中，切换到用户 C，localStorage 清空
 */
export function UserSessionGuard() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded || !user) return;

    const currentUserId = user.id;
    const storedUserId = localStorage.getItem('current_user_id');

    // 首次登录或用户切换
    if (!storedUserId || storedUserId !== currentUserId) {
      console.log('🔄 User changed, clearing localStorage...');

      // 保存主题设置（不应该被清除）
      const theme = localStorage.getItem('theme');

      // 清空所有数据
      localStorage.clear();

      // 恢复主题设置
      if (theme) {
        localStorage.setItem('theme', theme);
      }

      // 记录当前用户 ID
      localStorage.setItem('current_user_id', currentUserId);

      console.log('✅ localStorage cleared for new user:', currentUserId);
    }
  }, [user, isLoaded]);

  return null; // 这是一个纯逻辑组件，不渲染任何内容
}
