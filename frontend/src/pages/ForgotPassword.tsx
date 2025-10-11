import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Phone, KeyRound } from 'lucide-react';
import { authService } from '@/services/authService';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCheckPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Check if phone exists in the system
      const res = await authService.phoneForgotPassword(phone);
      
      if (res.success) {
        // Phone found - redirect to contact admin page with phone number
        navigate('/contact-admin-for-reset', { state: { phone } });
      } else {
        // Phone not found
        setError(res.message || 'Phone number not found in our system. Please sign up for a new account.');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
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
          <h2 className="text-4xl font-bold mb-4">Forgot Your Password?</h2>
          <p className="text-xl text-white/90 mb-8">
            No worries! We'll instantly reset your password to "PrimeMade" so you can log back in.
          </p>
          <div className="space-y-4 bg-white/10 rounded-lg p-6 backdrop-blur-sm">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              How it works:
            </h3>
            <ol className="space-y-2 text-white/90">
              <li className="flex gap-2">
                <span className="font-semibold">1.</span>
                <span>Enter your registered phone number</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">2.</span>
                <span>If found, you'll see admin contact information</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">3.</span>
                <span>Contact the admin to reset your password to <strong>"PrimeMade"</strong></span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">4.</span>
                <span>Login with your phone and the password "PrimeMade"</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">5.</span>
                <span>Change your password from your profile settings</span>
              </li>
            </ol>
          </div>
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
            <h2 className="text-3xl font-bold tracking-tight">Forgot Password?</h2>
            <p className="text-muted-foreground mt-2">
              Enter your phone number to get admin contact information
            </p>
          </div>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6 space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleCheckPhone} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0201234567 or +233201234567"
                    required
                    className="h-11"
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the phone number you used to register
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-2">
                    <KeyRound className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <strong>Note:</strong> If your phone number is found, you'll receive admin contact information. 
                      Contact them to reset your password to <strong>"PrimeMade"</strong>.
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={loading}
                >
                  {loading ? 'Checking...' : 'Continue'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="text-center text-sm text-muted-foreground space-y-2">
            <div>
              Remember your password?{' '}
              <Link className="text-primary hover:underline font-medium" to="/login">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
