// src/lib/validations/auth.ts
import { z } from 'zod';

// Login validation
export const loginSchema = z.object({
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .min(10, 'Phone number must be at least 10 digits')
    .regex(/^\+?[\d\s\-()]{10,15}$/, 'Please enter a valid phone number'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
});

// Signup Step 1 validation
export const signupStep1Schema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .regex(/^[a-zA-Z\s]+$/, 'Name should only contain letters and spaces')
    .transform((val) => val.trim()),
  company_name: z
    .string()
    .optional()
    .transform((val) => val?.trim() || undefined),
});

// Signup Step 2 validation
export const signupStep2Schema = z.object({
  shipping_mark: z
    .string()
    .min(1, 'Please select a shipping mark'),
});

// Signup Step 3 validation
export const signupStep3Schema = z.object({
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .min(10, 'Phone number must be at least 10 digits')
    .regex(/^\+?[\d\s\-()]{10,15}$/, 'Please enter a valid phone number'),
  region: z
    .string()
    .min(1, 'Please select your region'),
});

// Signup Step 4 validation (password)
export const signupStep4Schema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/\d/, 'Password must contain at least one number'),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// PIN verification validation
export const verifyPhoneSchema = z.object({
  pin: z
    .string()
    .min(6, 'PIN must be 6 digits')
    .max(6, 'PIN must be 6 digits')
    .regex(/^\d{6}$/, 'PIN must be exactly 6 digits'),
});

// Forgot password validation
export const forgotPasswordSchema = z.object({
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .min(10, 'Phone number must be at least 10 digits')
    .regex(/^\+?[\d\s\-()]{10,15}$/, 'Please enter a valid phone number'),
});

// Password reset validation
export const passwordResetSchema = z.object({
  pin: z
    .string()
    .min(6, 'PIN must be 6 digits')
    .max(6, 'PIN must be 6 digits')
    .regex(/^\d{6}$/, 'PIN must be exactly 6 digits'),
  new_password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
  confirm_password: z
    .string()
    .min(1, 'Please confirm your password'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

// TypeScript types derived from schemas
export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupStep1Data = z.infer<typeof signupStep1Schema>;
export type SignupStep2Data = z.infer<typeof signupStep2Schema>;
export type SignupStep3Data = z.infer<typeof signupStep3Schema>;
export type SignupStep4Data = z.infer<typeof signupStep4Schema>;
export type VerifyPhoneData = z.infer<typeof verifyPhoneSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type PasswordResetFormData = z.infer<typeof passwordResetSchema>;