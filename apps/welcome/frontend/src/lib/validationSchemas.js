import { z } from 'zod';

// PM Planner Form Validation Schema
export const pmPlannerSchema = z.object({
  name: z
    .string()
    .min(1, 'Asset name is required')
    .min(3, 'Asset name must be at least 3 characters')
    .max(100, 'Asset name must be less than 100 characters')
    .trim(),
  
  model: z
    .string()
    .max(50, 'Model must be less than 50 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  
  serial: z
    .string()
    .max(50, 'Serial number must be less than 50 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  
  category: z
    .string()
    .min(1, 'Category is required')
    .refine(val => val !== '', 'Please select a category'),
  
  hours: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(val => {
      if (!val || val === '') return true;
      const num = parseInt(val);
      return !isNaN(num) && num >= 0 && num <= 100000;
    }, 'Hours must be a valid number between 0 and 100,000'),
  
  additional_context: z
    .string()
    .max(500, 'Additional context must be less than 500 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  
  environment: z
    .string()
    .max(300, 'Environment description must be less than 300 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  
  date_of_plan_start: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(val => {
      if (!val || val === '') return true;
      const date = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    }, 'Plan start date cannot be in the past'),
  
  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),
  
  company: z
    .string()
    .max(100, 'Company name must be less than 100 characters')
    .trim()
    .optional()
    .or(z.literal(''))
});

// Bulk Import CSV Row Schema
export const bulkImportRowSchema = z.object({
  name: z
    .string()
    .min(1, 'Asset name is required')
    .min(3, 'Asset name must be at least 3 characters')
    .max(100, 'Asset name must be less than 100 characters')
    .trim(),
  
  model: z
    .string()
    .max(50, 'Model must be less than 50 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  
  serial: z
    .string()
    .max(50, 'Serial number must be less than 50 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  
  category: z
    .string()
    .min(1, 'Category is required'),
  
  hours: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(val => {
      if (!val || val === '') return true;
      const num = parseInt(val);
      return !isNaN(num) && num >= 0 && num <= 100000;
    }, 'Hours must be a valid number between 0 and 100,000'),
  
  additional_context: z
    .string()
    .max(500, 'Additional context must be less than 500 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  
  environment: z
    .string()
    .max(300, 'Environment description must be less than 300 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  
  date_of_plan_start: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(val => {
      if (!val || val === '') return true;
      const date = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    }, 'Plan start date cannot be in the past')
});

// Login Form Schema
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters')
});

// Signup Form Schema
export const signupSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password')
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// Task Edit Form Schema
export const taskEditSchema = z.object({
  status: z
    .enum(['Scheduled', 'In Progress', 'Completed', 'Overdue'], {
      required_error: 'Status is required',
      invalid_type_error: 'Please select a valid status'
    }),
  
  technician: z
    .string()
    .min(1, 'Technician is required')
    .max(100, 'Technician name must be less than 100 characters'),
  
  date: z
    .string()
    .min(1, 'Date is required')
    .refine(val => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, 'Please enter a valid date'),
  
  time: z
    .string()
    .min(1, 'Time is required')
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time (HH:MM format)')
});

// Export validation messages as constants
export const VALIDATION_MESSAGES = {
  REQUIRED: 'This field is required',
  EMAIL_INVALID: 'Please enter a valid email address',
  PASSWORD_MIN: 'Password must be at least 8 characters',
  PASSWORD_COMPLEXITY: 'Password must contain uppercase, lowercase, and number',
  PASSWORDS_MATCH: 'Passwords must match',
  DATE_FUTURE: 'Date cannot be in the past',
  NAME_MIN: 'Name must be at least 3 characters',
  NAME_MAX: 'Name must be less than 100 characters'
};