# PulseMarket - Prediction Markets Platform

## Overview

PulseMarket is a prediction market application inspired by platforms like Polymarket, Kalshi, and Robinhood. The application allows users to browse prediction markets across various categories (Crypto, Entertainment, Technology), view probability forecasts, and create new markets. Built as a single-page application (SPA), it emphasizes data clarity, professional aesthetics, and trust through clean, fintech-inspired design.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Routing:**
- React-based SPA using functional components and hooks (useState, useEffect)
- Client-side routing via Wouter (lightweight React Router alternative)
- TypeScript for type safety across all components

**State Management:**
- Local component state using React hooks
- TanStack Query (React Query) for server state management and data fetching
- Mock data stored in shared schema for development/demo purposes

**UI Component System:**
- Shadcn/ui component library with Radix UI primitives
- Custom design system following "New York" style variant
- Tailwind CSS for styling with custom configuration
- Dark mode as default theme with HSL-based color system

**Design Philosophy:**
- Data-first clarity optimized for quick scanning and decision-making
- Fintech/trading platform aesthetics (inspired by Polymarket, Robinhood, Coinbase)
- Typography: Inter font family with strict hierarchy (headlines, probabilities, metadata)
- Spacing: Consistent Tailwind spacing primitives (2, 4, 6, 8, 12, 16, 20)
- Responsive grid layout: 3 columns (desktop) → 2 columns (tablet) → 1 column (mobile)

**Key Pages & Components:**
- MarketList: Grid display of all active markets with filtering/browsing
- MarketDetail: Individual market view with betting interface (mock functionality)
- CreateMarket: Form-based market creation with validation
- Header: Persistent navigation with brand identity
- MarketCard: Reusable card component displaying market question, category, and probability

### Backend Architecture

**Server Framework:**
- Express.js server with TypeScript
- Development: Vite middleware for HMR and asset serving
- Production: Static file serving with bundled server code

**API Structure:**
- RESTful API pattern with `/api` prefix for all endpoints
- Currently configured for future expansion (routes.ts placeholder)
- Request/response logging middleware for debugging

**Data Layer:**
- Storage interface pattern (IStorage) for abstraction
- In-memory storage implementation (MemStorage) for development
- Designed for future database integration via storage interface

**Build System:**
- Vite for frontend bundling and development server
- esbuild for server-side bundling
- Separate build outputs: client → dist/public, server → dist

### Form Handling & Validation

**React Hook Form Integration:**
- Form state management via react-hook-form
- Zodiac resolver (@hookform/resolvers/zod) for schema-based validation
- Shared validation schemas between client and server (insertMarketSchema)
- Custom Form components wrapping Radix UI primitives

**Validation Rules:**
- Market questions: minimum 10 characters
- Categories: required, minimum 1 character
- Probabilities: auto-generated (0-100 range)

### Type System & Shared Code

**Shared Schema (shared/schema.ts):**
- Zod schemas for runtime validation and TypeScript type inference
- Market type: id, question, category, probability
- InsertMarket type: excludes id and probability (user input only)
- Mock data exported from shared schema for consistency

**Type Safety:**
- Strict TypeScript configuration across client, server, and shared code
- Path aliases for clean imports (@, @shared, @assets)
- No emit compilation (type checking only)

## External Dependencies

### Core Dependencies

**Frontend Libraries:**
- React 18+ with TypeScript
- Wouter for routing
- TanStack Query for server state
- Shadcn/ui + Radix UI for component primitives
- Tailwind CSS for styling
- React Hook Form + Zod for forms and validation
- date-fns for date manipulation

**Backend Libraries:**
- Express.js for HTTP server
- Vite for development and bundling
- tsx for TypeScript execution in development

**UI Component Libraries (Radix UI):**
- Complete suite of headless UI primitives: accordion, alert-dialog, avatar, checkbox, dialog, dropdown-menu, form controls, navigation-menu, popover, select, slider, switch, tabs, toast, tooltip
- All components accessible and customizable via Tailwind

**Database Configuration (Prepared but Not Implemented):**
- Drizzle ORM configured for PostgreSQL
- Neon Database serverless driver (@neondatabase/serverless)
- Database schema: shared/schema.ts
- Migrations: configured to output to ./migrations directory
- Note: Database connection currently not utilized; application uses in-memory storage

**Development Tools:**
- Replit-specific plugins: runtime error overlay, cartographer, dev banner
- PostCSS with Tailwind and Autoprefixer
- ESLint and TypeScript compiler for code quality

### Design Assets & Configuration

**Fonts:**
- Google Fonts: Inter (primary), Geist Mono, Fira Code, DM Sans, Architects Daughter
- Font loading via preconnect for performance

**Theme System:**
- CSS custom properties for colors (HSL format with alpha channel support)
- Light and dark mode variants
- Border radius: custom values (9px, 6px, 3px)
- Elevation system using opacity-based overlays

**Styling Utilities:**
- clsx + tailwind-merge for className management
- class-variance-authority for component variants
- Custom utility classes: hover-elevate, active-elevate-2

### Session & State Management (Configured but Not Implemented)

**Prepared Dependencies:**
- connect-pg-simple for PostgreSQL session storage
- Session management infrastructure ready for authentication features