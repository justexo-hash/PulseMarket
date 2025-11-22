# Next.js Migration Plan

This document captures the concrete steps we will follow while migrating the current Vite + Express monolith to a single Next.js App Router application that can own both UI and API responsibilities. Each phase lists the files it touches and the success criteria we will use before moving forward.

---

## Phase 0 – Foundation & Tooling

1. **Add Next.js toolchain**
   - Update the root `package.json` to include `next`, `eslint`, and the required SWC helpers.
   - Add scripts (`next:dev`, `next:build`, `next:start`) alongside the existing Express scripts so both stacks can run during the transition.
2. **Scaffold directories**
   - Create `app/`, `public/`, `next.config.mjs`, `next-env.d.ts`, and `app/globals.css`.
   - Copy styling primitives from `client/src/index.css` into `app/globals.css`.
   - Update `tailwind.config.ts` and `tsconfig.json` paths so Tailwind/TS cover the `app` tree.
3. **Global providers**
   - Add `app/layout.tsx` that wires up `<html>`, `<body>`, fonts, and shared providers (QueryClient, Wallet, Auth, Tooltip, Toaster, ErrorBoundary).
   - Until providers are ported, create placeholder shells so the layout compiles.

_Exit criteria_: `npm run next:dev` starts successfully and renders a placeholder landing page served by Next.js while the current Express server continues to run off the legacy scripts.

---

## Phase 1 – Shared Libraries & Providers

1. **Move client-side libs**
   - Relocate reusable modules from `client/src/lib` and `client/src/hooks` into `app/(lib|hooks)` (or `src/` if we decide on a `src` alias) without changing functionality.
   - Replace Vite path aliases (`@/...`) with Next-compatible TS path mapping via `tsconfig.json`.
2. **Wallet & Auth providers**
   - Recreate `WalletContextProvider` and `AuthProvider` as React context modules importable inside the Next layout.
   - Ensure anything that touches `window`/`localStorage` is marked as `"use client"`.
3. **Utility components**
   - Move shadcn components from `client/src/components/ui` to a shared `components/ui` folder imported by both pages and server components (mark as client components where hooks/events are used).

_Exit criteria_: `app/layout.tsx` renders the full provider stack, hooks compile, and Storybook/unit smoke tests (if added) work with the relocated modules.

---

## Phase 2 – Page & Route Migration

1. **Routing strategy**
   - Map every `client/src/pages/*.tsx` route to an App Router segment:
     - `/` → `app/(markets)/page.tsx`
     - `/market/[slug]` → `app/(markets)/market/[slug]/page.tsx`
     - `/portfolio`, `/deposit`, `/withdraw`, `/activity`, `/admin`, `/transparency`, `/wager/[inviteCode]`, `/about`, `/terms`, `/privacy`, etc.
2. **Shared chrome**
   - Move `Header`, `Footer`, `ErrorBoundary`, and background video logic into `app/(markets)/layout.tsx` or keep inside root layout with client components.
3. **404 / not-found**
   - Replace the Vite `NotFound` route with `app/not-found.tsx`.
4. **Static assets**
   - Copy everything from `client/public` into the root `public/` directory so `<video src="/bgvideo.mp4" />` continues to work.

_Exit criteria_: Navigating through Next pages (client-side transitions + SSR) reproduces the current SPA behavior with mocked data or existing API calls hitting the Express backend.

---

## Phase 3 – API & Server Logic Migration

1. **Route parity**
   - For each Express endpoint registered in `server/routes.ts` and submodules (`server/deposits.ts`, `server/payouts.ts`, etc.), create a matching `app/api/**/route.ts`.
   - Reuse Drizzle models from `shared/schema.ts` and helpers currently consumed in the Express handlers.
2. **Session/Auth**
   - Replace `express-session` usage (`server/index.ts`) with a Next-compatible approach:
     - Option A: `iron-session` with `app/api/auth/(login|logout|me)/route.ts`.
     - Option B: `next-auth` with credentials provider replicating the existing workflow.
   - Ensure `AuthProvider` consumes the new APIs.
3. **File uploads + multipart**
   - Recreate Multer-backed routes (if any) using Next’s `formData()` helpers or a dedicated edge-compatible upload handler.
4. **Error handling**
   - Mirror the JSON-only responses currently enforced inside Express middleware.

_Exit criteria_: All REST calls made by the React Query hooks now point to `/api/...` within Next, and end-to-end flows (login, create market, place bet) work without the Express server running.

---

## Phase 4 – Real-time & Background Jobs

1. **WebSockets / realtime**
   - Decide whether to:
     - (Preferred) Keep `server/websocket.ts` running as a lightweight Node worker launched alongside Next and communicate via Redis/DB.
     - (Alternative) Reimplement using SSE or a community WebSocket integration for Next’s Node runtime.
   - Update `useRealtime` to point at the new host/path.
2. **Cron-like workloads**
   - Move `startExpiredMarketsJob`, `solanaTracker`, payouts, etc. into standalone scripts triggered by your host (Railway cron, Vercel scheduled functions, or a background worker container).
   - Ensure shared logic (e.g., Drizzle connections) lives in a shared module imported by both Next API layers and workers.

_Exit criteria_: Real-time market updates and scheduled maintenance jobs run identically in the new architecture without the legacy Express entrypoint.

---

## Phase 5 – Cleanup & Cutover

1. Remove the `client/` directory, legacy Vite configs, and obsolete scripts once parity is verified.
2. Update deployment docs (`VERCEL_DEPLOYMENT.md`, `RAILWAY_DEPLOYMENT.md`, `nixpacks.toml`) to explain the new Next build steps and any worker containers.
3. Run a full regression test pass and update monitoring/alerts as needed.

_Exit criteria_: Only the Next.js app (plus optional worker service) remains, documentation is up to date, and CI/CD builds/deploys the new stack.

---

We will iterate through these phases sequentially; each phase should land as a PR-sized chunk so we can test and roll back safely.

