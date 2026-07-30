import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getUnreadConversationCount } from '../services/chatService';
import { getUnreadNotificationCount } from '../services/notificationService';
import { useAuthStore } from '../store/authStore';

export function useRealtimeBadges() {
  const user = useAuthStore((state) => state.user);
  const [chatUnread, setChatUnread] = useState(0);
  const [notificationUnread, setNotificationUnread] = useState(0);

  const refreshBadges = useCallback(async () => {
    if (!user) {
      setChatUnread(0);
      setNotificationUnread(0);
      return;
    }

    try {
      const [chatUnreadCount, notificationUnreadCount] = await Promise.all([
        getUnreadConversationCount(),
        getUnreadNotificationCount(),
      ]);

      setChatUnread(chatUnreadCount);
      setNotificationUnread(notificationUnreadCount);
    } catch {
      // Ignore badge errors to avoid blocking core page UX.
    }
  }, [user]);

  useEffect(() => {
    refreshBadges();
  }, [refreshBadges]);

  useEffect(() => {
    const client = supabase;
    if (!user || !client) {
      return () => {};
    }

    const channelId = `unread-badges-${user.id}`;
    const channel = client
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        () => {
          refreshBadges();
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refreshBadges();
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refreshBadges();
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refreshBadges();
        },
      );

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        refreshBadges();
      }
    });

    return () => {
      client.removeChannel(channel);
    };
  }, [refreshBadges, user]);

  return {
    chatUnread,
    notificationUnread,
    refreshBadges,
  };
}
