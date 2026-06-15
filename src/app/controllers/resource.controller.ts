import { Request, Response, NextFunction } from 'express';
import { ResourceService } from '../services/resource.service';
export class ResourceController {
  /**
   * Creates a new shared resource.
   */
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId.toString();
      const resource = await ResourceService.createResource(req.body, orgId);
      res.status(201).json({
        status: 'success',
        message: 'Resource created successfully',
        data: { resource }
      });
    } catch (error) {
      next(error);
    }
  }
  /**
   * Lists all non-deleted resources inside the tenant organization.
   */
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId.toString();
      const resources = await ResourceService.getResources(orgId);
      res.status(200).json({
        status: 'success',
        data: { resources }
      });
    } catch (error) {
      next(error);
    }
  }
  /**
   * Retrieves details of a specific resource.
   */
  static async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId.toString();
      const resource = await ResourceService.getResourceById(req.params.id as string, orgId);
      res.status(200).json({
        status: 'success',
        data: { resource }
      });
    } catch (error) {
      next(error);
    }
  }
  /**
   * Updates details of an existing resource.
   */
  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId.toString();
      const updated = await ResourceService.updateResource(req.params.id as string, req.body, orgId);
      res.status(200).json({
        status: 'success',
        message: 'Resource updated successfully',
        data: { resource: updated }
      });
    } catch (error) {
      next(error);
    }
  }
  /**
   * Soft deletes a resource.
   */
  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId.toString();
      const result = await ResourceService.deleteResource(req.params.id as string, orgId);
      res.status(200).json({
        status: 'success',
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
}