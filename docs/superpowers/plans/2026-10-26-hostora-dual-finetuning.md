# HOSTORA Dual Fine-tuning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and launch one unattended local pipeline that produces independently evaluated `chatbot-v3` and `studio-v1` LoRA/GGUF candidates, while adding a safe visual-plan contract and an isolated experimental codegen path.

**Architecture:** Reuse the proven Unsloth Qwen3.5-4B LoRA pipeline but split datasets, output folders, manifests, Ollama model names, and evaluation reports by capability. Studio's product path consumes schema-validated `VisualPlan` values through deterministic renderers; full HTML/CSS/JS generation remains a separately validated artifact behind a disabled-by-default flag. A user-level systemd service runs the training orchestrator independently of Codex and writes status/log files.

**Tech Stack:** Python 3.12, Unsloth, TRL, PyTorch, Qwen3.5-4B, Ollama/GGUF Q8, TypeScript 6, Next.js 16, Zod 4, Three.js, GSAP, Vitest, Playwright, systemd user services.

**Spec:** `docs/superpowers/specs/2026-10-26-hostora-dual-finetuning-design.md`

## Global Constraints

- Only `OLLAMA_BASE_URL` loopback; no cloud fallback.
- Never train price, promotion, availability, order state, raw lead, raw chat, contact information, secrets, or customer project text.
- Keep current v2 model and artifacts intact; new output paths must fail if a completed candidate already exists unless `HOSTORA_TRAIN_RESUME=1`.
- Candidate promotion is independent and never automatic.
- Full codegen defaults off and cannot publish or replace safe output.
- Training must survive the Codex turn as `hostora-dual-finetune.service` and expose a JSON status plus append-only log.
- Do not commit automatically because the shared worktree already contains extensive user changes.

## Review Focus

- Duplicate/paraphrased cases crossing train and holdout must be rejected by the dataset builder (Task 2 tests).
- Dynamic prices, phone numbers and emails in completions must fail the provenance gate (Task 2 tests).
- Unknown VisualPlan enums or unsafe section order must fall back without invoking free-form code (Task 4 tests).
- Codegen containing network/storage/eval/traversal must be rejected before preview or download (Task 6 tests).
- Interrupted training must leave an honest failed/interrupted status and must not promote partial artifacts (Task 7 tests).

---

### Task 1: Versioned training contracts and status format

**Files:**
- Create: `training/contracts.py`
- Create: `training/status.py`
- Create: `training/tests/test_contracts.py`
- Modify: `training/pyproject.toml`

**Interfaces:**
- Produces: `DatasetManifest`, `TrainingStatus`, `write_status(path, status)`, `sha256_file(path)`, `assert_safe_training_text(text)`.
- Consumes: existing `training/.venv` and Python 3.12.

- [ ] Write failing tests asserting schema serialization, atomic status writes, PII rejection and dynamic commercial fact rejection.
- [ ] Run `training/.venv/bin/python -m pytest training/tests/test_contracts.py -q`; expect failures for missing module.
- [ ] Implement the contracts and atomic JSON writer using a temporary sibling file plus `Path.replace`.
- [ ] Add `pytest` to the training project dependencies and run the focused test to green.
- [ ] Run `git diff --check` as the task checkpoint.

### Task 2: Provenance-checked chatbot-v3 and studio-v1 datasets

**Files:**
- Create: `training/build_dual_datasets.py`
- Create: `training/chatbot_v3_cases.json`
- Create: `training/studio_v1_cases.json`
- Create: `training/tests/test_dual_datasets.py`
- Create at runtime: `training/data/chatbot_v3_{train,holdout,challenge}.jsonl`
- Create at runtime: `training/data/studio_v1_{train,holdout,challenge}.jsonl`
- Create at runtime: `training/data/dual_dataset_manifest.json`

**Interfaces:**
- Consumes: `assert_safe_training_text`, `data/knowledge.json`, reviewed case files.
- Produces: OpenAI-message JSONL with `task`, `case_id`, `source_ids`, `prompt`, `completion`, `metadata`, plus a split/hash manifest.

- [ ] Write failing tests for minimum distribution, case-level split isolation, normalized-question deduplication, PII rejection, dynamic-fact rejection, required source IDs and exact studio task labels.
- [ ] Run the focused pytest; expect missing builder/case failures.
- [ ] Curate chatbot cases by extending existing v2 cases with discovery, conversion, refund, source conflict and refusal behavior; preserve live facts in runtime context only.
- [ ] Curate Studio cases across eight industries, four styles and four layout goals; every expected output must pass the future `SiteGeneration` schema.
- [ ] Implement the deterministic builder and manifest hashes; run focused tests and build datasets.
- [ ] Inspect counts and five random items per split without copying runtime customer data.

### Task 3: Generic dual LoRA trainer, export and candidate evaluator

**Files:**
- Create: `training/train_lora.py`
- Create: `training/export_lora.py`
- Create: `training/evaluate_candidate.py`
- Create: `training/configs/chatbot-v3.json`
- Create: `training/configs/studio-v1.json`
- Create: `training/Modelfile.chatbot-v3`
- Create: `training/Modelfile.studio-v1`
- Create: `training/tests/test_training_config.py`

**Interfaces:**
- Consumes: versioned JSONL and config path via `--config`.
- Produces: adapter, checkpoints, `manifest.json`, Q8 GGUF, direct-Ollama holdout report and `promotion.json` with `candidate` status only.

- [ ] Write failing config tests for unique model/output names, bounded epochs, required holdout, non-overwrite behavior and no automatic promotion.
- [ ] Run focused pytest and confirm expected failures.
- [ ] Generalize the current working Unsloth trainer with config-driven model, dataset, max length, LoRA rank/alpha, epochs, seed and resume behavior.
- [ ] Generalize export with adapter reload and SHA-256 recording.
- [ ] Implement direct candidate evaluation for schema validity, forbidden facts/PII, expected markers, latency and raw per-item output.
- [ ] Run config tests, `--dry-run` for both configs and one-step smoke against a temporary output.

### Task 4: VisualPlan contract and deterministic renderer families

**Files:**
- Modify: `lib/site-studio.ts`
- Modify: `lib/site-studio-workflow.ts`
- Modify: `lib/site-studio-store.ts`
- Modify: `components/site-preview-window.tsx`
- Modify: `tests/site-studio.test.ts`
- Modify: `tests/site-studio-workflow.test.ts`

**Interfaces:**
- Produces: `visualPlanSchema`, `VisualPlan`, `siteGenerationSchema`, `buildFallbackVisualPlan(idea)`, `buildPreviewHtml(idea, brief, visualPlan, assetBase?)`.
- Consumes: `design_plan` structured output from `studio-v1` or deterministic fallback.

- [ ] Add failing tests for all four layout families, invalid enum fallback, arbitrary user color preservation, section-order allowlist, reduced motion and escaped content.
- [ ] Run focused Vitest and observe schema/signature failures.
- [ ] Implement strict Zod/JSON schemas and conservative fallback mapping from business/style/goal.
- [ ] Split renderer internals into four content-shaped layout families without introducing a new UI library; map typography, accent role, motion and 3D motif from enums.
- [ ] Update workflow/store/preview to persist and render `VisualPlan`; keep old stored projects compatible through fallback.
- [ ] Run focused tests, typecheck and lint.

### Task 5: Studio model integration and rollback

**Files:**
- Modify: `lib/ollama.ts`
- Modify: `lib/site-studio-workflow.ts`
- Modify: `scripts/check-local-ai.mjs`
- Modify: `.env.example`
- Create: `tests/studio-model.test.ts`

**Interfaces:**
- Consumes: `OLLAMA_STUDIO_MODEL`, `siteGenerationSchema`.
- Produces: a single structured Studio call for brief + visual plan, followed by the existing independent content audit; fallback remains deterministic.

- [ ] Write failing tests proving Studio uses its own model, audit remains on the stronger chat model, malformed output falls back and catalog ranking stays deterministic.
- [ ] Run focused tests and confirm failures.
- [ ] Update Studio prompt/schema and model health check without changing chatbot or deterministic recommendation formulas.
- [ ] Run focused tests, `pnpm ai:check`, typecheck and lint.

### Task 6: Experimental full-code sandbox and static gate

**Files:**
- Create: `lib/site-codegen.ts`
- Create: `app/api/ai/site-studio/[id]/codegen/route.ts`
- Create: `app/api/ai/site-studio/[id]/codegen/download/route.ts`
- Modify: `components/studio-shared-project.tsx`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `tests/site-codegen.test.ts`
- Create: `tests/site-codegen-route.test.ts`

**Interfaces:**
- Produces: `codePackageSchema`, `validateCodePackage(pkg)`, `buildSandboxDocument(pkg)`, experimental POST/download routes.
- Consumes: `HOSTORA_STUDIO_CODEGEN_EXPERIMENTAL`, `studio-v1` `code_package` output.

- [ ] Add failing tests for disabled flag, exact three-file package, size limits, traversal, external URLs, network APIs, storage/cookie access, dynamic execution, forbidden HTML elements and parent/top/opener access.
- [ ] Run focused tests and observe missing validator failures.
- [ ] Add pinned HTML/CSS/JS parser dependencies; implement AST/parser-based allowlist validation rather than regex-only acceptance.
- [ ] Build CSP-protected sandbox document and routes; do not persist or download rejected packages.
- [ ] Add clearly labeled experimental UI separate from the safe renderer and keep it hidden while the flag is false.
- [ ] Run focused tests, typecheck, lint and security checks.

### Task 7: One-command unattended orchestration

**Files:**
- Create: `training/run_dual_finetune.py`
- Create: `scripts/start-dual-finetune.sh`
- Modify: `package.json`
- Modify: `.gitignore`
- Create: `training/tests/test_orchestrator.py`
- Runtime: `training/runs/dual-v1/status.json`
- Runtime: `training/runs/dual-v1/train.log`

**Interfaces:**
- Produces: `pnpm ai:train:dual` and `bash scripts/start-dual-finetune.sh`; starts `hostora-dual-finetune.service` and exits after confirming the unit is active.
- Consumes: Tasks 1–3 scripts/configs; Ollama loopback; absolute project path with trailing space.

- [ ] Write failing orchestrator tests using stub stages for order, failure stop, interruption status, resume, log append and no-promotion guarantee.
- [ ] Run focused pytest and confirm failures.
- [ ] Implement stage runner: preflight → dataset → baseline → unload candidate/base models → chatbot train/export/import/eval → studio train/export/import/eval → final summary.
- [ ] Implement signal handling and atomic status updates with stage start/end timestamps and exit codes.
- [ ] Implement the shell launcher with `systemd-run --user --collect`, `Restart=no`, explicit `WorkingDirectory=/home/admin123/Downloads`, absolute Python/pnpm paths and a validated run directory.
- [ ] Add `ai:train:dual` and `ai:train:status` scripts; run stub-mode end-to-end without GPU training.
- [ ] Launch the real service once and verify only `active/running`, status stage, PID, GPU process and growing log; do not wait for completion in the Codex turn.

### Task 8: Evaluation reports, visual QA and operating documentation

**Files:**
- Create: `training/evaluate_visual.mjs`
- Modify: `docs/CHATBOT_FINETUNING.md`
- Modify: `docs/WEBSITE_STUDIO.md`
- Modify: `docs/AI_EVALUATION.md`
- Modify: `training/README.md`
- Create: `tests/training-docs.test.ts`

**Interfaces:**
- Consumes: candidate manifests/reports, local preview routes and versioned holdout datasets.
- Produces: Playwright screenshots/metrics at 1440×900 and 390×844, documented status/stop/resume/rollback commands, and explicit candidate/promotion boundaries.

- [ ] Write failing doc tests for exact one-command start/status/stop paths, candidate model names, artifact locations and no auto-promotion statement.
- [ ] Run focused tests and confirm missing documentation failures.
- [ ] Implement the visual evaluator for overflow, console errors, external requests, reduced motion and layout-family coverage.
- [ ] Document local-only evaluation and optional Langfuse v4 Experiments export once credentials exist.
- [ ] Run full `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, Playwright desktop/mobile, `pnpm ai:check`, Python tests and `git diff --check`.
- [ ] Report the background service as running, not the models as completed; completion requires later inspection of status, artifacts and evaluation reports.

