import { z } from 'zod';
import { isValidTimezone } from '../utils/timezone';
const timeRegex = /^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/; // HH:mm format
const workingHourSchema = z.object({
  dayOfWeek: z.number().int().min(1).max(7),
  startTime: z.string().regex(timeRegex, 'Start time must be in HH:mm format (24h)'),
  endTime: z.string().regex(timeRegex, 'End time must be in HH:mm format (24h)')
}).refine(data => {
  const [startHour, startMin] = data.startTime.split(':').map(Number);
  const [endHour, endMin] = data.endTime.split(':').map(Number);
  const startVal = startHour * 60 + startMin;
  const endVal = endHour * 60 + endMin;
  return startVal < endVal;
}, {
  message: 'startTime must be strictly before endTime',
  path: ['endTime']
});
export const updateOrgSchema = {
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    timezone: z.string().refine(isValidTimezone, {
      message: 'Invalid timezone name'
    }).optional(),
    bookingPolicy: z.object({
      workingHours: z.array(workingHourSchema).min(1, 'At least one working hour configuration is required').optional(),
      maxFutureDays: z.number().int().min(1, 'maxFutureDays must be at least 1').optional()
    }).optional()
  })
};
export const toggleOrgSchema = {
  body: z.object({
    isActive: z.boolean({ required_error: 'isActive is required' })
  })
};
