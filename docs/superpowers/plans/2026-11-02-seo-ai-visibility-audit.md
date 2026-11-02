# SEO and AI Visibility Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `/website-analyzer` into a deterministic SEO plus AI-visibility report with local-AI content suggestions and a responsive, judge-readable UI.

**Architecture:** Keep URL fetching and SSRF controls in the existing route. Add a pure AI crawler/scoring module, return a backwards-compatible expanded response, then replace the basic web client with the richer report already supported by HOSTORA's audit pipeline.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Zod, Vitest, Playwright, Ollama local, Tailwind/global HOSTORA tokens.

**Spec:** `docs/superpowers/specs/2026-11-02-seo-ai-visibility-audit-design.md`

## Global Constraints

- No cloud LLM fallback or third-party API key.
- Deterministic code owns scores, findings and priority order; Ollama only drafts bounded content ideas.
- Preserve `validatePublicUrl`, response byte limits, timeouts and non-PII logging.
- Keep the top-level `score` compatible while adding explicit `scores` and crawler evidence.
- Reuse existing HOSTORA components/tokens and verify 375px plus desktop layouts with reduced motion.

## Review Focus

- Missing `robots.txt` must be described accurately: crawlers are allowed by default but the file is not explicit evidence.
- Specific bot rules must override wildcard rules without treating unrelated path rules as a root block.
- Malformed or empty `llms.txt` must not receive full AI-readiness credit.
- Ollama failure must still return deterministic scores, priorities and fallback content ideas.
- Long URLs, long finding text and many crawler rows must not overflow a 375px viewport.

---

### Task 1: Deterministic AI visibility scoring

**Files:**
- Create: `lib/ai-visibility.ts`
- Create: `tests/ai-visibility.test.ts`
- Modify: `lib/seo.ts`
- Modify: `tests/seo.test.ts`

**Interfaces:**
- Produces: `auditAiVisibility(input: AiVisibilityInput): AiVisibilityAudit` and `scoreSeoFindings(findings: SeoFinding[]): number`.
- `AiVisibilityAudit` exposes `score`, category scores and per-crawler `allowed | blocked` evidence.

- [ ] **Step 1: Write failing tests for specific-over-wildcard robot rules, absent robots, malformed llms content, category weights and SEO-only scoring.**
- [ ] **Step 2: Run `pnpm vitest run tests/ai-visibility.test.ts tests/seo.test.ts` and verify failures are caused by missing exports/behavior.**
- [ ] **Step 3: Implement the pure parser and weighted scoring without network or model calls.**
- [ ] **Step 4: Run the focused tests and verify they pass.**

### Task 2: Expand the existing audit API without cloud dependencies

**Files:**
- Modify: `app/api/seo/audit/route.ts`
- Create: `tests/seo-audit-route.test.ts`

**Interfaces:**
- Consumes: `auditAiVisibility`, `scoreSeoFindings`.
- Produces: response fields `scores`, `aiCrawlers`, `aiCategories` while retaining `score`, `findings`, `automationPlan`, `ai`, `sources` and `limits`.

- [ ] **Step 1: Write route tests asserting split scores, crawler evidence, fallback behavior and validation errors.**
- [ ] **Step 2: Run the route test and verify it fails on the missing expanded response.**
- [ ] **Step 3: Fetch and pass robots/llms/llms-full text into deterministic scoring; keep Ollama in the existing bounded try/fallback block.**
- [ ] **Step 4: Run focused route and SEO tests and verify they pass.**

### Task 3: Replace the basic web analyzer with the full report

**Files:**
- Modify: `app/website-analyzer/page.tsx`
- Modify: `components/website-analyzer.tsx`
- Modify: `app/globals.css` only if existing utilities cannot express the responsive report cleanly.
- Create: `tests/e2e/seo-ai-audit.spec.ts`

**Interfaces:**
- Consumes: expanded `/api/seo/audit` response.
- Produces: accessible URL/keyword form, three score summaries, prioritized fixes, grouped findings, crawler table, content ideas, sources and explicit limits.

- [ ] **Step 1: Write a Playwright test with a controlled API response for empty, loading, success and error states, including the three visible scores and crawler labels.**
- [ ] **Step 2: Run the focused Playwright test against the current page and verify it fails on the missing report UI.**
- [ ] **Step 3: Implement the client using existing HOSTORA visual tokens, semantic headings, `aria-live`/`aria-busy`, text-plus-icon statuses and mobile-first ordering.**
- [ ] **Step 4: Run the focused E2E test and verify it passes.**

### Task 4: Source record, regression and visual verification

**Files:**
- Modify: `docs/SEO_GEO_SOURCES.md`
- Modify: `README.md` only if the public feature list lacks the enhanced audit.

**Interfaces:**
- Records the reference-only clone `optifeed/optifeed-radar` at commit `2e0af8990de6914eefe4665bfe98f5d5c5e9e81b` and MIT license; it remains outside runtime dependencies.

- [ ] **Step 1: Document the reference, borrowed concepts and evidence limits without claiming real ChatGPT/Claude recommendations.**
- [ ] **Step 2: Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` and `pnpm ai:check` sequentially.**
- [ ] **Step 3: Run the changed page at desktop and 375px, inspect console/network/overflow, test reduced motion and save screenshots under `output/playwright/`.**
- [ ] **Step 4: Exercise a real public URL, confirm deterministic results survive Ollama failure, and report measured latency separately from score quality.**

