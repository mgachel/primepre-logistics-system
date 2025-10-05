import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Building, Phone, Mail, MapPin, Eye, EyeOff, ArrowRight } from 'lucide-react';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';

// Region choices (matching backend)
const REGION_CHOICES = [
  { value: 'GREATER_ACCRA', label: 'Greater Accra' },
  { value: 'ASHANTI', label: 'Ashanti' },
  { value: 'WESTERN', label: 'Western' },
  { value: 'CENTRAL', label: 'Central' },
  { value: 'VOLTA', label: 'Volta' },
  { value: 'EASTERN', label: 'Eastern' },
  { value: 'NORTHERN', label: 'Northern' },
  { value: 'UPPER_EAST', label: 'Upper East' },
  { value: 'UPPER_WEST', label: 'Upper West' },
  { value: 'BRONG_AHAFO', label: 'Brong Ahafo' },
  { value: 'WESTERN_NORTH', label: 'Western North' },
  { value: 'AHAFO', label: 'Ahafo' },
  { value: 'BONO', label: 'Bono' },
  { value: 'BONO_EAST', label: 'Bono East' },
  { value: 'OTI', label: 'Oti' },
  { value: 'NORTH_EAST', label: 'North East' },
  { value: 'SAVANNAH', label: 'Savannah' },
];

// Validation schema
const simplifiedSignupSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  nickname: z.string().optional(),
  company_name: z.string().optional(),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  region: z.string().min(1, 'Please select your region'),
  user_type: z.enum(['INDIVIDUAL', 'BUSINESS']),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/\d/, 'Password must contain at least one number'),
  confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

type SimplifiedSignupData = z.infer<typeof simplifiedSignupSchema>;

export default function SimplifiedSignup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { error, clearError } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SimplifiedSignupData>({
    resolver: zodResolver(simplifiedSignupSchema),
    defaultValues: {
      user_type: 'INDIVIDUAL',
    },
  });

  const userType = watch('user_type');

  const onSubmit = async (data: SimplifiedSignupData) => {
    try {
      setIsLoading(true);
      clearError();
      
      // Instead of creating account, navigate to shipping mark selection
      // Pass the signup data to the next page
      navigate('/signup/select-shipping-mark', {
        state: {
          signupData: data
        }
      });
    } catch (error) {
      console.error('Signup error:', error);
      toast({
        title: "Error",
        description: 'An unexpected error occurred. Please try again.',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
          <h2 className="text-4xl font-bold mb-4">Create your account</h2>
          <p className="text-xl text-white/90 mb-8">
            Join Prime Pre Logistics to manage your shipments and inventory. 
            Your shipping mark will be automatically generated for you.
          </p>
          
          <div className="bg-white/10 p-6 rounded-lg backdrop-blur-sm">
            <h3 className="text-lg font-semibold mb-2">✨ New Simplified Process</h3>
            <ul className="space-y-2 text-white/80">
              <li>• One simple form - no multiple steps</li>
              <li>• Auto-generated shipping marks</li>
              <li>• Instant account activation</li>
              <li>• No SMS verification required</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Create Account</CardTitle>
              <CardDescription>
                Fill in your details to get started. Your shipping mark will be automatically generated.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Error Alert */}
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* User Type Selection */}
                <div className="space-y-3">
                  <Label>Account Type</Label>
                  <RadioGroup
                    value={userType}
                    onValueChange={(value) => setValue('user_type', value as 'INDIVIDUAL' | 'BUSINESS')}
                    className="flex flex-row space-x-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="INDIVIDUAL" id="individual" />
                      <Label htmlFor="individual" className="flex items-center space-x-2 cursor-pointer">
                        <User className="h-4 w-4" />
                        <span>Individual</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="BUSINESS" id="business" />
                      <Label htmlFor="business" className="flex items-center space-x-2 cursor-pointer">
                        <Building className="h-4 w-4" />
                        <span>Business</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      {...register('first_name')}
                      placeholder="John"
                    />
                    {errors.first_name && (
                      <p className="text-sm text-red-500">{errors.first_name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      {...register('last_name')}
                      placeholder="Doe"
                    />
                    {errors.last_name && (
                      <p className="text-sm text-red-500">{errors.last_name.message}</p>
                    )}
                  </div>
                </div>

                {/* Conditional Fields */}
                {userType === 'INDIVIDUAL' ? (
                  <div className="space-y-2">
                    <Label htmlFor="nickname">Nickname (Optional)</Label>
                    <Input
                      id="nickname"
                      {...register('nickname')}
                      placeholder="Johnny"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Company Name (Optional)</Label>
                    <Input
                      id="company_name"
                      {...register('company_name')}
                      placeholder="Acme Corp"
                    />
                  </div>
                )}

                {/* Contact Information */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="email"
                      type="email"
                      {...register('email')}
                      className="pl-10"
                      placeholder="john@example.com"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="phone"
                      {...register('phone')}
                      className="pl-10"
                      placeholder="+233 123 456 789"
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-sm text-red-500">{errors.phone.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="region">Region</Label>
                  <Select onValueChange={(value) => setValue('region', value)}>
                    <SelectTrigger>
                      <div className="flex items-center">
                        <MapPin className="mr-2 h-4 w-4 text-gray-400" />
                        <SelectValue placeholder="Select your region" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {REGION_CHOICES.map((region) => (
                        <SelectItem key={region.value} value={region.value}>
                          {region.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.region && (
                    <p className="text-sm text-red-500">{errors.region.message}</p>
                  )}
                </div>

                {/* Password Fields */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      {...register('password')}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-500">{errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm_password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      {...register('confirm_password')}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirm_password && (
                    <p className="text-sm text-red-500">{errors.confirm_password.message}</p>
                  )}
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    "Creating Account..."
                  ) : (
                    <div className="flex items-center justify-center">
                      <span>Create Account</span>
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </div>
                  )}
                </Button>

                {/* Login Link */}
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary hover:underline">
                      Sign in
                    </Link>
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}