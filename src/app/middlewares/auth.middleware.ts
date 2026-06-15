import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User, UserRole } from '../models/user.model';
import { Organization } from '../models/organization.model';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
interface JwtPayload {
  id: string;
  role: string;
  organizationId: string;
}
export const authenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Access token is missing or malformed');
    }
    const token = authHeader.split(' ')[1];
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch (err) {
      throw new UnauthorizedError('Token is invalid or expired');
    }
    // Load user and check active status
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User account is inactive or not found');
    }
    // Load organization and check active status
    const organization = await Organization.findById(user.organizationId);
    if (!organization) {
      throw new UnauthorizedError('Organization not found');
    }
    if (!organization.isActive) {
      throw new ForbiddenError('Organization account is inactive. Please contact support.');
    }
    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('User not authenticated');
      }
      if (!allowedRoles.includes(req.user.role)) {
        throw new ForbiddenError('You do not have permission to perform this action');
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};