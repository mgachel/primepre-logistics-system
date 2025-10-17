import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Phone, Lock, ArrowRight, Shield } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { useAuthStore } from '@/stores/authStore';
import { loginSchema, type LoginFormData } from '@/lib/validations/auth';
import { clearAllAuthCache } from '@/lib/auth-utils';

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError } = useAuthStore();
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
    clearAllAuthCache();

    // Force admin-login endpoint use by ensuring hostname check in authService will pick admin
    // In practice this will be served from admin.primemade.org so authService already picks admin-login

    const success = await login(data);
    if (success) {
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex">
  <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#00703D,#00703DCC)' }}>
        <div className="absolute inset-0 bg-black/20"></div>
  <div className="relative z-10 flex flex-col justify-center px-12" style={{ color: '#FFC300' }}>
          <div className="flex items-center mb-8">
            <div>
              <img src="/wavemova_0.png" alt="Prime Pre Logistics Platform" className="mb-8 w-64 h-auto" />
            </div>
          </div>
          <h2 className="text-4xl font-bold mb-4">Admin Portal</h2>
          <p className="text-xl text-white/90 mb-8">Admin access for managing shipments, users and settings.</p>
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-4">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Secure Admin Access</h3>
                <p className="text-white/80">Only users with admin role can sign in here.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center mb-6">
            <img src="/wavemova_copy.png" alt="Prime Pre Logo" className="w-40 h-auto mx-auto mb-4" /> 
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
                    <Input id="phone" type="tel" placeholder="Admin phone number" className="pl-10 h-11" {...register('phone')} aria-invalid={errors.phone ? 'true' : 'false'} />
                  </div>
                  {errors.phone && (<p className="text-sm text-red-600">{errors.phone.message}</p>)}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" className="pl-10 pr-10 h-11" {...register('password')} aria-invalid={errors.password ? 'true' : 'false'} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (<p className="text-sm text-red-600">{errors.password.message}</p>)}
                </div>

                <Button type="submit" className="w-full h-11 bg-[#00703D] hover:opacity-90 text-white" disabled={isLoading}>
                  {isLoading ? (
                    <div className="flex items-center"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Signing In...</div>
                  ) : (
                    <div className="flex items-center">Sign In<ArrowRight className="ml-2 h-4 w-4" /></div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="text-center text-xs text-muted-foreground">
            <p>Admin portal — restricted access</p>
            <p className="mt-1">© 2024 Prime Pre Logistics. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
