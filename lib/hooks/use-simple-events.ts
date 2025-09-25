import { useState, useEffect } from 'react';
import { convertToSimpleEvents, type SimpleInvocation } from '@/lib/simple-event-converter';
import type { EventRecord } from '@/app/api/chats/[chatId]/events/route';

export function useSimpleEvents(chatId: string) {
  const [invocations, setInvocations] = useState<SimpleInvocation[]>([]);
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
      const simpleInvocations = convertToSimpleEvents(events);
      setInvocations(simpleInvocations);
      setError(null);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setInvocations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [chatId]);

  return { invocations, loading, error, refreshEvents: fetchEvents };
}