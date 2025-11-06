import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useLocation, Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (isAuthenticated) return <>{children}</>;

  // For all unauthenticated users, redirect to the standard login page
  return <Navigate to="/login" state={{ from: location }} replace />;
}