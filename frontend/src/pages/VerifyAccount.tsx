import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Package, Phone, Lock, ArrowRight, ArrowLeft, ChevronsUpDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { config } from '@/lib/config';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface CargoItem {
  tracking_id: string;
  container_id: string;
  description: string;
  quantity: number;
  cargo_type: string;
  status: string;
  eta: string | null;
}

interface VerificationResponse {
  success: boolean;
  has_shipping_mark: boolean;
  shipping_mark_verified?: boolean;
  message: string;
  user?: {
    phone: string;
    name: string;
    email: string;
    shipping_mark: string;
  };
  cargo_items?: CargoItem[];
  total_items?: number;
  instructions?: string;
  error?: string;
}

export default function VerifyAccount() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'phone' | 'shipping-mark' | 'confirm'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [phone, setPhone] = useState('');
  const [hasShippingMark, setHasShippingMark] = useState<'yes' | 'no' | null>(null);
  const [shippingMark, setShippingMark] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Shipping marks dropdown
  const [shippingMarks, setShippingMarks] = useState<string[]>([]);
  const [loadingMarks, setLoadingMarks] = useState(false);
  const [shippingMarkPopoverOpen, setShippingMarkPopoverOpen] = useState(false);

  // Verification data
  const [verificationData, setVerificationData] = useState<VerificationResponse | null>(null);

  // Fetch shipping marks on component mount
  useEffect(() => {
    fetchShippingMarks();
  }, []);

  const fetchShippingMarks = async () => {
    setLoadingMarks(true);
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/auth/shipping-marks/`);
      const data = await response.json();
      
      console.log('Shipping marks response:', data);
      console.log('Shipping marks array:', data.shipping_marks);
      
      if (data.success && data.shipping_marks) {
        setShippingMarks(data.shipping_marks);
        console.log('Set shipping marks:', data.shipping_marks.length, 'items');
      }
    } catch (err) {
      console.error('Failed to fetch shipping marks:', err);
    } finally {
      setLoadingMarks(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!phone.trim()) {
      setError('Please enter your phone number');
      return;
    }

    if (!hasShippingMark) {
      setError('Please select whether you have a shipping mark');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${config.apiBaseUrl}/api/auth/verify/shipping-mark/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phone,
          has_shipping_mark: hasShippingMark === 'yes',
          shipping_mark: hasShippingMark === 'yes' ? shippingMark : '',
        }),
      });

      const data = await response.json();
      
      console.log('Verification response:', data);

      if (response.ok && data.success) {
        setVerificationData(data);
        
        if (data.has_shipping_mark && data.shipping_mark_verified) {
          // User has shipping mark and it was found
          setSuccess(data.message);
          setStep('confirm');
        } else if (!data.has_shipping_mark) {
          // User doesn't have shipping mark, proceed to set password
          setSuccess(data.message);
          setStep('confirm');
        }
      } else {
        console.error('Verification failed:', data);
        console.error('Validation details:', data.details);
        
        // Show detailed error message
        let errorMessage = data.error || data.message || 'Verification failed';
        if (data.details) {
          const detailMessages = Object.entries(data.details)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
            .join('; ');
          errorMessage = `${errorMessage} - ${detailMessages}`;
        }
        setError(errorMessage);
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
      console.error('Verification error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password.trim() || !confirmPassword.trim()) {
      setError('Please enter and confirm your password');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${config.apiBaseUrl}/api/auth/verify/shipping-mark/confirm/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phone,
          shipping_mark: verificationData?.user?.shipping_mark || shippingMark,
          password: password,
          confirm_password: confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess('Account verified successfully! Redirecting to login page...');
        
        // Redirect to login page
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(data.error || data.message || 'Confirmation failed');
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
      console.error('Confirmation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'Pending', variant: 'secondary' },
      in_transit: { label: 'In Transit', variant: 'default' },
      delivered: { label: 'Delivered', variant: 'outline' },
      delayed: { label: 'Delayed', variant: 'destructive' },
    };

    const item = config[status] || config.pending;
    return <Badge variant={item.variant}>{item.label}</Badge>;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
      <div className="w-full max-w-4xl">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-center text-2xl">Verify Your Account</CardTitle>
            <CardDescription className="text-center">
              {step === 'phone' && 'Enter your phone number to get started'}
              {step === 'shipping-mark' && 'Do you have a shipping mark?'}
              {step === 'confirm' && 'Set your password to complete verification'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Success Alert */}
            {success && (
              <Alert className="border-green-500 bg-green-50 text-green-900">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {/* Step 1: Phone Number and Shipping Mark Check */}
            {step === 'phone' && (
              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter your phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10"
                      disabled={loading}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Use the phone number registered in the system
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Do you have a shipping mark?</Label>
                  <RadioGroup
                    value={hasShippingMark || ''}
                    onValueChange={(value) => setHasShippingMark(value as 'yes' | 'no')}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="has-mark-yes" />
                      <Label htmlFor="has-mark-yes" className="font-normal cursor-pointer">
                        Yes, I have a shipping mark
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="has-mark-no" />
                      <Label htmlFor="has-mark-no" className="font-normal cursor-pointer">
                        No, I don't have a shipping mark
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {hasShippingMark === 'yes' && (
                  <div className="space-y-2">
                    <Label htmlFor="shipping-mark">Shipping Mark</Label>
                    <Popover open={shippingMarkPopoverOpen} onOpenChange={setShippingMarkPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={shippingMarkPopoverOpen}
                          className="w-full justify-between"
                          disabled={loading || loadingMarks}
                        >
                          {shippingMark || (loadingMarks ? "Loading shipping marks..." : "Search and select your shipping mark")}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search shipping marks..." />
                          <CommandList>
                            <CommandEmpty>No shipping mark found.</CommandEmpty>
                            <CommandGroup>
                              {shippingMarks.map((mark) => (
                                <CommandItem
                                  key={mark}
                                  value={mark}
                                  onSelect={(currentValue) => {
                                    setShippingMark(currentValue.toUpperCase());
                                    setShippingMarkPopoverOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      shippingMark === mark ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {mark}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <p className="text-sm text-muted-foreground">
                      Search and select the unique identifier on your cargo packages
                    </p>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Verifying...' : 'Continue'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            )}

            {/* Step 2: Confirm and Set Password */}
            {step === 'confirm' && verificationData && (
              <div className="space-y-6">
                {/* User Info */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold text-sm">Account Information</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>
                      <p className="font-medium">{verificationData.user?.name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Phone:</span>
                      <p className="font-medium">{verificationData.user?.phone}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email:</span>
                      <p className="font-medium">{verificationData.user?.email}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Shipping Mark:</span>
                      <p className="font-medium">{verificationData.user?.shipping_mark}</p>
                    </div>
                  </div>
                </div>

                {/* Cargo Items Table (if shipping mark was verified) */}
                {verificationData.shipping_mark_verified && verificationData.cargo_items && verificationData.cargo_items.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold">Your Cargo Items ({verificationData.total_items})</h3>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tracking ID</TableHead>
                            <TableHead>Container</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {verificationData.cargo_items.map((item) => (
                            <TableRow key={item.tracking_id}>
                              <TableCell className="font-mono text-xs">{item.tracking_id}</TableCell>
                              <TableCell>{item.container_id}</TableCell>
                              <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{item.cargo_type.toUpperCase()}</Badge>
                              </TableCell>
                              <TableCell>{getStatusBadge(item.status)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Set Password Form */}
                <form onSubmit={handleConfirmSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="Create a strong password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Re-enter your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setStep('phone');
                        setError(null);
                        setSuccess(null);
                      }}
                      disabled={loading}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button type="submit" className="flex-1" disabled={loading}>
                      {loading ? 'Verifying...' : 'Verify Account'}
                      <CheckCircle2 className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Login Link */}
            <div className="text-center text-sm text-muted-foreground">
              Already verified?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Login here
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
