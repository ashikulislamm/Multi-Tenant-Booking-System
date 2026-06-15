import AsyncLock from 'async-lock';
import { Booking, IBooking } from '../models/booking.model';
import { Resource } from '../models/resource.model';
import { Organization } from '../models/organization.model';
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from '../utils/errors';
import { DateTime } from 'luxon';
const lock = new AsyncLock();
export class BookingService {
  /**
   * Creates a booking after verifying timezone, working hours, booking window, and resource buffers.
   * Uses async-lock to serialize booking creations for the same resource to prevent race conditions.
   */
  static async createBooking(data: {
    resourceId: string;
    userId: string;
    startTime: string; // UTC ISO string
    endTime: string; // UTC ISO string
  }, organizationId: string): Promise<IBooking> {
    const resourceKey = `resource-${data.resourceId}`;
    return lock.acquire(resourceKey, async () => {
      // 1. Verify organization is active
      const org = await Organization.findById(organizationId);
      if (!org) {
        throw new NotFoundError('Organization not found');
      }
      if (!org.isActive) {
        throw new ForbiddenError('Organization is deactivated');
      }
      // 2. Verify resource exists, belongs to org, and is not deleted
      const resource = await Resource.findOne({
        _id: data.resourceId,
        organizationId,
        isDeleted: false
      });
      if (!resource) {
        throw new NotFoundError('Resource not found in your organization');
      }
      const start = new Date(data.startTime);
      const end = new Date(data.endTime);
      // 3. Verify booking duration is positive
      const durationMs = end.getTime() - start.getTime();
      if (durationMs <= 0) {
        throw new BadRequestError('Booking end time must be after the start time');
      }
      // 4. Convert UTC bounds to Organization local timezone
      const tz = org.timezone;
      const localStart = DateTime.fromJSDate(start).setZone(tz);
      const localEnd = DateTime.fromJSDate(end).setZone(tz);
      const localNow = DateTime.now().setZone(tz);
      // 5. Check if starting in the past
      if (localStart < localNow) {
        throw new BadRequestError('Bookings cannot be scheduled in the past');
      }
      // 6. Check booking window limits (maxFutureDays)
      const localToday = localNow.startOf('day');
      const maxAllowedDate = localToday.plus({ days: org.bookingPolicy.maxFutureDays });
      if (localStart.startOf('day') > maxAllowedDate) {
        throw new BadRequestError(
          `Bookings can only be made up to ${org.bookingPolicy.maxFutureDays} days in advance (no later than ${maxAllowedDate.toFormat('yyyy-MM-dd')})`
        );
      }
      // 7. Check organization working hours
      const weekday = localStart.weekday; // 1 = Mon, 7 = Sun
      const workingHour = org.bookingPolicy.workingHours.find(wh => wh.dayOfWeek === weekday);
      if (!workingHour) {
        throw new BadRequestError(`No working hours defined for ${localStart.weekdayLong}. Resource is unavailable.`);
      }
      const [startHour, startMin] = workingHour.startTime.split(':').map(Number);
      const [endHour, endMin] = workingHour.endTime.split(':').map(Number);
      const workStart = localStart.set({ hour: startHour, minute: startMin, second: 0, millisecond: 0 });
      const workEnd = localStart.set({ hour: endHour, minute: endMin, second: 0, millisecond: 0 });
      if (localStart < workStart || localEnd > workEnd) {
        throw new BadRequestError(
          `Booking must fit entirely within working hours (${workingHour.startTime} - ${workingHour.endTime} ${tz})`
        );
      }
      // 8. Prevent overlap and respect buffer times
      // New booking [S_new, E_new] on resource with buffer B conflicts if:
      // S_exist < E_new + B AND E_exist > S_new - B
      const bufferMs = resource.bufferTimeMinutes * 60 * 1000;
      const searchStart = new Date(start.getTime() - bufferMs);
      const searchEnd = new Date(end.getTime() + bufferMs);
      const conflictingBooking = await Booking.findOne({
        resourceId: data.resourceId,
        organizationId,
        status: 'CONFIRMED',
        startTime: { $lt: searchEnd },
        endTime: { $gt: searchStart }
      });
      if (conflictingBooking) {
        throw new ConflictError(
          `The resource is already booked or is in its buffer cooling time during the requested window`
        );
      }
      // 9. Insert Booking
      const booking = new Booking({
        resourceId: data.resourceId,
        userId: data.userId,
        organizationId,
        startTime: start,
        endTime: end,
        status: 'CONFIRMED'
      });
      return booking.save();
    });
  }
  /**
   * Retrieves bookings for the organization.
   * Employees can view all bookings, but we support filtering.
   */
  static async getBookings(filters: {
    resourceId?: string;
    userId?: string;
    startTime?: string;
    endTime?: string;
  }, organizationId: string): Promise<IBooking[]> {
    const query: any = { organizationId };
    if (filters.resourceId) {
      query.resourceId = filters.resourceId;
    }
    if (filters.userId) {
      query.userId = filters.userId;
    }
    if (filters.startTime || filters.endTime) {
      query.status = 'CONFIRMED'; // Only filter times for active bookings
      const timeQuery: any = {};
      if (filters.startTime) {
        timeQuery.$gte = new Date(filters.startTime);
      }
      if (filters.endTime) {
        timeQuery.$lte = new Date(filters.endTime);
      }
      query.startTime = timeQuery;
    }
    return Booking.find(query).populate('resourceId', 'name type').populate('userId', 'name email').sort({ startTime: 1 });
  }
  /**
   * Retrieves a single booking details, enforcing organization isolation.
   */
  static async getBookingById(id: string, organizationId: string): Promise<IBooking> {
    const booking = await Booking.findOne({ _id: id, organizationId }).populate('resourceId', 'name type').populate('userId', 'name email');
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }
    return booking;
  }
  /**
   * Cancels a booking, verifying permissions and organization ownership.
   */
  static async cancelBooking(
    id: string,
    userId: string,
    userRole: string,
    organizationId: string
  ): Promise<IBooking> {
    const booking = await Booking.findOne({ _id: id, organizationId });
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }
    if (booking.status === 'CANCELLED') {
      throw new BadRequestError('Booking is already cancelled');
    }
    // Role-based auth check: employees can only cancel their own bookings
    if (userRole === 'EMPLOYEE' && booking.userId.toString() !== userId) {
      throw new ForbiddenError('You do not have permission to cancel other users\' bookings');
    }
    booking.status = 'CANCELLED';
    return booking.save();
  }
}