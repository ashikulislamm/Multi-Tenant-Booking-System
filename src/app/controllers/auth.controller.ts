import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
export class AuthController {
  /**
   * Endpoint to set up a new Organization and its ORG_ADMIN user.
   */
  static async setup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.setupOrganization(req.body);
      res.status(201).json({
        status: 'success',
        message: 'Organization and administrator account created successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
  /**
   * Endpoint for ORG_ADMIN to register an EMPLOYEE within their organization.
   */
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminOrgId = req.user!.organizationId.toString();
      const employee = await AuthService.registerEmployee(req.body, adminOrgId);
      res.status(201).json({
        status: 'success',
        message: 'Employee registered successfully',
        data: { employee }
      });
    } catch (error) {
      next(error);
    }
  }
  /**
   * Endpoint for user login.
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.login(req.body);
      res.status(200).json({
        status: 'success',
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
  /**
   * Endpoint to fetch current authenticated user profile.
   */
  static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      res.status(200).json({
        status: 'success',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId,
            isActive: user.isActive
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
}