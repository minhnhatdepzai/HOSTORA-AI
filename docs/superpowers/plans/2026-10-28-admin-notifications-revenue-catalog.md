# Admin, Notifications, Revenue and Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop admin order-email spam, add customer-only transactional email and mobile in-app notices, protect all admin pages from `/admin`, and provide a real-data revenue dashboard plus editable service catalog.

**Architecture:** Keep the existing local-first modular monolith. Centralize admin session checks in a server-only access layer, persist editable catalog records in local SQLite seeded from the current catalog, and derive dashboard/forecast values deterministically from paid invoice history. Use client components only for forms, charts and pointer/touch interaction.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Node SQLite, Zod, Recharts, Three.js, Expo 58, React Native, Reanimated, Gesture Handler, AsyncStorage, Vitest and Playwright.

**Spec:** `docs/superpowers/specs/2026-10-28-hostora-admin-cms-design.md`

## Global Constraints

- Customer order, invoice and payment-status email goes only to the customer email; admin email remains available only for admin OTP.
- Every `/admin/*` page and every admin mutation verifies the same server-side session; UI hiding is not authorization.
- Revenue and forecasts use only persisted invoices; insufficient history returns an honest unavailable/low-confidence state.
- Ollama remains loopback-only and cannot override numeric revenue, pricing or recommendation formulas.
- Public web and mobile catalog reads the same published catalog API; archive rather than hard-delete by default.
- Vietnamese copy, accessible controls, reduced-motion support and no fake dashboard metrics.
- Preserve unrelated dirty-worktree changes.

## Review Focus

- An invoice without `customerEmail` must send no transactional message and must never fall back to the SMTP/admin address.
- Admin OTP must still reach the configured approved admin email after order notifications are disabled.
- An invalid or expired cookie must not render `/admin` data and must not call protected mutation APIs.
- Forecasts with fewer than seven paid-history days must say that data is insufficient rather than inventing growth.
- An archived catalog item must disappear from public web/mobile responses while remaining recoverable in admin.

---

### Task 1: Customer-only transactional email

**Files:**
- Modify: `lib/payments/email.ts`
- Modify: `tests/payments-email.test.ts`

**Interfaces:**
- Produces: `notifySaleRequestCreated`, `notifySaleRequestCancelled`, `notifyInvoiceCreated`, and `notifyInvoiceStatusChanged` send only to the customer address; `notifyAdminLoginCode` remains the only admin-recipient mail path.

- [ ] Write tests asserting every commerce event sends exactly one customer email and never sends to `HOSTORA_ORDER_NOTIFICATION_EMAIL`.
- [ ] Run `pnpm test tests/payments-email.test.ts` and confirm the new assertions fail because admin messages exist.
- [ ] Remove admin recipients and admin-only body construction from commerce email functions without changing customer templates.
- [ ] Run the focused email tests and the full payment-email-related suite.

### Task 2: Mobile in-app notification center and interactive orbit

**Files:**
- Create: `mobile/src/lib/app-notifications.ts`
- Create: `mobile/src/components/notification-center.tsx`
- Modify: `mobile/src/context/app-context.tsx`
- Modify: `mobile/src/app/_layout.tsx`
- Modify: `mobile/src/app/(tabs)/products.tsx`
- Modify: `mobile/src/app/orders.tsx`
- Modify: `mobile/src/components/brand-orbit.tsx`
- Test: `tests/mobile-notifications.test.ts`

**Interfaces:**
- Produces: `createAppNotification`, `mergeAppNotifications`, `pushNotification`, `markNotificationRead`; persistent notices contain `id`, `kind`, `title`, `message`, `createdAt`, `read` and optional `route`.

- [ ] Write failing pure tests for deduplication, newest-first ordering and unread count.
- [ ] Implement the pure notification model and persist a bounded history in AsyncStorage through `AppProvider`.
- [ ] Render an accessible in-app banner/bell sheet in the root layout and emit notices after purchase request, invoice lookup status changes, payment and refund actions.
- [ ] Upgrade `BrandOrbit` to respond to drag gestures on native and pointer input on web, animating only transforms and honoring reduced motion.
- [ ] Run focused tests plus `pnpm --dir mobile typecheck` and `pnpm --dir mobile lint`.

### Task 3: Whole-admin OTP gate

**Files:**
- Create: `app/admin/login/page.tsx`
- Create: `components/admin-login.tsx`
- Create: `lib/admin/access.ts`
- Create: `app/admin/layout.tsx`
- Modify: `app/api/admin/payments/login/email/verify/route.ts`
- Modify: `app/api/admin/payments/login/route.ts`
- Modify: `app/api/admin/payments/session/route.ts`
- Modify: `components/admin-orders.tsx`
- Modify: `tests/payments-admin-auth.test.ts`
- Modify: `tests/e2e/admin.spec.ts`

**Interfaces:**
- Produces: `readAdminSessionCookie(): Promise<boolean>`, `requireAdminPage(nextPath)`, and a cookie with `Path=/`; `/admin/login` is the sole login UI.

- [ ] Add failing auth tests for the root-path cookie and redirect contract.
- [ ] Change login/logout cookie path to `/` and implement the server-only session access layer.
- [ ] Add the `/admin` layout gate while exempting `/admin/login`; remove embedded login/password UI from the order component.
- [ ] Add Playwright coverage that `/admin` and `/admin/orders` both redirect to `/admin/login` when unauthenticated.
- [ ] Run focused auth, route and E2E tests.

### Task 4: Real revenue analytics and honest forecasting

**Files:**
- Modify: `lib/payments/types.ts`
- Modify: `lib/payments/store.ts`
- Create: `lib/admin/revenue-forecast.ts`
- Create: `app/api/admin/analytics/route.ts`
- Create: `components/admin-revenue-dashboard.tsx`
- Create: `components/admin-revenue-scene.tsx`
- Modify: `components/admin-control-center.tsx`
- Test: `tests/admin-revenue-forecast.test.ts`
- Test: `tests/payments-store.test.ts`

**Interfaces:**
- Produces: `RevenueAnalytics` with actual daily revenue/orders, status mix, current-period totals, prior-period difference and a forecast containing method, value, range, confidence and sample size.

- [ ] Write failing tests for paid/refund recognition, zero-data results and low-confidence short history.
- [ ] Add aggregate SQLite queries and the deterministic moving-trend forecast helper.
- [ ] Add the protected analytics route and charts for revenue trend, status mix and paid-order counts.
- [ ] Add a dynamically loaded Three.js revenue scene with pointer/touch rotation, pause when hidden and a CSS fallback.
- [ ] Integrate the dashboard and remove any localStorage/fake metric from the overview.

### Task 5: Editable shared service catalog

**Files:**
- Create: `lib/admin/catalog-store.ts`
- Create: `app/api/admin/catalog/products/route.ts`
- Create: `app/api/admin/catalog/products/[id]/route.ts`
- Create: `components/admin-service-manager.tsx`
- Modify: `app/api/products/route.ts`
- Modify: `components/admin-control-center.tsx`
- Test: `tests/admin-catalog-store.test.ts`
- Test: `tests/admin-catalog-routes.test.ts`

**Interfaces:**
- Produces: `listPublishedProducts`, `listAdminProducts`, `createProduct`, `updateProduct`, `archiveProduct`, seeded idempotently from `productCatalog`.

- [ ] Write failing store tests for one-time seed, create/update/archive and published-only reads.
- [ ] Implement the SQLite catalog repository with Zod-validated DTOs and source/verified-date requirements.
- [ ] Add protected CRUD APIs with same-origin checks and public `/api/products` backed by published records.
- [ ] Add searchable service-management UI with create, edit, publish/archive and inline validation.
- [ ] Verify an admin price/name edit appears through the same API used by the mobile app.

### Task 6: End-to-end verification

**Files:**
- Modify: `docs/superpowers/specs/2026-10-28-hostora-admin-cms-design.md`
- Evidence: `output/playwright/`

- [x] Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` and `pnpm ai:check`.
- [x] Run Playwright at representative desktop and mobile viewports for login, dashboard, charts, 3D interaction and catalog CRUD.
- [x] Run mobile typecheck/lint/export and validate notification, drag interaction and catalog refresh on the connected Redmi through ADB.
- [x] Record verified, partial and unavailable items without converting health checks or synthetic data into production claims.
