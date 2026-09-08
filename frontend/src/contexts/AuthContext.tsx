import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { authApi, LoginPayload } from '../api/auth.api';
import { AuthUser, Role } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
  isAdmin: () => boolean;
  isManager: () => boolean;
  isTeamLead: () => boolean;
  isEmployee: () => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { user, isAuthenticated, setAuth, clearAuth, setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('access_token');
      if (!token || !isAuthenticated) {
        setIsLoading(false);
        return;
      }

      try {
        const resp = await authApi.me();
        if (resp.data.data?.user) {
          setUser(resp.data.data.user);
        }
      } catch {
        clearAuth();
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (payload: LoginPayload) => {
    const resp = await authApi.login(payload);
    const { user, access_token, refresh_token } = resp.data.data!;
    setAuth(user, access_token, refresh_token);

    // Redirect by role
    const role = user.role;
    if (role === 'ADMIN') navigate('/admin/dashboard');
    else if (role === 'MANAGER') navigate('/manager/dashboard');
    else if (role === 'TEAM_LEAD') navigate('/teamlead/dashboard');
    else navigate('/dashboard');
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors
    } finally {
      clearAuth();
      navigate('/login');
      toast.success('Logged out successfully');
    }
  };

  const hasRole = (...roles: Role[]) => {
    if (!user) return false;
    return roles.includes(user.role as Role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
        hasRole,
        isAdmin: () => hasRole('ADMIN'),
        isManager: () => hasRole('MANAGER', 'ADMIN'),
        isTeamLead: () => hasRole('TEAM_LEAD', 'MANAGER', 'ADMIN'),
        isEmployee: () => hasRole('EMPLOYEE', 'TEAM_LEAD', 'MANAGER', 'ADMIN'),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
