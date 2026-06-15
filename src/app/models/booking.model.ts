import mongoose, { Document, Schema } from 'mongoose';
export type BookingStatus = 'CONFIRMED' | 'CANCELLED';
export interface IBooking extends Document {
  resourceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  startTime: Date; // Stored in UTC
  endTime: Date; // Stored in UTC
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
}
const BookingSchema = new Schema<IBooking>({
  resourceId: { type: Schema.Types.ObjectId, ref: 'Resource', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  status: { type: String, enum: ['CONFIRMED', 'CANCELLED'], required: true, default: 'CONFIRMED' }
}, {
  timestamps: true
});
// Index to optimize overlap scanning and filtering bookings by resource, organization and times
BookingSchema.index({ organizationId: 1, resourceId: 1, status: 1, startTime: 1, endTime: 1 });
export const Booking = mongoose.model<IBooking>('Booking', BookingSchema);