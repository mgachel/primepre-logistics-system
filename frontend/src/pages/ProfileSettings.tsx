import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Camera, 
  Key, 
  Shield, 
  User, 
  Save, 
  AlertTriangle, 
  CheckCircle,
  Eye,
  EyeOff,
  Loader2
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from '@/contexts/AuthContext';
import { profileService, ProfileData, ProfileUpdateData, PasswordChangeData } from '@/services/profileService';

export default function ProfileSettings() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Profile form state
  const [profileForm, setProfileForm] = useState<ProfileUpdateData>({
    first_name: '',
    last_name: '',
    company_name: '',
    email: '',
    phone: '',
    region: '',
    user_type: 'INDIVIDUAL',
  });

  // Password form state
  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false,
  });

  // Fetch profile data
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await profileService.getProfile();
      setProfile(response.data);
      setProfileForm({
        first_name: response.data.first_name,
        last_name: response.data.last_name,
        company_name: response.data.company_name || '',
        email: response.data.email || '',
        phone: response.data.phone || '',
        region: response.data.region,
        user_type: response.data.user_type,
      });
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setError('Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Update profile
  const handleProfileUpdate = async () => {
    try {
      setSaving(true);
      setError(null);
      const response = await profileService.updateProfile(profileForm);
      setProfile(response.data);
      setSuccess('Profile updated successfully!');
      
      // Update user context
      updateUser(response.data);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      console.error('Failed to update profile:', err);
      const apiError = err as { response?: { data?: Record<string, string[]> } };
      
      if (apiError?.response?.data) {
        const errorMessages = Object.entries(apiError.response.data)
          .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
          .join('; ');
        setError(`Failed to update profile: ${errorMessages}`);
      } else {
        setError('Failed to update profile. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  // Change password
  const handlePasswordChange = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      if (passwordData.new_password !== passwordData.confirm_password) {
        setError('New passwords do not match.');
        return;
      }
      
      await profileService.changePassword(passwordData);
      setSuccess('Password changed successfully!');
      
      // Clear form
      setPasswordData({
        old_password: '',
        new_password: '',
        confirm_password: '',
      });
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      console.error('Failed to change password:', err);
      const apiError = err as { response?: { data?: Record<string, string[]> } };
      
      if (apiError?.response?.data) {
        const errorMessages = Object.entries(apiError.response.data)
          .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
          .join('; ');
        setError(`Failed to change password: ${errorMessages}`);
      } else {
        setError('Failed to change password. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  // Load profile on component mount
  useEffect(() => {
    fetchProfile();
  }, []);

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!profile) return 'U';
    return `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase();
  };

  // Format role display
  const formatRole = (role: string) => {
    return role.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="account">Account Info</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Update your personal details and profile information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src="/placeholder.svg" alt="Profile" />
                  <AvatarFallback className="text-lg">{getUserInitials()}</AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" disabled>
                    <Camera className="mr-2 h-4 w-4" />
                    Change Photo
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Photo upload coming soon
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profileForm.first_name}
                    onChange={(e) => setProfileForm({...profileForm, first_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profileForm.last_name}
                    onChange={(e) => setProfileForm({...profileForm, last_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={profileForm.company_name}
                    onChange={(e) => setProfileForm({...profileForm, company_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">Region</Label>
                  <Input
                    id="region"
                    value={profileForm.region}
                    onChange={(e) => setProfileForm({...profileForm, region: e.target.value})}
                  />
                </div>
              </div>

              <Button onClick={handleProfileUpdate} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Password & Security
              </CardTitle>
              <CardDescription>
                Manage your password and security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input 
                      id="currentPassword" 
                      type={showPasswords.old ? "text" : "password"}
                      value={passwordData.old_password}
                      onChange={(e) => setPasswordData({...passwordData, old_password: e.target.value})}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPasswords({...showPasswords, old: !showPasswords.old})}
                    >
                      {showPasswords.old ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input 
                      id="newPassword" 
                      type={showPasswords.new ? "text" : "password"}
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                    >
                      {showPasswords.new ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input 
                      id="confirmPassword" 
                      type={showPasswords.confirm ? "text" : "password"}
                      value={passwordData.confirm_password}
                      onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                    >
                      {showPasswords.confirm ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button 
                  onClick={handlePasswordChange} 
                  disabled={saving || !passwordData.old_password || !passwordData.new_password || !passwordData.confirm_password}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Key className="mr-2 h-4 w-4" />
                      Update Password
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                View your account details and system information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {profile && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">User ID</Label>
                    <p className="text-sm">{profile.id}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Shipping Mark</Label>
                    <p className="text-sm font-mono">{profile.shipping_mark}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">User Role</Label>
                    <Badge variant="outline">{formatRole(profile.user_role)}</Badge>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Account Type</Label>
                    <Badge variant="secondary">{formatRole(profile.user_type)}</Badge>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <Badge variant={profile.is_active ? "default" : "destructive"}>
                      {profile.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Member Since</Label>
                    <p className="text-sm">{new Date(profile.date_joined).toLocaleDateString()}</p>
                  </div>
                  {profile.accessible_warehouses.length > 0 && (
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-sm font-medium text-muted-foreground">Accessible Warehouses</Label>
                      <div className="flex gap-2">
                        {profile.accessible_warehouses.map((warehouse) => (
                          <Badge key={warehouse} variant="outline">
                            {warehouse.charAt(0).toUpperCase() + warehouse.slice(1)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}