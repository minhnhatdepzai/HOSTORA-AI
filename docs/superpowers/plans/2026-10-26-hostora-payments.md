# HOSTORA Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add sandbox invoice payment, cancellation, refund requests and admin processing for HOSTORA and partner digital services on web and Android.

**Architecture:** A local SQLite ledger stores immutable invoice amounts and state events. Stripe Checkout and VNPay hosted payment pages are server-created; signed callbacks and gateway reconciliation control paid/refunded states. Web admin uses a separate authenticated session; the mobile app opens the same secure checkout and reads orders with a private access code.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Node SQLite, Stripe Node SDK, VNPay HMAC SHA512, Expo Router.

**Spec:** `docs/PAYMENTS_SPEC.md`

## Global Constraints

- Current third-party catalog continues to link to each provider's official website.
- Partner invoices identify the provider and use a manually agreed charge amount; they do not turn catalog reference prices into charges.
- Never derive charge amounts from AI or client input; admin-created VND invoices are immutable after creation.
- No secrets in Git, React Native bundle or `localStorage`; no gateway credentials copied from JAPANO.
- Never mark paid from a browser return alone; verify signatures and amount, or query the gateway.
- Treat refunds as asynchronous until the gateway confirms success.
- Keep all customer-facing copy Vietnamese and support mobile safe area/reduced motion.

## Review Focus

- Replayed Stripe webhook or VNPay IPN must not duplicate payment or refund events.
- Tampered amount, currency, order ID or signature must not change the ledger.
- A refund cannot exceed the unrefunded paid amount or run twice.
- An unconfigured gateway must show a clear disabled state, never a fake success.
- Unauthorized admin requests must not list orders or issue refunds.

---

### Task 1: Durable order ledger and access control

**Files:** `lib/payments/store.ts`, `lib/payments/types.ts`, `lib/payments/admin-auth.ts`, `tests/payments-store.test.ts`.

- [ ] Add failing tests for invoice amount integrity, access code verification, valid state transitions, duplicate event handling and admin rejection.
- [ ] Implement SQLite schema, migrations, transactions and tests. Store access-code hashes only.
- [ ] Add admin login/logout API with HttpOnly session cookie and same-origin mutation checks.

### Task 2: Gateway adapters

**Files:** `lib/payments/stripe.ts`, `lib/payments/vnpay.ts`, `app/api/payments/**/route.ts`, `tests/payments-gateways.test.ts`.

- [ ] Add tests for Stripe raw-body signature flow, Checkout amount matching, VNPay canonical signature, VND ×100 conversion, IPN duplicates and refund limits.
- [ ] Implement Stripe hosted Checkout/webhook/refunds and VNPay hosted URL/return/IPN/refunds/reconciliation using server-only credentials.
- [ ] Return a disabled/configuration error when credentials or public callback URL are missing.

### Task 3: Web customer and admin UI

**Files:** `app/orders/**`, `app/admin/orders/**`, `components/admin-control-center.tsx`, `app/globals.css`, `tests/e2e/payments.spec.ts`.

- [ ] Build invoice lookup, status timeline, gateway choices and cancellation/refund request forms.
- [ ] Build protected admin order list, invoice creation, request review and gateway refund actions with confirmation.
- [ ] Visually inspect desktop 1440px and mobile 390px, then fix overflow, hierarchy and control states.

### Task 4: Android UI and release

**Files:** `mobile/src/app/orders.tsx`, `mobile/src/app/**`, `mobile/src/lib/api.ts`, `mobile/app.json`, `mobile/README.md`.

- [ ] Add entry from app Home and a native order lookup/detail screen; open hosted gateway pages in the browser and refresh status on return.
- [ ] Build APK, install on Redmi Note 8 Pro, inspect safe areas and gateway-disabled/sandbox paths.
- [ ] Run repo typecheck, lint, test, build, desktop/mobile Playwright, `ai:check`, APK signature/hash checks; document live-gateway limits.
