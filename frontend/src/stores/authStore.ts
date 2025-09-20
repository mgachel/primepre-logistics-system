// src/stores/authStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { toast } from 'sonner';
import { authService, User } from '../services/api';

interface SignupData {
  // Step 1 - Basic Info
  first_name?: string;
  last_name?: string;
  name?: string; // Combined name for new flow
  company_name?: string;
  companyName?: string; // Alternative naming
  email?: string;
  
  // Step 2 - Shipping Mark
  shipping_mark?: string;
  shippingMark?: string; // Alternative naming
  
  // Step 3 - Contact Info
  phone?: string;
  region?: string;
  
  // Step 4 - Password
  password?: string;
}

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Signup wizard state
  signupData: Partial<SignupData>;
  signupStep: number;
  shippingMarkSuggestions: string[];
  
  // Initialization
  initializeAuth: () => Promise<void>;
  
  // Actions
  login: (credentials: { phone: string; password: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  setError: (error: string) => void;
  setUser: (user: User) => void;
  
  // Signup flow
  setSignupData: (data: Partial<SignupData>) => void;
  setSignupStep: (step: number) => void;
  signupStep1: (data: { first_name: string; last_name: string; company_name?: string; email: string }) => Promise<boolean>;
  signupStep2: (data: { shipping_mark: string }) => Promise<boolean>;
  signupStep3: (data: { phone: string; region: string }) => Promise<boolean>;
  signupComplete: (data: { password: string; confirm_password: string }) => Promise<boolean>;
  verifyPin: (pin: string) => Promise<boolean>;
  resendPin: () => Promise<boolean>;
  clearSignupData: () => void;
  
  // Additional signup methods for new flow
  updateSignupData: (data: Partial<SignupData>) => void;
  completeSignup: () => Promise<boolean>;
  
  // Password reset
  forgotPassword: (phone: string) => Promise<boolean>;
  resetPassword: (data: { pin: string; new_password: string; confirm_password: string }) => Promise<boolean>;
  
  // Profile
  fetchProfile: () => Promise<void>;
  
  // Initialize auth state
  // Removed duplicate initializeAuth declaration
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        signupData: {},
        signupStep: 1,
        shippingMarkSuggestions: [],

        // Initialize auth state on app load with delay to prevent rate limiting
        initializeAuth: async () => {
          const token = authService.getToken();
          if (token) {
            set({ isAuthenticated: true });
            
            // Add delay to prevent simultaneous requests with dashboard loading
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Try to fetch user profile, but don't logout if it fails during initialization
            try {
              console.log('Initializing auth with delayed profile fetch...');
              const user = await authService.getProfile();
              set({ user });
              console.log('✅ Profile loaded successfully during auth init');
            } catch (error) {
              console.error('Failed to fetch profile during initialization:', error);
              // During initialization, we'll keep the user logged in even if profile fetch fails
              // This prevents the login -> logout loop
            }
          }
        },

        // Clear error
        clearError: () => set({ error: null }),
        
        // Set error
        setError: (error: string) => set({ error }),

        // Set user directly (useful for signup)
        setUser: (user: User) => set({ user, isAuthenticated: true }),

        // Login
        login: async (credentials) => {
          set({ isLoading: true, error: null });
          try {
            const response = await authService.login(credentials);
            // Defensive checks: must have tokens and user, and response.success
            const hasTokens = response?.tokens?.access && response?.tokens?.refresh;
            const hasUser = response?.user && response.user.id;
            // Remove response.success check, only check for tokens and user
            if (response && hasTokens && hasUser) {
              console.log('🎉 AuthStore: Login successful, updating user state:', response.user.user_role);
              set({ 
                user: response.user, 
                isAuthenticated: true, 
                isLoading: false 
              });
              toast.success(`Welcome back, ${response.user.first_name}!`);
              return true;
            } else {
              set({ error: 'Invalid credentials', isLoading: false });
              toast.error('Invalid credentials');
              return false;
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Login failed';
            set({ error: errorMessage, isLoading: false });
            toast.error(errorMessage);
            return false;
          }
        },

        // Logout
        logout: async () => {
          set({ isLoading: true });
          try {
            await authService.logout();
          } catch (error) {
            // Ignore logout errors
          } finally {
            set({ 
              user: null, 
              isAuthenticated: false, 
              isLoading: false,
              signupData: {},
              signupStep: 1,
              shippingMarkSuggestions: []
            });
            toast.success('Logged out successfully');
          }
        },

        // Signup flow
        setSignupData: (data) => {
          set((state) => ({
            signupData: { ...state.signupData, ...data }
          }));
        },

        setSignupStep: (step) => set({ signupStep: step }),

        signupStep1: async (data) => {
          set({ isLoading: true, error: null });
          try {
            const response = await authService.signupStep1(data);
            set((state) => ({
              signupData: { ...state.signupData, ...data },
              shippingMarkSuggestions: response.shipping_mark_suggestions,
              signupStep: 2,
              isLoading: false
            }));
            return true;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Signup step 1 failed';
            set({ error: errorMessage, isLoading: false });
            toast.error(errorMessage);
            return false;
          }
        },

        signupStep2: async (data) => {
          set({ isLoading: true, error: null });
          try {
            await authService.signupStep2(data);
            set((state) => ({
              signupData: { ...state.signupData, ...data },
              signupStep: 3,
              isLoading: false
            }));
            return true;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Signup step 2 failed';
            set({ error: errorMessage, isLoading: false });
            toast.error(errorMessage);
            return false;
          }
        },

        signupStep3: async (data) => {
          set({ isLoading: true, error: null });
          try {
            await authService.signupStep3(data);
            set((state) => ({
              signupData: { ...state.signupData, ...data },
              signupStep: 4,
              isLoading: false
            }));
            return true;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Signup step 3 failed';
            set({ error: errorMessage, isLoading: false });
            toast.error(errorMessage);
            return false;
          }
        },

        signupComplete: async (data) => {
          set({ isLoading: true, error: null });
          try {
            await authService.signupComplete(data);
            set((state) => ({
              signupData: { ...state.signupData, password: data.password },
              signupStep: 5,
              isLoading: false
            }));
            toast.success('Account created! Please verify your phone number.');
            return true;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Signup completion failed';
            set({ error: errorMessage, isLoading: false });
            toast.error(errorMessage);
            return false;
          }
        },

        verifyPin: async (pin) => {
          set({ isLoading: true, error: null });
          try {
            const response = await authService.verifyPin({ pin });
            set({ 
              user: response.user, 
              isAuthenticated: true, 
              isLoading: false,
              signupData: {},
              signupStep: 1,
              shippingMarkSuggestions: []
            });
            toast.success(`Welcome to PrimePre, ${response.user.first_name}!`);
            return true;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'PIN verification failed';
            set({ error: errorMessage, isLoading: false });
            toast.error(errorMessage);
            return false;
          }
        },

        resendPin: async () => {
          set({ isLoading: true, error: null });
          try {
            await authService.resendPin();
            set({ isLoading: false });
            toast.success('Verification code sent!');
            return true;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to resend PIN';
            set({ error: errorMessage, isLoading: false });
            toast.error(errorMessage);
            return false;
          }
        },

        clearSignupData: () => {
          set({ 
            signupData: {}, 
            signupStep: 1, 
            shippingMarkSuggestions: [] 
          });
        },

        // Additional signup methods for new flow
        updateSignupData: (data) => {
          set((state) => ({
            signupData: { ...state.signupData, ...data }
          }));
        },

        completeSignup: async () => {
          const { signupData } = get();
          if (!signupData.phone) {
            throw new Error('Phone number is required');
          }
          
          set({ isLoading: true, error: null });
          try {
            // The signup was already created in SignupVerify component
            // This method is called after successful phone verification
            set({ 
              isLoading: false,
              signupData: {},
              signupStep: 1
            });
            return true;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to complete signup';
            set({ error: errorMessage, isLoading: false });
            toast.error(errorMessage);
            throw error;
          }
        },

        // Password reset
        forgotPassword: async (phone) => {
          set({ isLoading: true, error: null });
          try {
            await authService.forgotPassword({ phone });
            set({ isLoading: false });
            toast.success('Password reset code sent to your phone!');
            return true;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to send reset code';
            set({ error: errorMessage, isLoading: false });
            toast.error(errorMessage);
            return false;
          }
        },

        resetPassword: async (data) => {
          set({ isLoading: true, error: null });
          try {
            await authService.resetPassword(data);
            set({ isLoading: false });
            toast.success('Password reset successfully! You can now log in.');
            return true;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
            set({ error: errorMessage, isLoading: false });
            toast.error(errorMessage);
            return false;
          }
        },

        // Profile
        fetchProfile: async () => {
          try {
            const user = await authService.getProfile();
            set({ user });
          } catch (error) {
            // If profile fetch fails (e.g., invalid token), logout the user
            console.error('Failed to fetch profile:', error);
            console.log('Logging out user due to profile fetch failure');
            get().logout();
          }
        },
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          signupData: state.signupData,
          signupStep: state.signupStep,
          shippingMarkSuggestions: state.shippingMarkSuggestions,
        }),
      }
    ),
    { name: 'auth-store' }
  )
);