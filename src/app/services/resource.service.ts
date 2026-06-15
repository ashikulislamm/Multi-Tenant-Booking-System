import { Resource } from '../models/resource.model';
import { Booking } from '../models/booking.model';
import { NotFoundError, ConflictError } from '../utils/errors';
export class ResourceService {
  /**
   * Creates a new resource inside the organization.
   */
  static async createResource(data: any, organizationId: string): Promise<any> {
    // Check if a resource with the same name already exists in this organization (and is active)
    const existing = await Resource.findOne({
      organizationId,
      name: data.name,
      isDeleted: false
    });
    if (existing) {
      throw new ConflictError(`A resource named "${data.name}" already exists in your organization`);
    }
    const resource = new Resource({
      name: data.name,
      type: data.type,
      bufferTimeMinutes: data.bufferTimeMinutes,
      organizationId,
      isDeleted: false
    });
    return resource.save();
  }
  /**
   * Retrieves all non-deleted resources belonging to the organization.
   */
  static async getResources(organizationId: string): Promise<any[]> {
    return Resource.find({ organizationId, isDeleted: false });
  }
  /**
   * Retrieves a specific resource, ensuring organization isolation.
   */
  static async getResourceById(id: string, organizationId: string): Promise<any> {
    const resource = await Resource.findOne({ _id: id, organizationId, isDeleted: false });
    if (!resource) {
      throw new NotFoundError('Resource not found');
    }
    return resource;
  }
  /**
   * Updates a resource, enforcing uniqueness and isolation.
   */
  static async updateResource(id: string, updateData: any, organizationId: string): Promise<any> {
    const resource = await Resource.findOne({ _id: id, organizationId, isDeleted: false });
    if (!resource) {
      throw new NotFoundError('Resource not found');
    }
    if (updateData.name && updateData.name !== resource.name) {
      // Check uniqueness of the new name
      const duplicate = await Resource.findOne({
        organizationId,
        name: updateData.name,
        isDeleted: false
      });
      if (duplicate) {
        throw new ConflictError(`A resource named "${updateData.name}" already exists in your organization`);
      }
      resource.name = updateData.name;
    }
    if (updateData.type !== undefined) {
      resource.type = updateData.type;
    }
    if (updateData.bufferTimeMinutes !== undefined) {
      resource.bufferTimeMinutes = updateData.bufferTimeMinutes;
    }
    return resource.save();
  }
  /**
   * Soft deletes a resource and cancels all future bookings associated with it.
   */
  static async deleteResource(id: string, organizationId: string): Promise<any> {
    const resource = await Resource.findOne({ _id: id, organizationId, isDeleted: false });
    if (!resource) {
      throw new NotFoundError('Resource not found');
    }
    resource.isDeleted = true;
    await resource.save();
    // Cancel all future confirmed bookings for this resource
    await Booking.updateMany(
      {
        resourceId: id,
        organizationId,
        status: 'CONFIRMED',
        startTime: { $gte: new Date() }
      },
      {
        $set: { status: 'CANCELLED' }
      }
    );
    return { message: 'Resource soft-deleted and future bookings cancelled' };
  }
}