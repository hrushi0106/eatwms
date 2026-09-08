import { create } from 'zustand';
import { ChatMessage } from '../api/chatbot.api';

interface ChatbotState {
  isOpen: boolean;
  messages: ChatMessage[];
  isTyping: boolean;
  unreadCount: number;
  open: () => void;
  close: () => void;
  toggle: () => void;
  addMessage: (msg: ChatMessage) => void;
  setTyping: (val: boolean) => void;
  clearUnread: () => void;
  clearMessages: () => void;
}

export const useChatbotStore = create<ChatbotState>((set) => ({
  isOpen: false,
  messages: [],
  isTyping: false,
  unreadCount: 0,

  open: () => set({ isOpen: true, unreadCount: 0 }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen, unreadCount: s.isOpen ? s.unreadCount : 0 })),

  addMessage: (msg) =>
    set((s) => ({
      messages: [...s.messages, msg],
      unreadCount: !s.isOpen && msg.role === 'bot' ? s.unreadCount + 1 : s.unreadCount,
    })),

  setTyping: (val) => set({ isTyping: val }),
  clearUnread: () => set({ unreadCount: 0 }),
  clearMessages: () => set({ messages: [] }),
}));
