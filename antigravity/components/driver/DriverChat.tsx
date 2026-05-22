'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMessages } from '@/hooks/useMessages';
import { Send } from 'lucide-react';

export default function DriverChat() {
  const { user, userData } = useAuth();
  const rideSessionId = userData?.rideSessionId || userData?.vehicleId || 'demo-session'; // Fallback to vehicleId for demo
  const { messages, sendMessage } = useMessages(rideSessionId);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user || !userData) return;

    try {
      await sendMessage(inputText.trim(), user.uid, userData.name || 'Driver');
      setInputText('');
    } catch (error) {
      console.error('Failed to send message', error);
    }
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-full flex flex-col bg-[#0A0A0A]">
      <div className="p-4 border-b border-[#222222] bg-[#0A0A0A] z-10">
        <h2 className="font-[family-name:var(--font-dm-mono)] text-base text-[#F5F5F5]">Passenger Chat</h2>
        <p className="font-[family-name:var(--font-inter)] text-xs text-[#888888]">Session: {rideSessionId}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="font-[family-name:var(--font-inter)] text-sm text-[#555555]">No messages yet.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === user?.uid;
            return (
              <div key={msg.id} className={`flex flex-col msg-enter max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                <span className="font-[family-name:var(--font-inter)] text-[10px] text-[#555555] mb-1 px-1">
                  {isMe ? 'You' : msg.senderName} • {formatTime(msg.timestamp)}
                </span>
                <div className={`px-3 py-2 rounded-lg text-sm font-[family-name:var(--font-inter)] ${
                  isMe 
                    ? 'bg-[#1E1E1E] text-[#F5F5F5] border border-[#333333] rounded-tr-none' 
                    : 'bg-[#141414] text-[#E8E8E8] border border-[#222222] rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-[#0A0A0A] border-t border-[#222222]">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Message passengers..."
            className="flex-1 bg-[#1A1A1A] border border-[#333333] rounded-lg px-4 py-2.5 text-[#F5F5F5] placeholder-[#555555] font-[family-name:var(--font-inter)] text-sm outline-none focus:border-[#555555] transition-colors"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-10 h-10 flex items-center justify-center bg-[#1E1E1E] border border-[#333333] rounded-lg text-[#F5F5F5] hover:bg-[#2A2A2A] transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
