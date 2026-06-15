import { Organization } from '../models/organization.model';
import { NotFoundError } from '../utils/errors';
export class OrgService {
  /**
   * Retrieves organization details.
   */
  static async getOrgById(orgId: string): Promise<any> {
    const org = await Organization.findById(orgId);
    if (!org) {
      throw new NotFoundError('Organization not found');
    }
    return org;
  }
  /**
   * Updates organization details (name, timezone, bookingPolicy).
   */
  static async updateOrg(orgId: string, updateData: any): Promise<any> {
    const org = await Organization.findById(orgId);
    if (!org) {
      throw new NotFoundError('Organization not found');
    }
    if (updateData.name !== undefined) {
      org.name = updateData.name;
    }
    if (updateData.timezone !== undefined) {
      org.timezone = updateData.timezone;
    }
    if (updateData.bookingPolicy !== undefined) {
      org.bookingPolicy = {
        ...org.bookingPolicy,
        ...updateData.bookingPolicy
      };
    }
    return org.save();
  }
  /**
   * Toggles the active status of the organization.
   */
  static async toggleOrgActive(orgId: string, isActive: boolean): Promise<any> {
    const org = await Organization.findById(orgId);
    if (!org) {
      throw new NotFoundError('Organization not found');
    }
    org.isActive = isActive;
    return org.save();
  }
}