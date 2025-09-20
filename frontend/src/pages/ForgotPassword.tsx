import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, } from 'lucide-react';
import { authService } from '@/services/authService';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'request' | 'verify' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setInfo(''); setLoading(true);
    try {
      const res = await authService.requestPasswordReset(email);
      if (res.success) {
        setInfo('If an account exists for that email, a verification code has been sent.');
        setStep('verify');
      } else {
        setError(res.message || 'Could not initiate password reset');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setInfo(''); setLoading(true);
    try {
      const res = await authService.verifyPasswordResetCode(email, code);
      if (res.success) {
        setStep('reset');
      } else {
        setError(res.message || 'Invalid or expired code');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setInfo(''); setLoading(true);
    if (password !== confirm) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    try {
      const res = await authService.confirmPasswordReset({ email, code, new_password: password, confirm_password: confirm });
      if (res.success) {
        setInfo('Password reset successful. You can now sign in.');
        setTimeout(() => navigate('/login'), 1200);
      } else {
        setError(res.message || 'Failed to reset password');
      }
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
          <h2 className="text-4xl font-bold mb-4">Reset your password</h2>
          <p className="text-xl text-white/90 mb-8">Follow the steps to recover your account securely.</p>
        </div>
        <div className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full"></div>
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-white/10 rounded-full"></div>
        <div className="absolute top-1/2 right-20 w-16 h-16 bg-white/10 rounded-full"></div>
      </div>

      {/* Right Side - Flow */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden text-center mb-6">
            <img src="/primepre-logo-1.png" alt="Prime Pre Logo" className="w-40 h-auto mx-auto mb-4" />
          </div>
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">Forgot password</h2>
            <p className="text-muted-foreground mt-2">We'll email you a 6-digit verification code</p>
          </div>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6 space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {info && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>{info}</AlertDescription>
                </Alert>
              )}

              {step === 'request' && (
                <form onSubmit={handleRequest} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
                  </div>
                  <Button type="submit" className="w-full h-11" disabled={loading}>
                    {loading ? 'Sending code...' : 'Send verification code'}
                  </Button>
                </form>
              )}

              {step === 'verify' && (
                <form onSubmit={handleVerify} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Verification Code</Label>
                    <Input id="code" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" className="h-11" />
                  </div>
                  <Button type="submit" className="w-full h-11" disabled={loading}>
                    {loading ? 'Verifying...' : 'Verify code'}
                  </Button>
                </form>
              )}

              {step === 'reset' && (
                <form onSubmit={handleReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm">Confirm New Password</Label>
                    <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className="h-11" />
                  </div>
                  <Button type="submit" className="w-full h-11" disabled={loading}>
                    {loading ? 'Resetting...' : 'Reset password'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <div className="text-center text-sm text-muted-foreground">
            Remember your password?{' '}
            <Link className="text-primary hover:underline" to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
