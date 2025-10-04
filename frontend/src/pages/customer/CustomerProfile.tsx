import React, { useState, useEffect } from 'react';
import { 
  User, 
  Camera,
  Save,
  Edit,
  Eye,
  EyeOff,
  Mail,
  Phone,
  MapPin,
  Building,
  Lock,
  Upload,
  X
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { useToast } from '../../components/ui/use-toast';
import { Separator } from '../../components/ui/separator';
import { useAuthStore } from '../../stores/authStore';
import { authService } from '../../services/authService';
// Note: Full profile editing will be implemented when backend APIs are available

interface ProfileData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company_name: string;
  region: string;
  shipping_mark: string;
}

interface PasswordData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

const CustomerProfile: React.FC = () => {
  const { user } = useAuthStore();
  const [profileData, setProfileData] = useState<ProfileData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company_name: '',
    region: '',
    shipping_mark: ''
  });
  const [passwordData, setPasswordData] = useState<PasswordData>({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setProfileData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        company_name: user.company_name || '',
        region: user.region || '',
        shipping_mark: user.shipping_mark || ''
      });
    }
  }, [user]);

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePasswordChange = (field: keyof PasswordData, value: string) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedPhoto(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoUpload = async () => {
    if (!selectedPhoto) return;

    try {
      setLoading(true);
      // TODO: Implement photo upload when backend API is available
      toast({
        title: "Feature Coming Soon",
        description: "Photo upload will be available when backend APIs are implemented",
        variant: "default",
      });
      setShowPhotoDialog(false);
      setSelectedPhoto(null);
      setPhotoPreview('');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Error",
        description: "Failed to upload profile photo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    try {
      setLoading(true);
      // TODO: Implement profile update when backend API is available
      setIsEditing(false);
      toast({
        title: "Feature Coming Soon",
        description: "Profile editing will be available when backend APIs are implemented",
        variant: "default",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    // Validation
    if (!passwordData.current_password) {
      toast({
        title: "Current Password Required",
        description: "Please enter your current password",
        variant: "destructive",
      });
      return;
    }

    if (!passwordData.new_password) {
      toast({
        title: "New Password Required",
        description: "Please enter a new password",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation do not match",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.new_password.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    // Check if trying to use the default password
    if (passwordData.new_password === 'PrimeMade') {
      toast({
        title: "Weak Password",
        description: "Please choose a different password. 'PrimeMade' is the default password and should be changed.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      // Call API to change password
      const response = await authService.changePassword(
        passwordData.current_password,
        passwordData.new_password,
        passwordData.confirm_password
      );

      if (response.success) {
        // Clear form
        setPasswordData({
          current_password: '',
          new_password: '',
          confirm_password: ''
        });

        toast({
          title: "Success!",
          description: "Your password has been updated successfully",
        });
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to update password. Please check your current password.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    if (user) {
      setProfileData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        company_name: user.company_name || '',
        region: user.region || '',
        shipping_mark: user.shipping_mark || ''
      });
    }
    setIsEditing(false);
  };

  const getUserInitials = () => {
    const firstName = profileData.first_name || user?.first_name || '';
    const lastName = profileData.last_name || user?.last_name || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>
      </div>

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList>
          <TabsTrigger value="personal">Personal Information</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <div className="space-y-6">
            {/* Profile Photo Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Camera className="h-5 w-5" />
                  <span>Profile Photo</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-6">
                  <Avatar className="h-24 w-24">
                    <AvatarFallback className="text-lg">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">
                      {profileData.first_name} {profileData.last_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {profileData.company_name}
                    </p>
                    <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Upload className="h-4 w-4 mr-2" />
                          Change Photo
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Update Profile Photo</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="flex justify-center">
                            {photoPreview ? (
                              <div className="relative">
                                <img 
                                  src={photoPreview} 
                                  alt="Preview" 
                                  className="h-32 w-32 rounded-full object-cover"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="absolute top-0 right-0"
                                  onClick={() => {
                                    setSelectedPhoto(null);
                                    setPhotoPreview('');
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Avatar className="h-32 w-32">
                                <AvatarFallback className="text-2xl">
                                  {getUserInitials()}
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                          <div className="flex justify-center">
                            <label htmlFor="photo-upload" className="cursor-pointer">
                              <Button variant="outline" asChild>
                                <span>
                                  <Upload className="h-4 w-4 mr-2" />
                                  Select Photo
                                </span>
                              </Button>
                              <input
                                id="photo-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handlePhotoSelect}
                              />
                            </label>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => setShowPhotoDialog(false)}>
                              Cancel
                            </Button>
                            <Button 
                              onClick={handlePhotoUpload}
                              disabled={!selectedPhoto || loading}
                            >
                              {loading ? "Uploading..." : "Upload"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Personal Details */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Personal Details</span>
                  </CardTitle>
                  {!isEditing ? (
                    <Button variant="outline" onClick={() => setIsEditing(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  ) : (
                    <div className="space-x-2">
                      <Button variant="outline" onClick={cancelEdit}>
                        Cancel
                      </Button>
                      <Button onClick={handleProfileUpdate} disabled={loading}>
                        <Save className="h-4 w-4 mr-2" />
                        {loading ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      value={profileData.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      value={profileData.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      disabled={!isEditing}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      disabled={!isEditing}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="company_name">Company Name</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="company_name"
                      value={profileData.company_name}
                      onChange={(e) => handleInputChange('company_name', e.target.value)}
                      disabled={!isEditing}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="region">Region</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="region"
                      value={profileData.region}
                      disabled={true} // Region typically shouldn't be editable
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="shipping_mark">Shipping Mark</Label>
                  <Input
                    id="shipping_mark"
                    value={profileData.shipping_mark}
                    disabled={true} // Shipping mark typically shouldn't be editable
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Your unique shipping identifier
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <div className="space-y-6">
            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <Lock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">First time changing your password?</p>
                  <p>If your account was created by an administrator or you recently used the "Forgot Password" feature, your current password is <strong>"PrimeMade"</strong>. We recommend changing it to a unique, secure password.</p>
                </div>
              </div>
            </div>

            {/* Password Change */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lock className="h-5 w-5" />
                  <span>Change Password</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="current_password">Current Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="current_password"
                      type={showPassword.current ? "text" : "password"}
                      value={passwordData.current_password}
                      onChange={(e) => handlePasswordChange('current_password', e.target.value)}
                      className="pl-10 pr-10"
                      placeholder="Enter your current password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(prev => ({ ...prev, current: !prev.current }))}
                    >
                      {showPassword.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    If you haven't changed it yet, use "PrimeMade"
                  </p>
                </div>

                <div>
                  <Label htmlFor="new_password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new_password"
                      type={showPassword.new ? "text" : "password"}
                      value={passwordData.new_password}
                      onChange={(e) => handlePasswordChange('new_password', e.target.value)}
                      className="pl-10 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(prev => ({ ...prev, new: !prev.new }))}
                    >
                      {showPassword.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Must be at least 8 characters long
                  </p>
                </div>

                <div>
                  <Label htmlFor="confirm_password">Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm_password"
                      type={showPassword.confirm ? "text" : "password"}
                      value={passwordData.confirm_password}
                      onChange={(e) => handlePasswordChange('confirm_password', e.target.value)}
                      className="pl-10 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(prev => ({ ...prev, confirm: !prev.confirm }))}
                    >
                      {showPassword.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Separator />

                <Button 
                  onClick={handlePasswordUpdate} 
                  disabled={loading || !passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password}
                  className="w-full"
                >
                  {loading ? "Updating..." : "Update Password"}
                </Button>
              </CardContent>
            </Card>

            {/* Account Information */}
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Account Created</span>
                  <span className="text-sm text-muted-foreground">
                    {user?.date_joined ? new Date(user.date_joined).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Account Status</span>
                  <span className="text-sm text-green-600 font-medium">
                    {user?.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">User Role</span>
                  <span className="text-sm text-muted-foreground">
                    {user?.user_role || 'Customer'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerProfile;