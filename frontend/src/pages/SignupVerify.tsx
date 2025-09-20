// src/pages/auth/SignupVerify.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Phone, ArrowRight, ArrowLeft, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/api';
import { verifyPhoneSchema, type VerifyPhoneData } from '@/lib/validations/auth';

export default function SignupVerify() {
  const navigate = useNavigate();
  const { signupData, completeSignup, error, clearError, setError, isLoading } = useAuthStore();
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyPhoneData>({
    resolver: zodResolver(verifyPhoneSchema),
    defaultValues: {
      pin: '',
    },
  });

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  // Create account on component mount
  useEffect(() => {
    const createAccount = async () => {
      try {
        if (!signupData.name || !signupData.phone || !signupData.password) {
          navigate('/signup');
          return;
        }

        clearError();
        await authService.signup({
          name: signupData.name,
          company_name: signupData.companyName || '',
          shipping_mark: signupData.shippingMark || 'PP',
          phone: signupData.phone,
          region: signupData.region || 'Accra',
          password: signupData.password,
        });
      } catch (error) {
        // Handle signup error silently for security
        setError("Signup failed. Please try again or contact support.");
      }
    };

    createAccount();
  }, [signupData, navigate, clearError]);

  const onSubmit = async (data: VerifyPhoneData) => {
    try {
      clearError();
      
      if (!signupData.phone) {
        navigate('/signup');
        return;
      }

      await authService.verifyPhone({
        phone: signupData.phone,
        pin: data.pin,
      });

      // Complete signup process
      await completeSignup();
      navigate('/');
    } catch (error) {
      setError("Verification failed. Please check your PIN and try again.");
    }
  };

  const handleResendCode = async () => {
    try {
      clearError();
      
      if (!signupData.phone) {
        navigate('/signup');
        return;
      }

      await authService.resendVerificationCode(signupData.phone);
      setCountdown(60);
      setCanResend(false);
    } catch (error) {
      setError("Failed to resend verification code. Please try again.");
    }
  };

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
          <h2 className="text-4xl font-bold mb-4">Verify your phone</h2>
          <p className="text-xl text-white/90 mb-8">We've sent a verification code to your phone number. Enter it below to complete your account setup.</p>
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
            <h2 className="text-3xl font-bold tracking-tight">Verify Phone Number</h2>
            <p className="text-muted-foreground mt-2">Enter the verification code sent to your phone</p>
            
            {signupData.phone && (
              <div className="flex items-center justify-center mt-4 p-3 bg-blue-50 rounded-lg">
                <Phone className="h-4 w-4 text-blue-600 mr-2" />
                <span className="text-sm text-blue-600">{signupData.phone}</span>
              </div>
            )}
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
                  <Label htmlFor="pin">Verification Code</Label>
                  <Input
                    id="pin"
                    type="text"
                    placeholder="Enter 6-digit code"
                    className="text-center text-lg font-mono tracking-wider h-12"
                    maxLength={6}
                    {...register('pin')}
                    aria-invalid={errors.pin ? 'true' : 'false'}
                  />
                  {errors.pin && (
                    <p className="text-sm text-red-600">{errors.pin.message}</p>
                  )}
                </div>

                <div className="text-center">
                  {canResend ? (
                    <Button
                      type="button"
                      variant="link"
                      className="text-primary p-0 h-auto"
                      onClick={handleResendCode}
                      disabled={isLoading}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Resend verification code
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Resend code in {countdown}s
                    </p>
                  )}
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11"
                    onClick={() => navigate('/signup/password')}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-11"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Verifying...' : 'Verify & Complete'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="text-center text-sm text-muted-foreground">
            <p>Didn't receive the code? Check your phone and try again.</p>
            <p className="mt-2">
              Already have an account?{' '}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => navigate('/login')}
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}