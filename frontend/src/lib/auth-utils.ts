import type { User } from '@/services/authService';

/**
 * Determines the appropriate dashboard URL based on user role
 */
export function getDashboardUrl(user: User | null): string {
  if (!user) {
    return '/login';
  }

  // All users go to the root path, which is handled by RoleBasedRoute
  // The RoleBasedRoute component will render the appropriate dashboard
  return '/';
}

/**
 * Determines if a user has admin-level access
 */
export function isAdminUser(user: User | null): boolean {
  if (!user) {
    return false;
  }

  return ['ADMIN', 'MANAGER', 'STAFF', 'SUPER_ADMIN'].includes(user.user_role);
}

/**
 * Determines if a user is a customer
 */
export function isCustomerUser(user: User | null): boolean {
  if (!user) {
    return false;
  }

  return user.user_role === 'CUSTOMER';
}

/**
 * Gets the appropriate welcome message based on user role
 */
export function getWelcomeMessage(user: User | null): string {
  if (!user) {
    return 'Welcome!';
  }

  const firstName = user.first_name || 'User';
  
  if (isAdminUser(user)) {
    return `Welcome to your admin dashboard, ${firstName}!`;
  } else {
    return `Welcome to your customer dashboard, ${firstName}!`;
  }
}

/**
 * Gets quick access links based on user role
 */
export function getQuickAccessLinks(user: User | null): Record<string, string> {
  if (!user) {
    return {
      shipments: '/login',
      claims: '/login',
      profile: '/login'
    };
  }

  if (isAdminUser(user)) {
    return {
      shipments: '/cargos/sea',
      claims: '/cargos/claims',
      profile: '/profile',
      user_management: '/clients',
      settings: '/settings',
      analytics: '/',
      warehouse: '/goods/china'
    };
  } else {
    return {
      shipments: '/my-shipments',
      claims: '/my-claims',
      profile: '/my-profile',
      user_management: '/my-profile',
      settings: '/settings',
      analytics: '/',
      warehouse: '/my-shipments'
    };
  }
}

/**
 * Determines if a user can access a specific route
 */
export function canAccessRoute(user: User | null, route: string): boolean {
  if (!user) {
    return false;
  }

  // Admin-only routes
  const adminRoutes = [
    '/clients',
    '/cargos',
    '/goods',
    '/rates',
    '/my-admins',
    '/notes',
    '/admin'
  ];

  // Customer-only routes
  const customerRoutes = [
    '/my-shipments',
    '/my-claims',
    '/my-notes',
    '/my-profile',
    '/my-addresses'
  ];

  // Check if route is admin-only
  if (adminRoutes.some(adminRoute => route.startsWith(adminRoute))) {
    return isAdminUser(user);
  }

  // Check if route is customer-only
  if (customerRoutes.some(customerRoute => route.startsWith(customerRoute))) {
    return isCustomerUser(user);
  }

  // Shared routes (accessible by all authenticated users)
  const sharedRoutes = [
    '/',
    '/dashboard',
    '/settings',
    '/profile',
    '/notifications',
    '/support'
  ];

  return sharedRoutes.some(sharedRoute => route.startsWith(sharedRoute));
}

/**
 * Gets the appropriate redirect URL for unauthorized access
 */
export function getUnauthorizedRedirectUrl(user: User | null): string {
  if (!user) {
    return '/login';
  }

  return getDashboardUrl(user);
}

/**
 * Clears all authentication-related cache and storage
 */
export function clearAllAuthCache(): void {
  // Clear localStorage auth data
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  localStorage.removeItem('admin_info');
  
  // Clear session storage
  if (typeof window !== 'undefined' && window.sessionStorage) {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('admin_info');
  }
  
  // Clear any cached API responses for auth endpoints
  if (typeof window !== 'undefined' && window.localStorage) {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes('api_cache') && key.includes('auth')) {
        localStorage.removeItem(key);
      }
    });
  }
}
