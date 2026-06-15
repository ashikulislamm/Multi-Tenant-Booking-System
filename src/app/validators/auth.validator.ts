import { z } from 'zod';
import { isValidTimezone } from '../utils/timezone';
export const setupOrgSchema = {
  body: z.object({
    orgName: z.string().min(2, 'Organization name must be at least 2 characters'),
    timezone: z.string().refine(isValidTimezone, {
      message: 'Invalid timezone. Must be a valid IANA timezone name (e.g. America/New_York)'
    }),
    adminName: z.string().min(2, 'Admin name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters')
  })
};
export const registerEmployeeSchema = {
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    organizationId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid organization ID format')
  })
};
export const loginSchema = {
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required')
  })
};