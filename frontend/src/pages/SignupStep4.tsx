// src/pages/auth/SignupStep4.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { useAuthStore } from '@/stores/authStore';
import { signupStep4Schema, type SignupStep4Data } from '@/lib/validations/auth';

export default function SignupStep4() {
  const navigate = useNavigate();
  const { signupData, updateSignupData, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<SignupStep4Data>({
    resolver: zodResolver(signupStep4Schema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  const onSubmit = (data: SignupStep4Data) => {
    clearError();
    updateSignupData(data);
    navigate('/signup/verify');
  };

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, label: '', color: '' };
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;

    if (strength <= 2) return { strength, label: 'Weak', color: 'bg-red-500' };
    if (strength === 3) return { strength, label: 'Fair', color: 'bg-yellow-500' };
    if (strength === 4) return { strength, label: 'Good', color: 'bg-blue-500' };
    return { strength, label: 'Strong', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(password);

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-primary/80 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="flex items-center mb-8">
            <div>
              <img src="/primepre-logo.png" alt="Prime Pre Logistics Platform" className="mb-8 w-64 h-auto" />
            </div>
          </div>
          <h2 className="text-4xl font-bold mb-4">Secure your account</h2>
          <p className="text-xl text-white/90 mb-8">Create a strong password to protect your logistics data and shipment information.</p>
        </div>
        <div className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full"></div>
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-white/10 rounded-full"></div>
        <div className="absolute top-1/2 right-20 w-16 h-16 bg-white/10 rounded-full"></div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden text-center mb-6">
            <img src="/primepre-logo-1.png" alt="Prime Pre Logo" className="w-40 h-auto mx-auto mb-4" />
          </div>
          
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">Create Password</h2>
            <p className="text-muted-foreground mt-2">Step 4 of 4: Set your account password</p>
            
            {/* Progress indicator */}
            <div className="flex justify-center mt-4">
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
              </div>
            </div>
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
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a strong password"
                      className="pl-10 pr-10 h-11"
                      {...register('password')}
                      aria-invalid={errors.password ? 'true' : 'false'}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {password && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                            style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-600">{passwordStrength.label}</span>
                      </div>
                    </div>
                  )}
                  {errors.password && (
                    <p className="text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm your password"
                      className="pl-10 pr-10 h-11"
                      {...register('confirmPassword')}
                      aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded">
                  <p className="mb-1">Password requirements:</p>
                  <ul className="space-y-1">
                    <li className={password?.length >= 8 ? 'text-green-600' : ''}>
                      • At least 8 characters
                    </li>
                    <li className={/[a-z]/.test(password) ? 'text-green-600' : ''}>
                      • One lowercase letter
                    </li>
                    <li className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>
                      • One uppercase letter
                    </li>
                    <li className={/\d/.test(password) ? 'text-green-600' : ''}>
                      • One number
                    </li>
                  </ul>
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11"
                    onClick={() => navigate('/signup/contact')}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  
                  <Button type="submit" className="w-full h-11" forceBlue>
                    Create Account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => navigate('/login')}
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}