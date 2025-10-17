import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useLocation, Navigate } from 'react-router-dom';
import Login from '@/pages/Login';
import AdminLogin from '@/pages/AdminLogin';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (isAuthenticated) return <>{children}</>;

  // If requesting admin pages, redirect to admin login route
  if (location.pathname.startsWith('/admin')) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // For regular pages, navigate to standard login
  return <Navigate to="/login" state={{ from: location }} replace />;
}