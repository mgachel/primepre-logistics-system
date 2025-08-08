import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface RoleBasedRouteProps {
  adminComponent: React.ReactNode;
  customerComponent: React.ReactNode;
}

export function RoleBasedRoute({ adminComponent, customerComponent }: RoleBasedRouteProps) {
  const { isAdmin, isCustomer } = useAuth();

  if (isAdmin()) {
    return <>{adminComponent}</>;
  } else if (isCustomer()) {
    return <>{customerComponent}</>;
  }

  // Default fallback - show admin component
  return <>{adminComponent}</>;
} 