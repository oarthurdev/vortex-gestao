# Real Estate Management System (imoGestão Style)

## Overview

This is a comprehensive real estate and construction management system inspired by imoGestão. The application provides complete control over properties, clients, contracts, rentals, sales, and construction projects for real estate companies and developers. Built as a multi-tenant platform, each company operates in its own isolated environment with secure authentication and role-based access control.

The system features a modern React frontend with TypeScript, a Node.js/Express backend, and PostgreSQL database with real-time capabilities through WebSocket connections. It includes modules for property management, client CRM, contract handling, financial controls, construction project management, and comprehensive reporting.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development
- **Styling**: TailwindCSS with custom design system using CSS variables for theming
- **UI Components**: Radix UI primitives with shadcn/ui component library for consistent, accessible interface
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Theme System**: Custom light/dark theme provider with system preference detection

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules for modern JavaScript features
- **Authentication**: Passport.js with local strategy and session-based auth
- **Session Storage**: Express sessions with PostgreSQL store for persistence
- **Password Security**: Node.js crypto module with scrypt for secure password hashing
- **Real-time Communication**: WebSocket server for live notifications and updates
- **API Design**: RESTful endpoints with proper HTTP status codes and error handling

### Database Architecture
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle migrations with shared schema definitions
- **Multi-tenancy**: Company-based data isolation using companyId foreign keys
- **Data Validation**: Drizzle-Zod integration for runtime schema validation
- **Connection**: Neon Database serverless PostgreSQL for scalable hosting

### Security & Authentication
- **Multi-tenant Isolation**: All data operations filtered by company ID
- **Session Management**: Secure session storage with configurable secrets
- **Password Hashing**: Cryptographically secure password storage using scrypt
- **Route Protection**: Authentication middleware for protected endpoints
- **CSRF Protection**: Session-based authentication reduces CSRF attack surface

### Development Architecture
- **Build System**: Vite for fast development and optimized production builds
- **TypeScript Configuration**: Strict type checking with path aliases for clean imports
- **Code Quality**: ESLint rules and type checking for maintainable code
- **Development Tools**: Hot module replacement and runtime error overlay for DX

### Real-time Features
- **WebSocket Integration**: Live notifications for property updates, new leads, contract changes
- **Activity Logging**: Comprehensive audit trail for all system operations
- **Push Notifications**: Real-time alerts for important business events
- **Live Dashboard**: KPI updates and activity feeds without page refresh

### Module Structure
- **Property Management**: Complete property lifecycle from listing to sale/rental
- **Client CRM**: Lead management, client profiles, and communication tracking
- **Contract System**: Rental and sales contract management with automated workflows
- **Financial Controls**: Accounts payable/receivable, commission tracking, payment processing
- **Construction Management**: Project tracking, supplier management, progress monitoring
- **Reporting & Analytics**: Business intelligence with KPI dashboards and custom reports

## External Dependencies

### Core Database
- **Neon Database**: Serverless PostgreSQL hosting with built-in connection pooling
- **Drizzle ORM**: Modern TypeSQL ORM with excellent TypeScript integration
- **connect-pg-simple**: PostgreSQL session store for Express sessions

### UI and Styling
- **Radix UI**: Unstyled, accessible UI primitives for consistent component behavior
- **TailwindCSS**: Utility-first CSS framework with custom design tokens
- **Lucide React**: Modern icon library with tree-shaking support
- **class-variance-authority**: Type-safe variant management for component styling

### Development and Build Tools
- **Vite**: Fast build tool with native ES modules and hot reload
- **TypeScript**: Static type checking for enhanced developer experience
- **React**: Modern frontend framework with hooks and concurrent features
- **Wouter**: Lightweight routing library for single-page application navigation

### Data Management
- **TanStack Query**: Powerful data synchronization for server state management
- **React Hook Form**: Performant forms with minimal re-renders
- **Zod**: Runtime type validation and schema parsing
- **date-fns**: Modern date utility library with localization support

### Authentication and Security
- **Passport.js**: Flexible authentication middleware with strategy pattern
- **Express Session**: Session management with configurable storage backends
- **Node.js Crypto**: Built-in cryptographic functions for secure password handling

### Future Integration Points
- **Payment Processing**: Structured for integration with Brazilian payment gateways (Gerencianet, Pagar.me)
- **Geolocation Services**: Architecture supports Google Maps API integration for property mapping
- **Communication APIs**: Framework ready for WhatsApp Business API integration
- **Document Generation**: System prepared for PDF contract generation and digital signatures