
import { z } from 'zod';

// User validation schemas
export const signupSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  email: z.string()
    .email('Invalid email format')
    .max(100, 'Email must be less than 100 characters')
    .toLowerCase()
    .transform(email => email.trim()),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  organization: z.string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_.,()&]+$/, 'Organization name contains invalid characters'),
  organizationId: z.string().cuid('Invalid organization ID').optional(),
});

export const signinSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(100, 'Email must be less than 100 characters')
    .toLowerCase()
    .transform(email => email.trim()),
  password: z.string()
    .min(1, 'Password is required')
    .max(128, 'Password must be less than 128 characters'),
  twoFactorCode: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(100, 'Email must be less than 100 characters')
    .toLowerCase()
    .transform(email => email.trim()),
});

export const resetPasswordSchema = z.object({
  token: z.string()
    .min(1, 'Reset token is required')
    .max(255, 'Invalid token format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string()
    .min(1, 'Current password is required')
    .max(128, 'Password must be less than 128 characters'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
});

// Threat model validation schemas
export const threatModelSchema = z.object({
  name: z.string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_.,()]+$/, 'Name contains invalid characters'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  prompt: z.string()
    .min(10, 'Prompt must be at least 10 characters')
    .max(10000, 'Prompt must be less than 10,000 characters'),
});

export const updateThreatModelSchema = threatModelSchema.partial().extend({
  id: z.string().cuid('Invalid threat model ID'),
});

// Finding validation schemas
export const findingSchema = z.object({
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be less than 200 characters')
    .regex(/^[a-zA-Z0-9\s\-_.,()]+$/, 'Title contains invalid characters'),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must be less than 5,000 characters'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  strideCategory: z.enum(['SPOOFING', 'TAMPERING', 'REPUDIATION', 'INFORMATION_DISCLOSURE', 'DENIAL_OF_SERVICE', 'ELEVATION_OF_PRIVILEGE']),
  recommendation: z.string()
    .max(2000, 'Recommendation must be less than 2,000 characters')
    .optional(),
  comments: z.string()
    .max(1000, 'Comments must be less than 1,000 characters')
    .optional(),
  threatModelId: z.string().cuid('Invalid threat model ID'),
});

export const updateFindingSchema = findingSchema.partial().extend({
  id: z.string().cuid('Invalid finding ID'),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']).optional(),
});

// Organization validation schemas
export const organizationSchema = z.object({
  name: z.string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_.,()&]+$/, 'Organization name contains invalid characters'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
});

export const updateOrganizationSchema = organizationSchema.partial().extend({
  id: z.string().cuid('Invalid organization ID'),
});

// User management validation schemas
export const updateUserSchema = z.object({
  id: z.string().cuid('Invalid user ID'),
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
    .optional(),
  email: z.string()
    .email('Invalid email format')
    .max(100, 'Email must be less than 100 characters')
    .toLowerCase()
    .transform(email => email.trim())
    .optional(),
  role: z.enum(['USER', 'ADMIN', 'BUSINESS_ADMIN', 'BUSINESS_USER']).optional(),
  organizationId: z.string().cuid('Invalid organization ID').optional(),
});

// File upload validation schemas
export const fileUploadSchema = z.object({
  filename: z.string()
    .min(1, 'Filename is required')
    .max(255, 'Filename must be less than 255 characters')
    .regex(/^[a-zA-Z0-9\s\-_.,()]+\.[a-zA-Z0-9]+$/, 'Invalid filename format'),
  fileSize: z.number()
    .min(1, 'File size must be greater than 0')
    .max(50 * 1024 * 1024, 'File size must be less than 50MB'), // 50MB limit
  mimeType: z.string()
    .regex(/^[a-zA-Z0-9]+\/[a-zA-Z0-9\-+.]+$/, 'Invalid MIME type'),
});

// API Key validation schemas
export const apiKeySchema = z.object({
  name: z.string()
    .min(3, 'API key name must be at least 3 characters')
    .max(100, 'API key name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'API key name contains invalid characters'),
  scopes: z.array(z.string())
    .min(1, 'At least one scope is required')
    .max(10, 'Maximum 10 scopes allowed'),
  expiresAt: z.string()
    .datetime('Invalid expiration date format')
    .optional(),
});

// Search and pagination schemas
export const searchSchema = z.object({
  query: z.string()
    .max(100, 'Search query must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_.,()]*$/, 'Search query contains invalid characters')
    .optional(),
  page: z.coerce.number()
    .min(1, 'Page must be at least 1')
    .max(1000, 'Page must be less than 1000')
    .default(1),
  limit: z.coerce.number()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must be less than 100')
    .default(20),
  sortBy: z.string()
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'Invalid sort field')
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Common parameter schemas
export const idParamSchema = z.object({
  id: z.string().cuid('Invalid ID format'),
});

export const optionalIdParamSchema = z.object({
  id: z.string().cuid('Invalid ID format').optional(),
});

// Two-factor authentication schemas
export const twoFactorSetupSchema = z.object({
  code: z.string()
    .length(6, '2FA code must be 6 digits')
    .regex(/^\d{6}$/, '2FA code must contain only numbers'),
});

export const twoFactorVerifySchema = z.object({
  code: z.string()
    .length(6, '2FA code must be 6 digits')
    .regex(/^\d{6}$/, '2FA code must contain only numbers'),
});

// Security settings schemas
export const securitySettingsSchema = z.object({
  sessionTimeoutMinutes: z.number()
    .min(5, 'Session timeout must be at least 5 minutes')
    .max(480, 'Session timeout must be less than 8 hours'),
  maxFailedLogins: z.number()
    .min(3, 'Max failed logins must be at least 3')
    .max(10, 'Max failed logins must be less than 10'),
  lockoutDurationMinutes: z.number()
    .min(5, 'Lockout duration must be at least 5 minutes')
    .max(1440, 'Lockout duration must be less than 24 hours'),
  requireTwoFactor: z.boolean(),
  allowSso: z.boolean(),
});

// Demo request schema
export const demoRequestSchema = z.object({
  firstName: z.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes'),
  lastName: z.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),
  email: z.string()
    .email('Invalid email format')
    .max(100, 'Email must be less than 100 characters')
    .toLowerCase()
    .transform(email => email.trim()),
  company: z.string()
    .min(2, 'Company name must be at least 2 characters')
    .max(100, 'Company name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_.,()&]+$/, 'Company name contains invalid characters'),
  phone: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number must be less than 20 characters')
    .regex(/^[\d\s\-\+\(\)]+$/, 'Phone number contains invalid characters'),
  country: z.string()
    .min(2, 'Country must be at least 2 characters')
    .max(50, 'Country must be less than 50 characters')
    .regex(/^[a-zA-Z\s\-]+$/, 'Country can only contain letters, spaces, and hyphens'),
  hearAboutUs: z.string()
    .max(200, 'Response must be less than 200 characters')
    .optional(),
});

// User deletion confirmation schema
export const userDeletionSchema = z.object({
  userId: z.string().cuid('Invalid user ID'),
  confirmPassword: z.string()
    .min(1, 'Password confirmation is required'),
  confirmationText: z.string()
    .refine((val) => val === 'DELETE', {
      message: 'Please type DELETE to confirm',
    }),
});
