import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Building, ArrowRight, ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { useAuthStore } from '@/stores/authStore';
import { signupStep1Schema, type SignupStep1Data } from '@/lib/validations/auth';

export default function Signup() {
  const navigate = useNavigate();
  const { signupData, updateSignupData, error, clearError } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupStep1Data>({
    resolver: zodResolver(signupStep1Schema),
    defaultValues: {
      name: signupData.name || '',
      company_name: signupData.company_name || '',
    },
  });

  const onSubmit = (data: SignupStep1Data) => {
    clearError();
    updateSignupData(data);
    navigate('/signup/shipping-mark');
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
          <h2 className="text-4xl font-bold mb-4">Create your account</h2>
          <p className="text-xl text-white/90 mb-8">Join Prime Pre Logistics to manage your shipments and inventory.</p>
        </div>
        <div className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full"></div>
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-white/10 rounded-full"></div>
        <div className="absolute top-1/2 right-20 w-16 h-16 bg-white/10 rounded-full"></div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden text-center mb-6">
            <img src="/primepre-logo-1.png" alt="Prime Pre Logo" className="w-40 h-auto mx-auto mb-4" />
          </div>
          
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">Create Account</h2>
            <p className="text-muted-foreground mt-2">Step 1 of 4: Basic Information</p>
            
            {/* Progress indicator */}
            <div className="flex justify-center mt-4">
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
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
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      className="pl-10 h-11"
                      {...register('name')}
                      aria-invalid={errors.name ? 'true' : 'false'}
                    />
                  </div>
                  {errors.name && (
                    <p className="text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="company_name"
                      type="text"
                      placeholder="Enter your company name"
                      className="pl-10 h-11"
                      {...register('company_name')}
                      aria-invalid={errors.company_name ? 'true' : 'false'}
                    />
                  </div>
                  {errors.company_name && (
                    <p className="text-sm text-red-600">{errors.company_name.message}</p>
                  )}
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11"
                    onClick={() => navigate('/login')}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Login
                  </Button>
                  
                  <Button type="submit" className="w-full h-11" forceBlue>
                    Next
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
