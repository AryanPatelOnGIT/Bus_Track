"use client";

import { useState, useEffect, useRef } from "react";
import { rtdb } from "@/lib/firebase";
import { ref, push, onValue, serverTimestamp } from "firebase/database";
import { Send, X, User } from "lucide-react";

interface Message {
  id: string;
  text: string;
  from: "driver" | "passenger";
  senderName: string;
  senderId: string;
  timestamp: number;
}

interface Props {
  busId: string;
  currentUserRole: "driver" | "passenger" | "admin";
  currentUserId: string;
  currentUserName: string;
  onClose?: () => void;
  isOverlay?: boolean;
}

export default function MessagingPanel({ 
  busId, 
  currentUserRole, 
  currentUserId, 
  currentUserName, 
  onClose,
  isOverlay = false
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!busId) return;

    const messagesRef = ref(rtdb, `messages/${busId}`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const msgs = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val
        })).sort((a: any, b: any) => (a.timestamp || 0) - (b.timestamp || 0));
        setMessages(msgs);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
        setMessages([]);
      }
    });

    return () => unsubscribe();
  }, [busId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !busId) return;

    const roleForMsg = currentUserRole === "admin" ? "driver" : currentUserRole;

    try {
      const messagesRef = ref(rtdb, `messages/${busId}`);
      await push(messagesRef, {
        text: newMessage.trim(),
        from: roleForMsg,
        senderName: currentUserName || (roleForMsg === "driver" ? "Operator" : "Rider"),
        senderId: currentUserId || "anonymous",
        timestamp: serverTimestamp()
      });
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message", error);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-brand-surface border border-white/5 shadow-2xl relative ${isOverlay ? 'rounded-t-[2rem]' : 'rounded-2xl'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-white/5 bg-brand-dark/40 backdrop-blur-xl">
        <div>
          <h3 className="font-bold text-white tracking-tight flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Comms
          </h3>
          <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mt-0.5">
            Node: {busId}
          </p>
        </div>
        {isOverlay && onClose && (
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 gap-4 flex flex-col bg-brand-dark/20 text-sm">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-white/20">
            <User className="w-8 h-8 mb-3 opacity-20" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-center">Secure Channel Established<br/>Awaiting Comms...</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId || (currentUserRole === 'driver' && msg.from === 'driver');
            
            return (
              <div 
                key={msg.id} 
                className={`flex flex-col max-w-[85%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
              >
                {!isMe && (
                  <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest mb-1 px-1">
                    {msg.senderName}
                  </span>
                )}
                <div 
                  className={`px-4 py-2.5 rounded-2xl ${
                    isMe 
                      ? 'bg-emerald-500 text-white rounded-tr-sm' 
                      : 'bg-white/10 text-white rounded-tl-sm border border-white/5'
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap font-medium">{msg.text}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-white/5 bg-brand-dark/40 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Transmit message..."
            className="flex-1 bg-white/5 border border-white/10 h-12 rounded-xl px-4 text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all font-medium text-sm"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emerald-400 active:scale-95 transition-all shadow-xl"
          >
            <Send className="w-5 h-5 ml-1" />
          </button>
        </div>
      </form>
    </div>
  );
}
