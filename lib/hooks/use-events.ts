import { useState, useEffect } from 'react';
import type { ChatMessage } from '@/lib/types';
import { convertEventsToMessages } from '@/lib/event-converter';
import type { EventRecord } from '@/app/api/chats/[chatId]/events/route';

export function useEvents(chatId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    if (!chatId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/chats/${chatId}/events`);

      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch events');
      }

      const events: EventRecord[] = data.events;
      const convertedMessages = convertEventsToMessages(events);
      setMessages(convertedMessages);
      setError(null);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [chatId]);

  return { messages, loading, error, setMessages, refreshEvents: fetchEvents };
}