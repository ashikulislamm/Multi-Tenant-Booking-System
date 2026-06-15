import mongoose, { Document, Schema } from 'mongoose';
export interface IWorkingHour {
  dayOfWeek: number; // 1 = Monday, 7 = Sunday
  startTime: string; // Format: "HH:mm"
  endTime: string; // Format: "HH:mm"
}
export interface IBookingPolicy {
  workingHours: IWorkingHour[];
  maxFutureDays: number; // How far in advance bookings are permitted
}
export interface IOrganization extends Document {
  name: string;
  timezone: string; // Valid IANA timezone e.g. "America/New_York"
  isActive: boolean;
  bookingPolicy: IBookingPolicy;
  createdAt: Date;
  updatedAt: Date;
}
const WorkingHourSchema = new Schema<IWorkingHour>({
  dayOfWeek: { type: Number, required: true, min: 1, max: 7 },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true }
}, { _id: false });
const BookingPolicySchema = new Schema<IBookingPolicy>({
  workingHours: { type: [WorkingHourSchema], required: true },
  maxFutureDays: { type: Number, required: true, default: 30 }
}, { _id: false });
const OrganizationSchema = new Schema<IOrganization>({
  name: { type: String, required: true, trim: true },
  timezone: { type: String, required: true, default: 'UTC' },
  isActive: { type: Boolean, required: true, default: true },
  bookingPolicy: { type: BookingPolicySchema, required: true }
}, {
  timestamps: true
});
export const Organization = mongoose.model<IOrganization>('Organization', OrganizationSchema);