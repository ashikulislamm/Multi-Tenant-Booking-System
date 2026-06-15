import { Resource } from '../models/resource.model';
import { Organization } from '../models/organization.model';
import { Booking } from '../models/booking.model';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';
import { DateTime } from 'luxon';
export interface IAvailabilitySlot {
  startTime: string; // UTC ISO string
  endTime: string; // UTC ISO string
  localStartTime: string; // ISO string with organization timezone offset
  localEndTime: string; // ISO string with organization timezone offset
}
export class AvailabilityService {
  /**
   * Dynamically calculates available booking slots for a resource on a specific date.
   */
  static async getResourceAvailability(
    resourceId: string,
    dateStr: string, // format: YYYY-MM-DD
    durationMinutes: number,
    slotStepMinutes: number,
    organizationId: string
  ): Promise<IAvailabilitySlot[]> {
    // 1. Verify organization is active
    const org = await Organization.findById(organizationId);
    if (!org) {
      throw new NotFoundError('Organization not found');
    }
    if (!org.isActive) {
      throw new ForbiddenError('Organization is deactivated');
    }
    // 2. Verify resource exists, is active, and belongs to org
    const resource = await Resource.findOne({
      _id: resourceId,
      organizationId,
      isDeleted: false
    });
    if (!resource) {
      throw new NotFoundError('Resource not found in your organization');
    }
    const tz = org.timezone;
    // 3. Parse target date in organization local timezone
    const localDate = DateTime.fromISO(dateStr, { zone: tz }).startOf('day');
    if (!localDate.isValid) {
      throw new BadRequestError('Invalid date format. Expected YYYY-MM-DD');
    }
    // 4. Verify booking window policy (future booking limits)
    const localNow = DateTime.now().setZone(tz);
    const localToday = localNow.startOf('day');
    const maxAllowedDate = localToday.plus({ days: org.bookingPolicy.maxFutureDays });
    // If date is in the past or beyond the booking limit, return empty slots
    if (localDate < localToday || localDate > maxAllowedDate) {
      return [];
    }
    // 5. Determine working hours for this weekday
    const weekday = localDate.weekday; // 1 = Monday, 7 = Sunday
    const workingHour = org.bookingPolicy.workingHours.find(wh => wh.dayOfWeek === weekday);
    if (!workingHour) {
      // Resource is not available (working hours not defined for this day)
      return [];
    }
    const [startHour, startMin] = workingHour.startTime.split(':').map(Number);
    const [endHour, endMin] = workingHour.endTime.split(':').map(Number);
    const workStart = localDate.set({ hour: startHour, minute: startMin, second: 0, millisecond: 0 });
    const workEnd = localDate.set({ hour: endHour, minute: endMin, second: 0, millisecond: 0 });
    // 6. Fetch existing confirmed bookings that could overlap or affect working hours due to buffer
    const buffer = resource.bufferTimeMinutes;
    const bufferMs = buffer * 60 * 1000;
    const queryStart = new Date(workStart.toJSDate().getTime() - bufferMs);
    const queryEnd = new Date(workEnd.toJSDate().getTime() + bufferMs);
    const bookings = await Booking.find({
      resourceId,
      organizationId,
      status: 'CONFIRMED',
      startTime: { $lt: queryEnd },
      endTime: { $gt: queryStart }
    }).sort({ startTime: 1 });
    // 7. Generate candidate slots inside working hours and filter out conflicts
    const slots: IAvailabilitySlot[] = [];
    let currentStart = workStart;
    while (currentStart.plus({ minutes: durationMinutes }) <= workEnd) {
      const currentEnd = currentStart.plus({ minutes: durationMinutes });
      // Ensure slot does not start in the past
      if (currentStart >= localNow) {
        let hasConflict = false;
        // Check against every booking to see if it violates booking interval or buffer time
        for (const booking of bookings) {
          const bStart = DateTime.fromJSDate(booking.startTime).setZone(tz);
          const bEnd = DateTime.fromJSDate(booking.endTime).setZone(tz);
          const bStartWithBuffer = bStart.minus({ minutes: buffer });
          const bEndWithBuffer = bEnd.plus({ minutes: buffer });
          // Intersection checking:
          // Slot [S, E] conflicts with Booking-with-buffer [S_b, E_b] if:
          // S < E_b AND E > S_b
          if (currentStart < bEndWithBuffer && currentEnd > bStartWithBuffer) {
            hasConflict = true;
            break;
          }
        }
        if (!hasConflict) {
          slots.push({
            startTime: currentStart.toUTC().toISO() || '',
            endTime: currentEnd.toUTC().toISO() || '',
            localStartTime: currentStart.toFormat("yyyy-MM-dd'T'HH:mm:ssZZ"),
            localEndTime: currentEnd.toFormat("yyyy-MM-dd'T'HH:mm:ssZZ")
          });
        }
      }
      // Step forward
      currentStart = currentStart.plus({ minutes: slotStepMinutes });
    }
    return slots;
  }
}