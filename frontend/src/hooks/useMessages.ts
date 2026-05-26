'use client';

import { useState, useEffect } from 'react';
import { RTDBMessage, subscribeToMessages, sendMessage, clearMessages } from '@/lib/rtdb';

export const useMessages = (rideSessionId: string | null) => {
  const [messages, setMessages] = useState<(RTDBMessage & { id: string })[]>([]);

  useEffect(() => {
    if (!rideSessionId) {
      setMessages([]);
      return;
    }
    const unsubscribe = subscribeToMessages(rideSessionId, (msgs) => {
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [rideSessionId]);

  const handleSendMessage = async (text: string, senderId: string, senderName: string) => {
    if (!rideSessionId) return;
    await sendMessage(rideSessionId, { text, senderId, senderName, timestamp: Date.now() });
  };

  const handleClearMessages = async () => {
    if (!rideSessionId) return;
    await clearMessages(rideSessionId);
  };

  return { messages, sendMessage: handleSendMessage, clearMessages: handleClearMessages };
};
