import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
export type UserRole = 'ORG_ADMIN' | 'EMPLOYEE';
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  organizationId: mongoose.Types.ObjectId;
  isActive: boolean;
  comparePassword(candidate: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}
const UserSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['ORG_ADMIN', 'EMPLOYEE'], required: true },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  isActive: { type: Boolean, required: true, default: true }
}, {
  timestamps: true
});
// Pre-save hook to hash password if modified
UserSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err: any) {
    next(err);
  }
});
// Instance method to compare password
UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};
export const User = mongoose.model<IUser>('User', UserSchema);