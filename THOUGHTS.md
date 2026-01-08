# PulseMarket - Infrastructure Analysis & Optimization Thoughts

## Overview

**PulseMarket** (Brand: PolyMeme) is a Solana-based prediction market platform for memecoins built with Next.js 14, PostgreSQL (Neon), and real-time updates via Ably.

---

## Infrastructure Summary

| Component | Technology | Notes |
|-----------|------------|-------|
| Frontend | Next.js 14 (App Router) | SSR + Client components |
| Database | Neon (Serverless PostgreSQL) | Drizzle ORM |
| Auth | NextAuth + Solana Wallet Signing | Custom credentials provider |
| Real-time | Ably | WebSocket pub/sub |
| Deployment | Railway (primary) / Vercel (legacy) | Nixpacks builder |
| Blockchain | Solana (mainnet-beta) | Helius RPC |
| External APIs | CoinMarketCap, DexScreener, SolanaTracker | Token data |

---

## Optimization Opportunities

### 1. Database Performance

**Current Issues:**
- No visible database indexes in schema beyond primary keys
- Large numeric fields using `numeric(30, 9)` - may be overkill
- No connection pooling configured explicitly

**Recommendations:**
```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_markets_status ON markets(status);
CREATE INDEX idx_markets_category ON markets(category);
CREATE INDEX idx_markets_created_by ON markets("createdBy");
CREATE INDEX idx_markets_expires_at ON markets("expiresAt") WHERE status = 'active';
CREATE INDEX idx_bets_user_id ON bets("userId");
CREATE INDEX idx_bets_market_id ON bets("marketId");
CREATE INDEX idx_transactions_user_id ON transactions("userId");
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_users_wallet ON users("walletAddress");
```

- Consider using `numeric(18, 9)` for SOL amounts (max ~18B SOL, plenty of headroom)
- Enable Neon connection pooling in dashboard if not already

---

### 2. API Route Optimization

**Current Issues:**
- No rate limiting on public endpoints
- No caching headers for static-ish data
- Some endpoints fetch more data than needed

**Recommendations:**

**Add rate limiting:**
```typescript
// lib/rateLimit.ts
import { headers } from 'next/headers';

const rateLimitMap = new Map<string, { count: number; timestamp: number }>();

export function rateLimit(limit: number, windowMs: number) {
  return (ip: string): boolean => {
    const now = Date.now();
    const record = rateLimitMap.get(ip);

    if (!record || now - record.timestamp > windowMs) {
      rateLimitMap.set(ip, { count: 1, timestamp: now });
      return true;
    }

    if (record.count >= limit) return false;
    record.count++;
    return true;
  };
}
```

**Add cache headers for market listings:**
```typescript
// app/api/markets/route.ts
return NextResponse.json(markets, {
  headers: {
    'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
  },
});
```

---

### 3. Real-time Architecture

**Current State:**
- Ably handles all real-time updates
- Publishes to individual channels per event type

**Potential Improvements:**
- Consider channel multiplexing to reduce connection overhead
- Add presence for active user counts on markets
- Implement message batching for high-frequency bet updates

```typescript
// Batch multiple updates into single publish
const pendingUpdates: MarketUpdate[] = [];
let batchTimeout: NodeJS.Timeout | null = null;

export function queueMarketUpdate(update: MarketUpdate) {
  pendingUpdates.push(update);
  if (!batchTimeout) {
    batchTimeout = setTimeout(flushUpdates, 100); // 100ms batching
  }
}
```

---

### 4. Authentication & Security

**Current Issues:**
- Treasury private key in environment variables (risky)
- No CSRF protection visible
- Session tokens could be more secure

**Recommendations:**
- Move treasury key to a secure vault (AWS Secrets Manager, Railway secrets with encryption)
- Add CSRF token validation for state-changing operations
- Consider shorter JWT expiry with refresh tokens
- Add request signing for sensitive operations

```typescript
// lib/csrf.ts
import { randomBytes } from 'crypto';

export function generateCSRFToken(): string {
  return randomBytes(32).toString('hex');
}

export function validateCSRFToken(token: string, expected: string): boolean {
  return token === expected;
}
```

---

### 5. Background Jobs

**Current State:**
- Jobs triggered via API routes (`/api/jobs/*`)
- No retry mechanism visible
- No job queue (runs inline)

**Recommendations:**
- Add proper job queue (Trigger.dev, Inngest, or BullMQ with Redis)
- Implement exponential backoff for failed jobs
- Add job monitoring and alerting

```typescript
// Using Trigger.dev (recommended for serverless)
import { client } from "@trigger.dev/sdk";

export const automatedMarketsJob = client.defineJob({
  id: "automated-markets",
  name: "Create Automated Markets",
  version: "1.0.0",
  trigger: cronTrigger({ cron: "0 */6 * * *" }), // Every 6 hours
  run: async (payload, io) => {
    // Your job logic with built-in retries
  },
});
```

---

### 6. Frontend Performance

**Current Issues:**
- 49+ shadcn components (possible bundle bloat)
- Multiple animation libraries (Framer Motion + GSAP)
- No visible lazy loading for heavy components

**Recommendations:**

**Lazy load heavy components:**
```typescript
// Lazy load charts and complex UIs
const MarketChart = dynamic(() => import('@/components/MarketChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});

const TradingWidget = dynamic(() => import('@/components/TradingWidget'), {
  ssr: false,
});
```

**Consolidate animation libraries:**
- Pick either Framer Motion OR GSAP (not both)
- Framer Motion is more React-native, GSAP is more powerful
- Reduces bundle size by ~30-50KB

**Tree-shake shadcn imports:**
```typescript
// Good - named imports
import { Button } from '@/components/ui/button';

// Avoid - barrel exports if not optimized
import { Button, Card, Dialog } from '@/components/ui';
```

---

### 7. Image Optimization

**Current State:**
- Images stored locally in `attached_assets/`
- Manual image cleanup job
- Sharp for processing

**Recommendations:**
- Move to cloud storage (Cloudflare R2, AWS S3, or Supabase Storage)
- Use Cloudflare Images or Imgix for on-the-fly transformations
- Implement proper CDN caching

```typescript
// next.config.mjs - add CDN domain
images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'cdn.pulsemarket.fun' },
  ],
},
```

---

### 8. Error Handling & Monitoring

**Current Issues:**
- Basic ErrorBoundary present
- No centralized error tracking visible

**Recommendations:**
- Add Sentry or LogRocket for error tracking
- Implement structured logging
- Add health check endpoints

```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    ably: await checkAbly(),
    solana: await checkSolanaRPC(),
  };

  const healthy = Object.values(checks).every(Boolean);

  return NextResponse.json(
    { status: healthy ? 'healthy' : 'degraded', checks },
    { status: healthy ? 200 : 503 }
  );
}
```

---

### 9. Code Organization

**Current Structure - Good:**
- Clear separation: `/app`, `/lib`, `/server`, `/shared`
- Shared schema in `/shared/schema.ts`
- Path aliases configured

**Improvements:**
- Split large schema.ts (1000+ lines) into domain modules
- Add barrel exports for cleaner imports
- Consider co-locating API route handlers with their logic

```
/shared
  /schema
    index.ts      # Re-exports all
    users.ts
    markets.ts
    bets.ts
    transactions.ts
```

---

### 10. Testing

**Current State:**
- Test scripts exist (`/scripts/test-*.ts`)
- No unit test framework visible
- Integration tests for automated markets

**Recommendations:**
- Add Vitest for unit/integration tests
- Add Playwright for E2E tests
- Test critical paths: auth, betting, payouts

```json
// package.json
{
  "scripts": {
    "test": "vitest",
    "test:e2e": "playwright test"
  }
}
```

---

## Priority Matrix

| Priority | Optimization | Impact | Effort |
|----------|--------------|--------|--------|
| **P0** | Database indexes | High | Low |
| **P0** | Rate limiting | High | Low |
| **P1** | Move treasury key to vault | High | Medium |
| **P1** | Add error monitoring (Sentry) | High | Low |
| **P1** | Proper job queue | Medium | Medium |
| **P2** | Cloud image storage | Medium | Medium |
| **P2** | Bundle optimization | Medium | Medium |
| **P2** | Health check endpoints | Low | Low |
| **P3** | Consolidate animation libs | Low | Medium |
| **P3** | Schema file splitting | Low | Low |

---

## Quick Wins (Do Today)

1. **Add database indexes** - Single migration, major query speedup
2. **Add cache headers** - Few lines per route, reduces DB load
3. **Add rate limiting** - Prevent abuse, ~50 lines of code
4. **Set up Sentry** - `npm install @sentry/nextjs`, 10 min setup

---

## Architecture Diagram

```
                                    ┌─────────────────┐
                                    │   Cloudflare    │
                                    │   (CDN/WAF)     │
                                    └────────┬────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
                    ▼                        ▼                        ▼
            ┌───────────────┐      ┌─────────────────┐      ┌─────────────────┐
            │  Next.js App  │      │   Ably Server   │      │  Solana RPC     │
            │   (Railway)   │◄────►│   (Real-time)   │      │   (Helius)      │
            └───────┬───────┘      └─────────────────┘      └────────┬────────┘
                    │                                                 │
                    │                                                 │
                    ▼                                                 ▼
            ┌───────────────┐                               ┌─────────────────┐
            │  Neon (PG)    │                               │  Solana Chain   │
            │   Database    │                               │   (Mainnet)     │
            └───────────────┘                               └─────────────────┘
                    │
                    ▼
            ┌───────────────┐
            │ External APIs │
            │ CMC/DexScreen │
            └───────────────┘
```

---

## Notes

- The codebase is well-structured for a prediction market platform
- Main concerns are around scalability (no caching layer, job queue)
- Security around treasury key handling should be addressed
- Consider adding Redis for caching hot data (market prices, user balances)

---

*Generated: 2026-01-07*
