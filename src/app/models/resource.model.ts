import mongoose, { Document, Schema } from 'mongoose';
export type ResourceType = 'MEETING_ROOM' | 'DESK' | 'DEVICE' | 'OTHER';
export interface IResource extends Document {
  name: string;
  type: ResourceType;
  organizationId: mongoose.Types.ObjectId;
  bufferTimeMinutes: number; // Cooling time required before/after bookings
  isDeleted: boolean; // Soft delete flag
  createdAt: Date;
  updatedAt: Date;
}
const ResourceSchema = new Schema<IResource>({
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['MEETING_ROOM', 'DESK', 'DEVICE', 'OTHER'], required: true },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  bufferTimeMinutes: { type: Number, required: true, default: 0, min: 0 },
  isDeleted: { type: Boolean, required: true, default: false }
}, {
  timestamps: true
});
// Partial unique index: name must be unique within an organization only if not deleted
ResourceSchema.index(
  { organizationId: 1, name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);
export const Resource = mongoose.model<IResource>('Resource', ResourceSchema);