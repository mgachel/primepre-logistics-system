import { apiClient, ApiResponse } from "./api";

// Profile Types
export interface ProfileData {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  company_name?: string;
  email?: string;
  phone: string;
  region: string;
  shipping_mark: string;
  user_role: string;
  user_type: "INDIVIDUAL" | "BUSINESS";
  is_active: boolean;
  date_joined: string;
  accessible_warehouses: string[];
}

export interface ProfileUpdateData {
  first_name: string;
  last_name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  region: string;
  user_type: "INDIVIDUAL" | "BUSINESS";
}
export interface PasswordChangeData {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

export const profileService = {
  // Get current user profile
  async getProfile(): Promise<ApiResponse<ProfileData>> {
    const response = await apiClient.get<ProfileData>("/api/auth/profile/");
    if (!response.success) {
      throw new Error(response.message || "Failed to load profile");
    }
    return response;
  },

  // Update current user profile
  async updateProfile(
    profileData: ProfileUpdateData
  ): Promise<ApiResponse<ProfileData>> {
    const response = await apiClient.put<ProfileData>(
      "/api/auth/profile/",
      profileData
    );
    if (!response.success) {
      throw new Error(response.message || "Failed to update profile");
    }
    return response;
  },

  // Change password
  async changePassword(
    passwordData: PasswordChangeData
  ): Promise<ApiResponse<{ message: string }>> {
    const response = await apiClient.post<{ message: string }>(
      "/api/auth/password-change/",
      passwordData
    );
    if (!response.success) {
      throw new Error(response.message || "Failed to change password");
    }
    return response;
  },

  // Validate current password
  async validatePassword(password: string): Promise<boolean> {
    try {
      await apiClient.post("/api/auth/password-change/", {
        old_password: password,
        new_password: "dummy", // This will fail validation but will check old password
        confirm_password: "dummy",
      });
      return true;
    } catch (error: unknown) {
      const apiError = error as {
        response?: { data?: { old_password?: string[] } };
      };
      if (apiError?.response?.data?.old_password) {
        return false; // Old password is incorrect
      }
      return true; // Other errors mean password is correct but other validation failed
    }
  },
};
