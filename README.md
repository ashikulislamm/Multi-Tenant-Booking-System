# Multi-Tenant Resource Booking & Availability System
A robust, production-oriented backend application built with **TypeScript**, **Node.js**, **Express.js**, **MongoDB**, **Zod**, and **Luxon**. It enables multiple organizations to manage shared resources and book them with timezone-aware logic, resource buffer considerations, and race-condition prevention.
## Technology Stack
- **TypeScript** - Type safety and autocomplete across the application.
- **Express.js** - Light and extensible routing framework.
- **MongoDB with Mongoose** - Document database model with indexing and schema validation.
- **Zod** - Runtime request payload schema validation.
- **Luxon** - Timezone-aware date and time processing.
- **Async-Lock** - Lock-based serialization of concurrent bookings to prevent double-booking.
- **Bcryptjs & JWT** - Secure password hashing and authentication with role segregation.
---
## Architectural Highlights
### 1. Multi-Tenant Isolation
- **Tenant Context Identification**: JWT tokens carry the user's `organizationId`. 
- **Scoping Controls**: Every database query affecting resources, users, or bookings filters on the tenant's `organizationId`. A user can never read, update, or book resources belonging to other organizations.
- **Active Tenancy Verification**: Authenticators verify both user status and organization status. If an organization is deactivated (`isActive = false`), all tokens are immediately rejected, blocking access.
### 2. Timezone & Scheduling Correctness
- **UTC Database Records**: All booking start and end times are normalized to UTC in MongoDB.
- **Local Policy Resolution**: Luxon parses the date (e.g. `2026-06-15`) in the tenant's timezone, reads the weekday configuration (e.g. `1` for Monday), fetches local working hour boundaries (e.g. `09:00 - 17:00 America/New_York`), and converts local boundaries to UTC dynamically before executing database calls.
- **Booking Window Checks**: Prevents bookings scheduled in the past or exceeding the organization's maximum reservation window configuration (`maxFutureDays`).
### 3. Overlap & Buffer Cooling Checks
When booking a resource with a buffer $B$ (cooling time), any new slot $[S_{new}, E_{new}]$ conflicts with an existing confirmed booking $[S_{exist}, E_{exist}]$ if:
$$S_{new} < E_{exist} + B \quad \text{AND} \quad E_{new} > S_{exist} - B$$
This logic is represented in our MongoDB query to find overlaps:
```typescript
const bufferMs = resource.bufferTimeMinutes * 60 * 1000;
const searchStart = new Date(startTime.getTime() - bufferMs);
const searchEnd = new Date(endTime.getTime() + bufferMs);
const conflictingBooking = await Booking.findOne({
  resourceId,
  organizationId,
  status: 'CONFIRMED',
  startTime: { $lt: searchEnd },
  endTime: { $gt: searchStart }
});
```
### 4. Concurrency Guard (Race-Condition Prevention)
In high-frequency environments, two requests could check for overlaps simultaneously and both proceed to write, resulting in double-bookings.
We use `async-lock` to acquire a lock keyed by resource: `resource-${resourceId}`. This guarantees that booking requests for the same asset are serialized, validating and executing in sequence.
### 5. Availability Slot Generation (Core Engine)
To dynamically calculate free blocks:
1. Resolves working hours boundaries for the requested weekday in the local zone.
2. If today, adjusts the starting point to current time to exclude historical hours.
3. Queries active bookings in the `[workStart - buffer, workEnd + buffer]` window.
4. Generates candidate slots of size `durationMinutes` starting from `workStart`, incremented by `slotStepMinutes`.
5. Filters out candidate slots that intersect with any existing booking intervals or their buffers.
---
## Directory Structure
```
multi-tenant-booking-system/
├── dist/                          # Compiled TypeScript files
├── src/
│   ├── config/
│   │   ├── db.ts                  # DB connector (dynamic in-memory fallback)
│   │   └── env.ts                 # Zod parsed environment configuration
│   ├── controllers/
│   │   ├── auth.controller.ts     # User and tenant auth router handlers
│   │   ├── org.controller.ts      # Organization settings controller
│   │   ├── resource.controller.ts  # Resource CRUD controller
│   │   └── booking.controller.ts   # Booking creations & availability queries
│   ├── middlewares/
│   │   ├── auth.middleware.ts     # Token parser and role permission checker
│   │   ├── error.middleware.ts    # Centralized custom error converter
│   │   └── validation.middleware.ts # Payload validation middleware
│   ├── models/
│   │   ├── booking.model.ts       # Booking Schema
│   │   ├── organization.model.ts  # Org & working hour policy Schema
│   │   ├── resource.model.ts      # Resource Schema (with soft delete)
│   │   └── user.model.ts          # User Schema (with bcrypt hash hook)
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── org.service.ts
│   │   ├── resource.service.ts
│   │   ├── booking.service.ts     # Concurrency-controlled booking logic
│   │   └── availability.service.ts # Core availability engine
│   ├── types/
│   │   └── express/
│   │       └── index.d.ts         # Custom property injections (req.user)
│   ├── utils/
│   │   ├── errors.ts              # Custom Error classes (400, 401, 403, 404, 409)
│   │   └── timezone.ts            # Luxon timezone parser utilities
│   ├── app.ts                     # Express setup
│   └── server.ts                  # DB boot and listening entry point
├── tests/
│   └── integration.test.ts        # 17-test suite for endpoints and constraints
├── tsconfig.json                  # Compiler options
├── jest.config.js                 # Testing framework configuration
├── .env                           # Local settings (loaded dynamically)
└── README.md
```
---
## Getting Started
### Prerequisites
- **Node.js** (v18+)
- **npm**
### Installation
1. Install all dependencies:
   ```bash
   npm install
   ```
2. Copy environment configuration:
   ```bash
   copy .env.example .env
   ```
### Running the App
Start the development server with watch mode:
```bash
npm run dev
```
> **Note**: If `MONGODB_URI` in `.env` is empty, the application will automatically spin up a dynamic `mongodb-memory-server` local instance.
### Running Tests
Run the full integration test suite covering auth, soft-delete, timezone policies, buffer cooling, and race conditions:
```bash
npm run test
```
---
## API Endpoints
### 1. Auth & Tenants
- `POST /api/auth/setup` - Bootstrap a new Organization & ORG_ADMIN.
- `POST /api/auth/login` - Authenticate user & return JWT token.
- `POST /api/auth/register` - Create an EMPLOYEE account (*Admin only*).
- `GET /api/auth/me` - Retrieve current user profile.
### 2. Organization Management
- `GET /api/organizations/me` - View own organization details.
- `PUT /api/organizations/me` - Update name, timezone, workingHours, and booking window (*Admin only*).
- `POST /api/organizations/me/toggle` - Deactivate/Activate organization (*Admin only*).
### 3. Resource Management
- `POST /api/resources` - Add a resource (*Admin only*).
- `GET /api/resources` - List active resources.
- `GET /api/resources/:id` - Get resource details.
- `PUT /api/resources/:id` - Edit resource (*Admin only*).
- `DELETE /api/resources/:id` - Soft delete resource (*Admin only*).
### 4. Bookings & Availability Engine
- `POST /api/bookings` - Reserve a resource slot.
- `GET /api/bookings` - List organization bookings with optional filters.
- `GET /api/bookings/:id` - View booking details.
- `DELETE /api/bookings/:id` - Cancel booking (*Admin or creator only*).
- `GET /api/resources/:id/availability` - Fetch dynamic free booking slots.
  - Query parameters:
    - `date`: `YYYY-MM-DD` (Required)
    - `durationMinutes`: Slot size, default `60`
    - `slotStepMinutes`: Increments for search steps, default `15`

---

## Environment Variables Configuration

The application validates the configuration at startup using a strict Zod schema. You can define the following variables in your `.env` file:

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | Number | `5000` | The port on which the Express server will listen. |
| `NODE_ENV` | String | `development` | Environment mode (`development`, `production`, `test`). |
| `MONGODB_URI` | String | *(Optional)* | Connection string for MongoDB database. If left blank, a local in-memory database will launch dynamically. |
| `JWT_SECRET` | String | `super_secret_test_key_at_least_32_characters_long` | Signature secret for JSON Web Tokens. Must be at least 32 characters long. |
| `JWT_EXPIRY` | String | `24h` | Validity duration of user authentication tokens. |

---

## License

Distributed under the MIT License. See `LICENSE` for more information.
