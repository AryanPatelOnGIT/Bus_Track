"use client";

import { useState, useEffect, useRef } from "react";
import { rtdb } from "@/lib/firebase";
import { ref, push, onValue, serverTimestamp } from "firebase/database";
import { Send, X, Radio } from "lucide-react";

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
  onUnreadCountChange?: (count: number) => void;
}

export default function MessagingPanel({
  busId,
  currentUserRole,
  currentUserId,
  currentUserName,
  onClose,
  isOverlay = false,
  onUnreadCountChange,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSeenCountRef = useRef(0);

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

        if (onUnreadCountChange) {
          const othersCount = msgs.filter((m: any) => m.senderId !== currentUserId).length;
          if (othersCount > lastSeenCountRef.current) {
            onUnreadCountChange(othersCount - lastSeenCountRef.current);
          }
          lastSeenCountRef.current = othersCount;
        }

        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 80);
      } else {
        setMessages([]);
      }
    });

    return () => unsubscribe();
  }, [busId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom when keyboard appears on mobile (input focus)
  const handleInputFocus = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 350);
  };

  // --- Rate Limiting ---
  const [messagesSentCounts, setMessagesSentCounts] = useState<{ timestamp: number }[]>([]);

  // --- Profanity Filter ---
  const PROFANITY_REGEX = /\b(fuck|shit|bitch|ass|asshole|cunt|dick|pussy|bastard|mc|bc|madarchod|bhenchod|chutiya|gandu|bhosadike|bhosdi|harami|kutta|slut|whore|randi|muth|bhosada)\b/gi;

  const censorText = (text: string) => text.replace(PROFANITY_REGEX, "***");

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !busId) return;

    const now = Date.now();
    const oneHourAgo = now - 3600000;
    const recentMessages = messagesSentCounts.filter(m => m.timestamp > oneHourAgo);

    if (recentMessages.length >= 60) {
      alert("Rate limit exceeded: Maximum 60 messages per hour.");
      return;
    }

    if (recentMessages.length > 0 && (now - recentMessages[recentMessages.length - 1].timestamp < 3000)) {
      setNewMessage("");
      return;
    }

    const censoredContent = censorText(newMessage.trim());
    setMessagesSentCounts([...recentMessages, { timestamp: now }]);
    const roleForMsg = currentUserRole === "admin" ? "driver" : currentUserRole;

    try {
      const messagesRef = ref(rtdb, `messages/${busId}`);
      await push(messagesRef, {
        text: censoredContent,
        from: roleForMsg,
        senderName: currentUserName || (roleForMsg === "driver" ? "Operator" : "Rider"),
        senderId: currentUserId || "anonymous",
        timestamp: serverTimestamp()
      });
      setNewMessage("");
      // Scroll to bottom after sending
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (error) {
      console.error("Failed to send message", error);
    }
  };

  // Send on Enter key (not Shift+Enter)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (ts: number) => {
    if (!ts) return "";
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      className={`flex flex-col h-full shadow-2xl relative overflow-hidden
        ${isOverlay
          ? "bg-[#0f1117] rounded-t-[1.75rem] border border-white/5"
          : "bg-brand-surface border border-white/5 rounded-2xl"
        }`}
    >
      {/* Drag Handle — Moovit-style pull indicator */}
      {isOverlay && (
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <Radio className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Comms
            </h3>
            <p className="text-[9px] text-white/30 font-black uppercase tracking-widest">
              Node: {busId || "—"}
            </p>
          </div>
        </div>
        {isOverlay && onClose && (
          <button
            onClick={onClose}
            aria-label="Close messaging panel"
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages List */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 overscroll-contain"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-white/15 py-12">
            <Radio className="w-8 h-8 opacity-20" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-center leading-relaxed">
              Secure Channel Established<br />Awaiting Comms…
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId || (currentUserRole === "driver" && msg.from === "driver");

            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[82%] ${isMe ? "self-end items-end" : "self-start items-start"}`}
              >
                {/* Sender name + time */}
                <div className={`flex items-baseline gap-1.5 mb-1 px-1 ${isMe ? "flex-row-reverse" : ""}`}>
                  <span className={`text-[9px] font-bold uppercase tracking-widest ${isMe ? "text-emerald-400/80" : "text-white/35"}`}>
                    {isMe ? "You" : msg.senderName}
                  </span>
                  {msg.timestamp && (
                    <span className="text-[8px] font-mono text-white/20">
                      {formatTime(msg.timestamp)}
                    </span>
                  )}
                </div>
                {/* Bubble */}
                <div
                  className={`px-4 py-2.5 text-sm leading-relaxed font-medium whitespace-pre-wrap ${
                    isMe
                      ? "bg-emerald-500 text-white rounded-2xl rounded-tr-sm"
                      : "bg-white/8 text-white rounded-2xl rounded-tl-sm border border-white/5"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* Input Bar — with safe-area-inset-bottom for iOS notch */}
      <form
        onSubmit={handleSend}
        className="shrink-0 px-4 pt-3 border-t border-white/5 bg-[#0f1117]/80 backdrop-blur-xl"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
      >
        <div className="flex items-center gap-2.5">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder="Message…"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="send"
            inputMode="text"
            className="flex-1 bg-white/5 border border-white/10 h-11 rounded-2xl px-4 text-white placeholder:text-white/20 focus:outline-none focus:border-white/25 focus:bg-white/8 transition-all font-medium text-sm"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            aria-label="Send message"
            className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center disabled:opacity-25 disabled:cursor-not-allowed hover:bg-emerald-400 active:scale-90 transition-all shadow-lg shadow-emerald-500/20 shrink-0"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
