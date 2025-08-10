import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Eye, EyeOff, UserPlus } from 'lucide-react';

export default function Signup() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    company_name: '',
    email: '',
    phone: '',
    region: 'Accra',
    user_type: 'INDIVIDUAL' as 'INDIVIDUAL' | 'BUSINESS',
    password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setForm((f) => ({ ...f, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (form.password !== form.confirm_password) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const ok = await register({
        first_name: form.first_name,
        last_name: form.last_name,
        company_name: form.company_name || undefined,
        email: form.email || undefined,
        phone: form.phone,
        region: form.region,
        user_type: form.user_type,
        password: form.password,
        confirm_password: form.confirm_password,
      });
      if (ok) {
        navigate('/');
      } else {
        setError('Registration failed. Please review your inputs and try again.');
      }
    } catch (err) {
      setError('Registration failed. Please try again.');
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
            <h2 className="text-3xl font-bold tracking-tight">Sign up</h2>
            <p className="text-muted-foreground mt-2">Create a new account</p>
          </div>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input id="first_name" value={form.first_name} onChange={onChange} required className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input id="last_name" value={form.last_name} onChange={onChange} required className="h-11" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name (optional)</Label>
                  <Input id="company_name" value={form.company_name} onChange={onChange} className="h-11" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email (for password recovery)</Label>
                  <Input id="email" type="email" value={form.email} onChange={onChange} placeholder="you@example.com" className="h-11" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" value={form.phone} onChange={onChange} required className="h-11" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="region">Region</Label>
                  <select
                    id="region"
                    aria-label="Region"
                    value={form.region}
                    onChange={onChange}
                    className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="Accra">Accra</option>
                    <option value="Kumasi">Kumasi</option>
                    <option value="Tamale">Tamale</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user_type">User Type</Label>
                  <select id="user_type" aria-label="User Type" value={form.user_type} onChange={onChange} className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="INDIVIDUAL">Individual</option>
                    <option value="BUSINESS">Business</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={onChange} required className="h-11 pr-10" />
                    <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirm Password</Label>
                  <div className="relative">
                    <Input id="confirm_password" type={showConfirm ? 'text' : 'password'} value={form.confirm_password} onChange={onChange} required className="h-11 pr-10" />
                    <button type="button" onClick={() => setShowConfirm((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading ? 'Creating account...' : (
                    <div className="flex items-center">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create Account
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link className="text-primary hover:underline" to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
