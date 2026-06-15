import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Organization, IWorkingHour } from '../models/organization.model';
import { User, IUser } from '../models/user.model';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../utils/errors';
export class AuthService {
  /**
   * Performs bootstrap setup: registers a new Organization and its ORG_ADMIN user.
   */
  static async setupOrganization(data: any): Promise<{ organization: any; user: any; token: string }> {
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new BadRequestError('User email is already registered');
    }
    // Default working hours: Monday (1) to Friday (5), 09:00 to 17:00
    const defaultWorkingHours: IWorkingHour[] = [];
    for (let day = 1; day <= 5; day++) {
      defaultWorkingHours.push({
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '17:00'
      });
    }
    // Create Organization
    const organization = new Organization({
      name: data.orgName,
      timezone: data.timezone,
      isActive: true,
      bookingPolicy: {
        workingHours: defaultWorkingHours,
        maxFutureDays: 30 // 30 days default booking limit
      }
    });
    const savedOrg = await organization.save();
    // Create Admin User
    const user = new User({
      name: data.adminName,
      email: data.email,
      password: data.password,
      role: 'ORG_ADMIN',
      organizationId: savedOrg._id,
      isActive: true
    });
    const savedUser = await user.save();
    const token = this.generateToken(savedUser);
    return {
      organization: {
        id: savedOrg._id,
        name: savedOrg.name,
        timezone: savedOrg.timezone,
        isActive: savedOrg.isActive,
        bookingPolicy: savedOrg.bookingPolicy
      },
      user: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
        organizationId: savedUser.organizationId
      },
      token
    };
  }
  /**
   * Registers a new EMPLOYEE for a specific organization.
   */
  static async registerEmployee(data: any, adminOrgId: string): Promise<any> {
    // Tenant isolation check: admin must only register user for their own organization
    if (data.organizationId !== adminOrgId) {
      throw new BadRequestError('Cannot register an employee for a different organization');
    }
    const org = await Organization.findById(data.organizationId);
    if (!org || !org.isActive) {
      throw new NotFoundError('Organization not found or is inactive');
    }
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new BadRequestError('Email already registered');
    }
    const user = new User({
      name: data.name,
      email: data.email,
      password: data.password,
      role: 'EMPLOYEE',
      organizationId: org._id,
      isActive: true
    });
    const savedUser = await user.save();
    return {
      id: savedUser._id,
      name: savedUser.name,
      email: savedUser.email,
      role: savedUser.role,
      organizationId: savedUser.organizationId,
      isActive: savedUser.isActive
    };
  }
  /**
   * Log in user, verify password, and return JWT.
   */
  static async login(data: any): Promise<{ user: any; token: string }> {
    const user = await User.findOne({ email: data.email });
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid email or password');
    }
    // Load organization to check if it's active
    const org = await Organization.findById(user.organizationId);
    if (!org || !org.isActive) {
      throw new UnauthorizedError('Organization accounts are deactivated');
    }
    const isMatch = await user.comparePassword(data.password);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }
    const token = this.generateToken(user);
    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId
      },
      token
    };
  }
  /**
   * Generates JWT token from user object.
   */
  private static generateToken(user: IUser): string {
    return jwt.sign(
      {
        id: user._id,
        role: user.role,
        organizationId: user.organizationId
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRY as any }
    );
  }
}