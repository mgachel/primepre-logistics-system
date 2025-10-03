import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Eye, 
  EyeOff, 
  Phone, 
  Lock, 
  ArrowRight, 
  Shield, 
  Users, 
  Package 
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { useAuthStore } from '@/stores/authStore';
import { useAuth } from '@/contexts/AuthContext';
import { loginSchema, type LoginFormData } from '@/lib/validations/auth';
import { clearAllAuthCache } from '@/lib/auth-utils';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError } = useAuthStore();
  const { _getDashboardUrl, _getWelcomeMessage } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const from = location.state?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    clearError();
    
    // Clear any cached authentication data before login attempt
    console.log('🧹 Clearing authentication cache before login...');
    clearAllAuthCache();
    
    console.log('🔐 Attempting login...');
    const success = await login(data);
    
    if (success) {
      console.log('✅ Login successful, determining redirect...');
      
      // Get user data from localStorage to determine redirect
      const userData = localStorage.getItem('user');
      let redirectUrl = '/';
      
      if (userData) {
        try {
          const user = JSON.parse(userData);
          const userRole = user.user_role;
          
          // Determine redirect based on user role
          if (['ADMIN', 'MANAGER', 'STAFF', 'SUPER_ADMIN'].includes(userRole)) {
            redirectUrl = '/'; // Admin dashboard (handled by RoleBasedRoute)
            console.log(`👑 Admin user detected (${userRole}), redirecting to admin dashboard`);
          } else {
            redirectUrl = '/'; // Customer dashboard (handled by RoleBasedRoute)
            console.log(`👤 Customer user detected (${userRole}), redirecting to customer dashboard`);
          }
        } catch (error) {
          console.warn('Failed to parse user data, using default redirect');
          redirectUrl = '/';
        }
      }
      
      // Use the from parameter if it's not the root path
      if (from !== '/' && from !== '/login') {
        redirectUrl = from;
        console.log(`📍 Using original destination: ${redirectUrl}`);
      }
      
      console.log(`🚀 Redirecting to: ${redirectUrl}`);
      navigate(redirectUrl, { replace: true });
    } else {
      console.log('❌ Login failed');
    }
  };

  // Remove demo credentials since we're using real backend authentication

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-primary/80 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="flex items-center mb-8">
            <div>
              <img
                src="/primepre-logo.png"
                alt="Prime Pre Logistics Platform"
                className="mb-8 w-64 h-auto"
              />
            </div>
          </div>
          
          <h2 className="text-4xl font-bold mb-4">Manage your logistics operations</h2>
          <p className="text-xl text-white/90 mb-8">
            Track shipments, manage cargo, handle claims, and oversee warehouse operations all in one platform.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-4">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Track Sea & Air Cargo</h3>
                <p className="text-white/80">Monitor shipments from China to Ghana in real-time</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-4">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Manage Warehouse Inventory</h3>
                <p className="text-white/80">Track goods in China and Ghana warehouses</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-4">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Handle Claims & Issues</h3>
                <p className="text-white/80">Process customer claims and resolve shipping problems</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full"></div>
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-white/10 rounded-full"></div>
        <div className="absolute top-1/2 right-20 w-16 h-16 bg-white/10 rounded-full"></div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-6">
            <img
              src="/primepre-logo-1.png"
              alt="Prime Pre Logo"
              className="w-40 h-auto mx-auto mb-4"
            />
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-muted-foreground mt-2">Sign in to your account</p>
          </div>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter your phone number"
                      className="pl-10 h-11"
                      {...register('phone')}
                      aria-invalid={errors.phone ? 'true' : 'false'}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-sm text-red-600">{errors.phone.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="pl-10 pr-10 h-11"
                      {...register('password')}
                      aria-invalid={errors.password ? 'true' : 'false'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full h-11" disabled={isLoading}>
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Signing In...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      Sign In
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <Link to="/forgot-password" className="text-primary hover:underline">Forgot password?</Link>
              <div>
                Don't have an account?{' '}
                <Link to="/signup" className="text-primary hover:underline">Sign up</Link>
              </div>
            </div>
            <div className="text-center">
              <Link to="/verify-account" className="text-primary hover:underline">
                Need to verify your account?
              </Link>
            </div>
          </div>

          {/* Demo Credentials
          <Card className="border-dashed">
            < className="pb-3">
              < className="text-sm">Demo Credentials</>
              < className="text-xs">
                Use these credentials to test different user roles
              </>
            </>
            <CardContent className="space-y-3">
              {demoCredentials.map((cred, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${cred.color}`}></div>
                    <div>
                      <div className="text-sm font-medium">{cred.role}</div>
                      <div className="text-xs text-muted-foreground">
                        {cred.username} / {cred.password}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setUsername(cred.username);
                      setPassword(cred.password);
                    }}
                    className="h-8 px-3"
                  >
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card> */}

          <div className="text-center text-xs text-muted-foreground">
            <p>Protected by enterprise-grade security</p>
            <p className="mt-1">© 2024 Prime Pre Logistics. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}