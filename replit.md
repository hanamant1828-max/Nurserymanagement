# Nursery Management System

## Overview

A full-stack nursery management application for tracking plant inventory, sowing lots, customer orders, and generating reports. The system allows nursery staff to manage seed categories, plant varieties, sowing lots with stock tracking, and customer order bookings with delivery scheduling.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state caching and synchronization
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom green/nature-themed color palette
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for dashboard analytics
- **Animations**: Framer Motion for page transitions

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Pattern**: REST endpoints defined in `shared/routes.ts` with type-safe route definitions
- **Authentication**: Passport.js with local strategy, session-based auth using express-session
- **Password Hashing**: Node.js crypto module with scrypt

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Session Store**: connect-pg-simple for PostgreSQL session storage
- **Schema Location**: `shared/schema.ts` contains all table definitions

### Project Structure
```
client/           # React frontend
  src/
    components/   # UI components (shadcn/ui)
    hooks/        # Custom React hooks for API calls
    pages/        # Page components
    lib/          # Utilities and query client
server/           # Express backend
  auth.ts         # Passport authentication setup
  db.ts           # Database connection
  routes.ts       # API route handlers
  storage.ts      # Data access layer
shared/           # Shared code between client/server
  schema.ts       # Drizzle database schema
  routes.ts       # API route type definitions
```

### Key Design Patterns
- **Shared Types**: Route definitions and database schemas are shared between frontend and backend
- **Storage Interface**: `IStorage` interface abstracts database operations for testability
- **Protected Routes**: React components check authentication state and redirect to login
- **API Hooks**: Each entity (categories, varieties, lots, orders) has dedicated React Query hooks

### Database Schema
- **users**: Authentication with username/password
- **categories**: Plant categories (e.g., vegetables, fruits)
- **varieties**: Plant varieties linked to categories
- **lots**: Sowing lots tracking seeds sown, damaged, and availability
- **orders**: Customer order bookings with delivery dates and status

## External Dependencies

### Database
- PostgreSQL database (connection via `DATABASE_URL` environment variable)
- Drizzle Kit for schema migrations (`npm run db:push`)

### Session Management
- `SESSION_SECRET` environment variable for session encryption

### Third-Party Services
- No external APIs currently integrated
- Report export functionality planned (CSV downloads)

### Key NPM Packages
- `drizzle-orm` / `drizzle-zod`: Database ORM and validation
- `express-session` / `connect-pg-simple`: Session management
- `passport` / `passport-local`: Authentication
- `@tanstack/react-query`: Client-side data fetching
- `recharts`: Dashboard charts
- `date-fns`: Date formatting
- `framer-motion`: Animations