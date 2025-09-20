import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import Login from '@/pages/Login';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Login />;
  }

  return <>{children}</>;
}