import { z } from 'zod';
const resourceTypeEnum = z.enum(['MEETING_ROOM', 'DESK', 'DEVICE', 'OTHER']);
export const createResourceSchema = {
  body: z.object({
    name: z.string().min(1, 'Resource name is required').max(100),
    type: resourceTypeEnum,
    bufferTimeMinutes: z.number().int().min(0, 'bufferTimeMinutes cannot be negative').default(0)
  })
};
export const updateResourceSchema = {
  body: z.object({
    name: z.string().min(1, 'Resource name cannot be empty').max(100).optional(),
    type: resourceTypeEnum.optional(),
    bufferTimeMinutes: z.number().int().min(0, 'bufferTimeMinutes cannot be negative').optional()
  })
};
