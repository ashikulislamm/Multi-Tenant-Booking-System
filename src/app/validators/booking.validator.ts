import { z } from 'zod';
const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD
export const createBookingSchema = {
  body: z.object({
    resourceId: z.string().regex(objectIdRegex, 'Invalid resource ID format'),
    startTime: z.string().datetime({ message: 'startTime must be a valid ISO UTC timestamp (e.g. 2026-06-15T10:00:00.000Z)' }),
    endTime: z.string().datetime({ message: 'endTime must be a valid ISO UTC timestamp (e.g. 2026-06-15T11:00:00.000Z)' })
  }).refine(data => {
    return new Date(data.startTime) < new Date(data.endTime);
  }, {
    message: 'startTime must be strictly before endTime',
    path: ['endTime']
  })
};
export const queryAvailabilitySchema = {
  query: z.object({
    date: z.string().regex(dateRegex, 'date must be in YYYY-MM-DD format'),
    durationMinutes: z.coerce.number().int().min(1, 'durationMinutes must be at least 1').default(60),
    slotStepMinutes: z.coerce.number().int().min(1, 'slotStepMinutes must be at least 1').default(15)
  })
};