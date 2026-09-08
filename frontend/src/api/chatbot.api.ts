import api from './axios';
import { ApiResponse } from '../types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
  intent?: string;
}

export interface ChatbotResponse {
  reply: string;
  intent: string;
}

export const chatbotApi = {
  sendMessage: (message: string) =>
    api.post<ApiResponse<ChatbotResponse>>('/chatbot/message', { message }),
};
