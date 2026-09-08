import api from './axios';
import { ApiResponse, Attendance, AttendanceVerification, PaginationMeta } from '../types';

export const attendanceApi = {
  checkIn: (formData: FormData) =>
    api.post<ApiResponse<{ attendance: Attendance }>>('/attendance/check-in', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  checkOut: (formData: FormData) =>
    api.post<ApiResponse<{ attendance: Attendance }>>('/attendance/check-out', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getToday: () =>
    api.get<ApiResponse<{ attendance: Attendance | null }>>('/attendance/today'),

  getHistory: (params?: Record<string, string | number>) =>
    api.get<ApiResponse<Attendance[]> & { meta: PaginationMeta }>('/attendance/history', { params }),

  getById: (id: number) =>
    api.get<ApiResponse<{ attendance: Attendance }>>(`/attendance/${id}`),

  getTeam: (params?: Record<string, string | number>) =>
    api.get<ApiResponse<Attendance[]>>('/attendance/team', { params }),

  getVerifications: (attendanceId: number) =>
    api.get<ApiResponse<AttendanceVerification[]>>(`/attendance/${attendanceId}/verifications`),

  getVerificationImageUrl: (verificationId: number) =>
    `/api/verifications/${verificationId}/image`,
};
