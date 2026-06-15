import { Request, Response, NextFunction } from 'express';
import { OrgService } from '../services/org.service';
export class OrgController {
  /**
   * Retrieves organization configuration details for the user's tenant.
   */
  static async getMyOrg(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId.toString();
      const org = await OrgService.getOrgById(orgId);
      res.status(200).json({
        status: 'success',
        data: { organization: org }
      });
    } catch (error) {
      next(error);
    }
  }
  /**
   * Updates organization configuration details.
   */
  static async updateMyOrg(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId.toString();
      const updated = await OrgService.updateOrg(orgId, req.body);
      res.status(200).json({
        status: 'success',
        message: 'Organization settings updated successfully',
        data: { organization: updated }
      });
    } catch (error) {
      next(error);
    }
  }
  /**
   * Toggles the active status of the organization (e.g. deactivates the tenant).
   */
  static async toggleMyOrg(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId.toString();
      const updated = await OrgService.toggleOrgActive(orgId, req.body.isActive);
      res.status(200).json({
        status: 'success',
        message: `Organization is now ${updated.isActive ? 'active' : 'inactive'}`,
        data: { organization: updated }
      });
    } catch (error) {
      next(error);
    }
  }
}