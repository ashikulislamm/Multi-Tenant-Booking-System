import { Request, Response, NextFunction } from 'express';
import { BookingService } from '../services/booking.service';
import { AvailabilityService } from '../services/availability.service';
export class BookingController {
  /**
   * Endpoint to create a resource booking.
   */
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId.toString();
      const userId = req.user!._id.toString();
      const booking = await BookingService.createBooking(
        {
          resourceId: req.body.resourceId,
          userId,
          startTime: req.body.startTime,
          endTime: req.body.endTime
        },
        orgId
      );
      res.status(201).json({
        status: 'success',
        message: 'Booking confirmed successfully',
        data: { booking }
      });
    } catch (error) {
      next(error);
    }
  }
  /**
   * Endpoint to list bookings with optional query filters.
   */
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId.toString();
      const filters = {
        resourceId: req.query.resourceId as string,
        userId: req.query.userId as string,
        startTime: req.query.startTime as string,
        endTime: req.query.endTime as string
      };
      const bookings = await BookingService.getBookings(filters, orgId);
      res.status(200).json({
        status: 'success',
        data: { bookings }
      });
    } catch (error) {
      next(error);
    }
  }
  /**
   * Endpoint to retrieve details of a specific booking.
   */
  static async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId.toString();
      const booking = await BookingService.getBookingById(req.params.id as string, orgId);
      res.status(200).json({
        status: 'success',
        data: { booking }
      });
    } catch (error) {
      next(error);
    }
  }
  /**
   * Endpoint to cancel a resource booking.
   */
  static async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId.toString();
      const userId = req.user!._id.toString();
      const userRole = req.user!.role;
      const booking = await BookingService.cancelBooking(req.params.id as string, userId, userRole, orgId);
      res.status(200).json({
        status: 'success',
        message: 'Booking cancelled successfully',
        data: { booking }
      });
    } catch (error) {
      next(error);
    }
  }
  /**
   * Endpoint to calculate dynamic availability slots for a resource.
   */
  static async getAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId.toString();
      const resourceId = req.params.id as string;
      // Extract validated query params (defaults injected by validation middleware)
      const date = req.query.date as string;
      const durationMinutes = Number(req.query.durationMinutes);
      const slotStepMinutes = Number(req.query.slotStepMinutes);
      const slots = await AvailabilityService.getResourceAvailability(
        resourceId,
        date,
        durationMinutes,
        slotStepMinutes,
        orgId
      );
      res.status(200).json({
        status: 'success',
        data: {
          resourceId,
          date,
          durationMinutes,
          slotStepMinutes,
          slots
        }
      });
    } catch (error) {
      next(error);
    }
  }
}