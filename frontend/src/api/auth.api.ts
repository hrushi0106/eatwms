import api from './axios';
import { ApiResponse, AuthUser, AuthTokens } from '../types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
}

export const authApi = {
  login: (payload: LoginPayload) =>
    api.post<ApiResponse<LoginResponse>>('/auth/login', payload),

  logout: () =>
    api.post<ApiResponse>('/auth/logout'),

  me: () =>
    api.get<ApiResponse<{ user: AuthUser }>>('/auth/me'),

  refresh: (refresh_token: string) =>
    api.post<ApiResponse<{ access_token: string }>>('/auth/refresh', { refresh_token }),

  forgotPassword: (email: string) =>
    api.post<ApiResponse>('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    api.post<ApiResponse>('/auth/reset-password', { token, password }),
};
