# PulseMarket - Prediction Markets Platform

## Overview

PulseMarket is a fully functional prediction market application with Solana wallet-based authentication, inspired by platforms like Polymarket, Kalshi, and Robinhood. The application allows users to:
- Generate Solana wallets on-site and register accounts using wallet address + password
- Authenticate with wallet-based login and secure session management
- Browse prediction markets across categories (Crypto, Entertainment, Technology, etc.)
- View probability forecasts and market details
- Create new markets with custom questions and categories
- Place simulated bets with portfolio tracking
- Resolve markets with final outcomes
- Filter and search markets in real-time

Built as a single-page application (SPA) with PostgreSQL database persistence, it emphasizes data clarity, professional aesthetics, and trust through clean, fintech-inspired design with secure Solana wallet integration.

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
- TanStack Query (React Query) for server state management, data fetching, and cache invalidation
- Betting history tracked in browser localStorage for demo purposes
- All market data persisted in PostgreSQL database

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
- WalletGenerate: Solana wallet generation with keypair display and private key confirmation
- Register: Account creation with wallet address and password
- Login: Wallet-based authentication with session management
- MarketList: Grid display of markets with category filtering and search functionality
- MarketDetail: Individual market view with betting interface and resolution controls
- CreateMarket: Form-based market creation with validation
- Portfolio: Betting history and portfolio value summary with profit/loss tracking
- Header: Persistent navigation with brand identity, route links, and wallet address display (when authenticated)
- MarketCard: Reusable card component displaying market question, category, probability, and resolved status

### Backend Architecture

**Server Framework:**
- Express.js server with TypeScript
- Development: Vite middleware for HMR and asset serving
- Production: Static file serving with bundled server code

**API Structure:**
- RESTful API pattern with `/api` prefix for all endpoints
- **Authentication Endpoints:**
  - POST /api/auth/register - Create new user with wallet address and hashed password
  - POST /api/auth/login - Authenticate user with wallet address and password
  - POST /api/auth/logout - Destroy session and log out user
  - GET /api/auth/me - Get current authenticated user
- **Market Endpoints:**
  - GET /api/markets - Fetch all markets
  - GET /api/markets/:id - Fetch single market by ID
  - POST /api/markets - Create new market
  - POST /api/markets/:id/resolve - Resolve market with outcome (yes/no)
- Comprehensive error handling with proper HTTP status codes (400, 401, 404, 500)
- Request validation using Zod schemas
- Session-based authentication with express-session and PostgreSQL store

**Data Layer:**
- Storage interface pattern (IStorage) for abstraction and maintainability
- PostgreSQL database with Drizzle ORM
- Database connection using Neon serverless driver
- Full CRUD operations with proper error handling
- Schema migrations via `npm run db:push`

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
- Drizzle ORM schema with PostgreSQL table definitions
- **Users Model**: id (serial), walletAddress (text, unique), hashedPassword (text), createdAt (timestamp)
- **Markets Model**: id (serial), question (text), category (text), probability (integer), status (text), resolvedOutcome (text, nullable)
- Zod schemas for runtime validation and TypeScript type inference
- InsertUser type: excludes auto-generated fields (id, createdAt)
- InsertMarket type: excludes auto-generated fields (id, probability, status, resolvedOutcome)
- Type-safe database operations with full TypeScript support

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
- @solana/web3.js for Solana wallet generation and management
- buffer polyfill for browser compatibility with Solana SDK

**Backend Libraries:**
- Express.js for HTTP server
- express-session for session management
- connect-pg-simple for PostgreSQL session store
- bcrypt for password hashing (salt rounds: 10)
- Vite for development and bundling
- tsx for TypeScript execution in development

**UI Component Libraries (Radix UI):**
- Complete suite of headless UI primitives: accordion, alert-dialog, avatar, checkbox, dialog, dropdown-menu, form controls, navigation-menu, popover, select, slider, switch, tabs, toast, tooltip
- All components accessible and customizable via Tailwind

**Database Implementation:**
- Drizzle ORM with PostgreSQL via Neon serverless driver
- Database schema: shared/schema.ts with markets table
- Migrations: Use `npm run db:push` to sync schema (never manual SQL migrations)
- Connection: PostgreSQL database via DATABASE_URL environment variable
- Full persistence across page refreshes and server restarts

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

## Application Features

### Market Management
- **Browse Markets**: Grid view of all markets with responsive layout (3 → 2 → 1 columns)
- **Category Filtering**: Dynamic category buttons generated from available markets
- **Search**: Real-time search by market question with combined filter logic
- **Create Markets**: Form-based creation with validation (min 10 characters for question)
- **Market Resolution**: Resolve markets with YES/NO outcomes, updates probability to 100%/0%

### Betting System
- **Simulated Betting**: Place YES/NO bets on any market (active or resolved)
- **Bet Tracking**: LocalStorage-based bet history with market details
- **Portfolio Page**: Summary showing total bets, amount invested, portfolio value, profit/loss
- **Portfolio Calculation**: 
  - YES bets valued at: amount × (100 / probability)
  - NO bets valued at: amount × (100 / (100 - probability))
  - Probabilities clamped to 0.1-99.9% to prevent division by zero
  - Multiplier clamped to 0-100 range for stability

### Market Resolution System
- **Status Tracking**: Markets have "active" or "resolved" status
- **Resolution Controls**: Buttons to resolve markets with YES/NO outcome
- **Visual Indicators**: Resolved markets show badges (green for YES, red for NO)
- **Probability Updates**: Resolved markets show 100% (YES) or 0% (NO)
- **Database Persistence**: Resolution status persists across sessions
- **Error Handling**: Proper 404 response when resolving non-existent markets

### Authentication System
- **Solana Wallet Generation**: On-site generation of Solana Ed25519 keypairs using @solana/web3.js
  - Users receive both public key (wallet address) and private key (base58-encoded)
  - Private key displayed with warning to save securely
  - Confirmation checkbox required before proceeding to registration
- **Account Registration**: Wallet address + password authentication model
  - Wallet address serves as username (public key from generated keypair)
  - Password hashed with bcrypt (salt rounds: 10) before storage
  - Automatic login after successful registration
  - Unique wallet address constraint (one account per wallet)
- **Session Management**: Secure server-side sessions with express-session
  - Sessions stored in PostgreSQL database via connect-pg-simple
  - HttpOnly cookies for session storage
  - Automatic session persistence across page refreshes
- **Authentication Context**: React context (AuthProvider) for global auth state
  - Exposes: user, isLoading, login(), logout()
  - Fetches current user on app mount via GET /api/auth/me
  - Updates query cache after login/logout
  - Memoized context value to prevent unnecessary re-renders
- **Protected Routes**: Session-based access control
  - Header displays truncated wallet address when authenticated
  - Logout button destroys session and redirects to login page
  - All features accessible after authentication

### Data Persistence
- All market data stored in PostgreSQL database
- User accounts and sessions stored in PostgreSQL
- Real-time updates using TanStack Query cache invalidation
- Betting history persists in browser localStorage
- Automatic workflow restart after package changes

## Recent Changes (November 2, 2025)

### Completed Implementation
1. **Solana Wallet Authentication** - Complete authentication system with wallet generation, registration, and login/logout functionality
2. **Database Persistence** - Migrated from mock data to full PostgreSQL backend with Drizzle ORM
3. **Category Filtering & Search** - Added dynamic filtering and real-time search functionality
4. **Betting & Portfolio** - Implemented simulated betting system with portfolio tracking
5. **Market Resolution** - Added resolution system with database schema updates and UI controls

### Bug Fixes
- Fixed division-by-zero in portfolio calculations by clamping probabilities (0.1-99.9%)
- Fixed 404 error handling in market detail page for non-existent markets
- Fixed resolution API to return 404 instead of empty 200 for invalid market IDs
- Fixed Buffer polyfill for Solana SDK browser compatibility
- Fixed missing login function in AuthContext (critical bug preventing auto-login after registration)