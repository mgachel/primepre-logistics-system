// src/pages/auth/SignupStep2.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Package, ArrowRight, ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import { useAuthStore } from '@/stores/authStore';
import { signupStep2Schema, type SignupStep2Data } from '@/lib/validations/auth';

export default function SignupStep2() {
  const navigate = useNavigate();
  const { signupData, updateSignupData, error, clearError } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<SignupStep2Data>({
    resolver: zodResolver(signupStep2Schema),
    defaultValues: {
      shipping_mark: signupData.shipping_mark || '',
    },
  });

  // Mock shipping mark suggestions
  const suggestions = ['PM001', 'PM002', 'PM003', 'MICHAEL-001', 'MIKE-CARGO'];
  const selectedMark = watch('shipping_mark');

  const onSubmit = (data: SignupStep2Data) => {
    clearError();
    updateSignupData(data);
    navigate('/signup/contact');
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
          <h2 className="text-4xl font-bold mb-4">Choose your shipping mark</h2>
          <p className="text-xl text-white/90 mb-8">Your shipping mark helps us identify your cargo quickly and efficiently.</p>
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
            <h2 className="text-3xl font-bold tracking-tight">Choose Shipping Mark</h2>
            <p className="text-muted-foreground mt-2">Step 2 of 4: Shipping Mark Selection</p>
            
            {/* Progress indicator */}
            <div className="flex justify-center mt-4">
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
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

                <div className="space-y-4">
                  <Label className="text-base font-medium">Select a shipping mark:</Label>
                  <RadioGroup
                    value={selectedMark}
                    onValueChange={(value) => setValue('shipping_mark', value)}
                    className="space-y-3"
                  >
                    {suggestions.map((mark) => (
                      <div key={mark} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                        <RadioGroupItem value={mark} id={mark} />
                        <Label htmlFor={mark} className="flex-1 cursor-pointer">
                          <div className="flex items-center">
                            <Package className="h-4 w-4 mr-2 text-gray-400" />
                            <span className="font-mono">{mark}</span>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  
                  {errors.shipping_mark && (
                    <p className="text-sm text-red-600">{errors.shipping_mark.message}</p>
                  )}
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11"
                    onClick={() => navigate('/signup')}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  
                  <Button type="submit" className="w-full h-11">
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