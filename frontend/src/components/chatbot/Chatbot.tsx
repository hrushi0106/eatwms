import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useChatbotStore } from '../../stores/chatbotStore';
import { chatbotApi, ChatMessage } from '../../api/chatbot.api';
import { useAuth } from '../../contexts/AuthContext';
import Logo from '../ui/Logo';
import {
  XMarkIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  TrashIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
function RenderText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => {
        // Render **bold** text
        const parts = line.split(/\*\*(.*?)\*\*/g);
        const rendered = parts.map((part, j) =>
          j % 2 === 1 ? <strong key={j} className="font-semibold">{part}</strong> : <span key={j}>{part}</span>
        );

        if (line.startsWith('• ') || line.startsWith('- ')) {
          return (
            <div key={i} className="flex gap-1.5 leading-relaxed">
              <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-current opacity-50 mt-[7px]" />
              <span>{parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : <span key={j}>{part.replace(/^[•\-]\s/, '')}</span>)}</span>
            </div>
          );
        }
        if (line === '') return <div key={i} className="h-1" />;
        return <div key={i} className="leading-relaxed">{rendered}</div>;
      })}
    </div>
  );
}

// ─── Quick suggestion chips ────────────────────────────────────────────────
const SUGGESTIONS = [
  'My attendance today',
  'My tasks',
  'Leave balance',
  'My KPI',
  'Team attendance',
  'Pending approvals',
];

// ─── Main Chatbot component ───────────────────────────────────────────────────
export default function Chatbot() {
  const { isOpen, messages, isTyping, unreadCount, open, close, toggle, addMessage, setTyping, clearMessages } = useChatbotStore();
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasGreeted = useRef(false);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Send greeting on first open
  useEffect(() => {
    if (isOpen && !hasGreeted.current && messages.length === 0) {
      hasGreeted.current = true;
      sendToBot('hello');
    }
  }, [isOpen]);

  const sendToBot = useCallback(async (text: string) => {
    if (sending) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    // Add user message (if not an internal greeting call)
    if (trimmed !== 'hello') {
      addMessage({
        id: uid(),
        role: 'user',
        text: trimmed,
        timestamp: new Date(),
      });
    }

    setSending(true);
    setTyping(true);

    // Simulate slight delay for realism
    await new Promise((r) => setTimeout(r, 600));

    try {
      const res = await chatbotApi.sendMessage(trimmed);
      const { reply, intent } = res.data.data!;
      addMessage({
        id: uid(),
        role: 'bot',
        text: reply,
        timestamp: new Date(),
        intent,
      });
    } catch {
      addMessage({
        id: uid(),
        role: 'bot',
        text: "Sorry, I couldn't connect right now. Please try again in a moment.",
        timestamp: new Date(),
      });
    } finally {
      setTyping(false);
      setSending(false);
    }
  }, [sending, addMessage, setTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const msg = input;
    setInput('');
    sendToBot(msg);
  };

  const handleSuggestion = (text: string) => {
    sendToBot(text);
  };

  const formatTime = (d: Date) =>
    new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      {/* ── Floating button ─────────────────────────────────────────────── */}
      <button
        onClick={toggle}
        aria-label="Open assistant"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 chatbot-fab overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
      >
        {isOpen ? (
          <ChevronDownIcon className="h-6 w-6 text-white" />
        ) : (
          <img src="/logo-icon.svg" alt="Assistant" className="w-9 h-9 object-contain" />
        )}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* ── Chat window ─────────────────────────────────────────────────── */}
      <div
        className={`fixed bottom-24 right-6 z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 origin-bottom-right ${
          isOpen
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-90 pointer-events-none'
        }`}
        style={{ width: '380px', height: '580px' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
              <Logo variant="icon" size="sm" className="w-6 h-6" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">WorkMonitor Assistant</p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <p className="text-white/70 text-xs">Online · Ask me anything</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { clearMessages(); hasGreeted.current = false; setTimeout(() => sendToBot('hello'), 100); }}
              title="Clear chat"
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
            <button
              onClick={close}
              title="Close"
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-800 px-4 py-3 space-y-3 transition-colors">
          {messages.length === 0 && !isTyping && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <Logo variant="icon" size="lg" className="w-14 h-14" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Hi, {user?.first_name}! 👋</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Ask me about your attendance, tasks, leave balance, and more.</p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'bot' && (
                <div className="w-7 h-7 rounded-full bg-white dark:bg-gray-700 border border-indigo-100 dark:border-indigo-700 flex items-center justify-center flex-shrink-0 mt-auto overflow-hidden shadow-sm">
                  <Logo variant="icon" size="sm" className="w-5 h-5" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-br-sm'
                    : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-600 rounded-bl-sm'
                }`}
              >
                <RenderText text={msg.text} />
                <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-white/50 text-right' : 'text-gray-400 dark:text-gray-500'}`}>
                  {formatTime(msg.timestamp)}
                </p>
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 mt-auto text-xs font-bold">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-2 justify-start">
              <div className="w-7 h-7 rounded-full bg-white dark:bg-gray-700 border border-indigo-100 dark:border-indigo-700 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
                <Logo variant="icon" size="sm" className="w-5 h-5" />
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1 items-center h-4">
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion chips — show only when few messages */}
        {messages.length <= 2 && !isTyping && (
          <div className="flex gap-2 px-4 py-2 overflow-x-auto flex-shrink-0 bg-gray-50 border-t border-gray-100 scrollbar-hide">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleSuggestion(s)}
                disabled={sending}
                className="flex-shrink-0 px-3 py-1.5 rounded-full bg-white border border-indigo-200 text-indigo-600 text-xs font-medium hover:bg-indigo-50 hover:border-indigo-400 transition-colors whitespace-nowrap disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input area */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 px-3 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 transition-colors"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something..."
            disabled={sending}
            maxLength={200}
            className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full px-4 py-2 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-600 focus:bg-white dark:focus:bg-gray-600 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-110 active:scale-95 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
          >
            <PaperAirplaneIcon className="h-4 w-4 text-white" />
          </button>
        </form>
      </div>
    </>
  );
}
