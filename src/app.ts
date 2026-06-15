import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './app/middlewares/error.middleware';
import { validateRequest } from './app/middlewares/validation.middleware';
import { authenticate, authorize } from './app/middlewares/auth.middleware';
import { AuthController } from './app/controllers/auth.controller';
import { OrgController } from './app/controllers/org.controller';
import { ResourceController } from './app/controllers/resource.controller';
import { BookingController } from './app/controllers/booking.controller';
import { setupOrgSchema, registerEmployeeSchema, loginSchema } from './app/validators/auth.validator';
import { updateOrgSchema, toggleOrgSchema } from './app/validators/org.validator';
import { createResourceSchema, updateResourceSchema } from './app/validators/resource.validator';
import { createBookingSchema, queryAvailabilitySchema } from './app/validators/booking.validator';
const app = express();
// Global Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
// --- API Routes ---
// 1. Authentication & Tenant Bootstrap
app.post('/api/auth/setup', validateRequest(setupOrgSchema), AuthController.setup);
app.post('/api/auth/login', validateRequest(loginSchema), AuthController.login);
app.post('/api/auth/register', authenticate, authorize('ORG_ADMIN'), validateRequest(registerEmployeeSchema), AuthController.register);
app.get('/api/auth/me', authenticate, AuthController.me);
// 2. Organization Settings Management
app.get('/api/organizations/me', authenticate, OrgController.getMyOrg);
app.put('/api/organizations/me', authenticate, authorize('ORG_ADMIN'), validateRequest(updateOrgSchema), OrgController.updateMyOrg);
app.post('/api/organizations/me/toggle', authenticate, authorize('ORG_ADMIN'), validateRequest(toggleOrgSchema), OrgController.toggleMyOrg);
// 3. Resource Management
app.post('/api/resources', authenticate, authorize('ORG_ADMIN'), validateRequest(createResourceSchema), ResourceController.create);
app.get('/api/resources', authenticate, ResourceController.list);
app.get('/api/resources/:id', authenticate, ResourceController.get);
app.put('/api/resources/:id', authenticate, authorize('ORG_ADMIN'), validateRequest(updateResourceSchema), ResourceController.update);
app.delete('/api/resources/:id', authenticate, authorize('ORG_ADMIN'), ResourceController.delete);
// 4. Booking & Availability Engine
app.post('/api/bookings', authenticate, validateRequest(createBookingSchema), BookingController.create);
app.get('/api/bookings', authenticate, BookingController.list);
app.get('/api/bookings/:id', authenticate, BookingController.get);
app.delete('/api/bookings/:id', authenticate, BookingController.cancel);
app.get('/api/resources/:id/availability', authenticate, validateRequest(queryAvailabilitySchema), BookingController.getAvailability);
// Root test route
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});
// Centralized Error Handling Middleware
app.use(errorHandler);
export default app;