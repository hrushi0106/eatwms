import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../types';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  roles?: Role[];
  children?: React.ReactNode;
}

export default function ProtectedRoute({ roles, children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingSpinner fullPage />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && user && !roles.includes(user.role as Role)) {
    // Redirect to appropriate dashboard
    const role = user.role;
    if (role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
    if (role === 'MANAGER') return <Navigate to="/manager/dashboard" replace />;
    if (role === 'TEAM_LEAD') return <Navigate to="/teamlead/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
