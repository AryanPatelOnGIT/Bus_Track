'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMessages } from '@/hooks/useMessages';
import { Send, X, MessageSquare } from 'lucide-react';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  rideSessionId: string | null;
}

export default function ChatModal({ isOpen, onClose, rideSessionId }: ChatModalProps) {
  const { user, userData } = useAuth();
  const { messages, sendMessage } = useMessages(rideSessionId);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user || !userData || !rideSessionId) return;

    try {
      await sendMessage(inputText.trim(), user.uid, userData.name || 'Passenger');
      setInputText('');
    } catch (error) {
      console.error('Failed to send message', error);
    }
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 z-[500] backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div className="absolute bottom-0 left-0 w-full h-[70vh] bg-[#0A0A0A] border-t border-[#222222] rounded-t-2xl z-[510] flex flex-col shadow-[0_-8px_24px_rgba(0,0,0,0.8)] transition-transform duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#222222]">
          <div className="flex flex-col">
            <h2 className="font-[family-name:var(--font-dm-mono)] text-base text-[#F5F5F5]">Chat with Driver</h2>
            <p className="font-[family-name:var(--font-inter)] text-[10px] text-[#888888]">
              {rideSessionId ? `Session: ${rideSessionId}` : 'Waiting for live driver'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-[#888888] hover:text-[#F5F5F5] transition-colors bg-[#141414] rounded-full">
            <X size={18} />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <MessageSquare size={32} className="text-[#333333] mb-3" />
              <p className="font-[family-name:var(--font-inter)] text-sm text-[#888888]">No messages yet.</p>
              <p className="font-[family-name:var(--font-inter)] text-xs text-[#555555] mt-1">Send a message to the driver if you need assistance.</p>
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

        {/* Input Area */}
        <div className="p-4 bg-[#0A0A0A] border-t border-[#222222] pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-[#1A1A1A] border border-[#333333] rounded-lg px-4 py-3 text-[#F5F5F5] placeholder-[#555555] font-[family-name:var(--font-inter)] text-sm outline-none focus:border-[#555555] transition-colors"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || !rideSessionId}
              className="w-[46px] h-[46px] flex items-center justify-center bg-[#1E1E1E] border border-[#333333] rounded-lg text-[#F5F5F5] hover:bg-[#2A2A2A] transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
        
      </div>
    </>
  );
}
