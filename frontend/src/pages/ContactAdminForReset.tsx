import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Phone, Mail, MessageCircle, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ContactAdminForReset() {
  const location = useLocation();
  const navigate = useNavigate();
  const phone = location.state?.phone || '';

  // If no phone number is provided, redirect back to forgot password
  React.useEffect(() => {
    if (!phone) {
      navigate('/forgot-password');
    }
  }, [phone, navigate]);

  const adminContacts = [
    {
      name: 'Admin Support',
      phone: '+233 XX XXX XXXX', // Replace with actual admin contact
      whatsapp: '+233 XX XXX XXXX', // Replace with actual WhatsApp
      email: 'admin@primepre.com', // Replace with actual email
    }
  ];

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
          <h2 className="text-4xl font-bold mb-4">Account Found!</h2>
          <p className="text-xl text-white/90 mb-8">
            We found your account in our system. Contact our admin team to reset your password.
          </p>
          <div className="space-y-4 bg-white/10 rounded-lg p-6 backdrop-blur-sm">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Next Steps:
            </h3>
            <ol className="space-y-2 text-white/90">
              <li className="flex gap-2">
                <span className="font-semibold">1.</span>
                <span>Contact the admin using any of the methods shown</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">2.</span>
                <span>Provide your phone number: <strong>{phone}</strong></span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">3.</span>
                <span>Admin will reset your password to <strong>"PrimeMade"</strong></span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">4.</span>
                <span>Login with your phone and password "PrimeMade"</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">5.</span>
                <span>Change your password in profile settings</span>
              </li>
            </ol>
          </div>
        </div>
        <div className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full"></div>
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-white/10 rounded-full"></div>
        <div className="absolute top-1/2 right-20 w-16 h-16 bg-white/10 rounded-full"></div>
      </div>

      {/* Right Side - Contact Information */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden text-center mb-6">
            <img src="/primepre-logo-1.png" alt="Prime Pre Logo" className="w-40 h-auto mx-auto mb-4" />
          </div>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Account Found!</h2>
            <p className="text-muted-foreground mt-2">
              Your phone number: <span className="font-semibold text-foreground">{phone}</span>
            </p>
          </div>

          <Alert className="border-blue-200 bg-blue-50">
            <KeyRound className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Contact our admin team to reset your password to <strong>"PrimeMade"</strong>
            </AlertDescription>
          </Alert>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-4 text-center">Contact Admin</h3>
                
                <div className="space-y-4">
                  {adminContacts.map((admin, index) => (
                    <div key={index} className="space-y-3">
                      <div className="text-sm font-medium text-muted-foreground text-center">
                        {admin.name}
                      </div>
                      
                      {/* Phone Contact */}
                      <a
                        href={`tel:${admin.phone}`}
                        className="flex items-center gap-3 p-4 rounded-lg border-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-all"
                      >
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                          <Phone className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">Call Admin</div>
                          <div className="text-sm text-muted-foreground">{admin.phone}</div>
                        </div>
                      </a>

                      {/* WhatsApp Contact */}
                      <a
                        href={`https://wa.me/${admin.whatsapp.replace(/[^0-9]/g, '')}?text=Hello, I need to reset my password for phone number: ${phone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 rounded-lg border-2 border-green-500/20 hover:border-green-500 hover:bg-green-50 transition-all"
                      >
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100">
                          <MessageCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">WhatsApp</div>
                          <div className="text-sm text-muted-foreground">{admin.whatsapp}</div>
                        </div>
                      </a>

                      {/* Email Contact */}
                      <a
                        href={`mailto:${admin.email}?subject=Password Reset Request&body=Hello, I need to reset my password for phone number: ${phone}`}
                        className="flex items-center gap-3 p-4 rounded-lg border-2 border-blue-500/20 hover:border-blue-500 hover:bg-blue-50 transition-all"
                      >
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
                          <Mail className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">Email Admin</div>
                          <div className="text-sm text-muted-foreground">{admin.email}</div>
                        </div>
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="text-sm text-amber-800">
                  <strong>Important:</strong> When contacting admin, mention your phone number 
                  <strong> {phone}</strong> so they can quickly locate and reset your account.
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/forgot-password')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Forgot Password
            </Button>
            
            <div className="text-center text-sm text-muted-foreground">
              Remember your password?{' '}
              <Link className="text-primary hover:underline font-medium" to="/login">
                Sign in
              </Link>
            </div>
            
            <div className="text-center text-xs text-muted-foreground">
              New to Prime Pre?{' '}
              <Link className="text-primary hover:underline font-medium" to="/simplified-signup">
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
