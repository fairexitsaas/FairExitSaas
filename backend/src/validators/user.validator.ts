import { z } from 'zod'

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').optional(),
  avatarUrl: z.string().trim().url('Avatar URL must be a valid URL').optional().or(z.literal('')),
  phone: z.string().trim().optional(),
  country: z.enum(['CA', 'US']).optional(),
  preferences: z.record(z.unknown()).optional(),
})

export const updateEmailSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  emailRedirectTo: z.string().optional(),
})

