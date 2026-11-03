# HOSTORA Portable GitHub Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans.

**Spec:** `docs/superpowers/specs/2026-11-03-portable-github-handoff-design.md`

**Goal:** Publish a current, checksum-verifiable HOSTORA release whose source,
fine-tuning evidence, Docker path and Android APK can be used from Windows,
macOS and Linux.

**Architecture:** Git contains source and reproducibility inputs; GitHub Release
contains bounded binary artifacts. Compose runs web and Ollama locally with
persistent named volumes. Release scripts derive names from `mobile/app.json`
to prevent version drift.

---

## Task 1: Integrate the remote cinematic source safely

**Files:** existing worktree plus `origin/main`

1. Snapshot the dirty tree and commit the intentional local changes on the
   release branch without adding ignored runtime/model output.
2. Rebase the release branch onto `origin/main`; resolve overlaps by retaining
   the remote 2.2.1 cinematic implementation and local admin/customer changes.
3. Verify mobile config references files present in the tree and run targeted
   mobile/source tests.
4. Commit the integrated baseline.

## Task 2: Specify and implement the portable Docker contract

**Files:** `compose.yaml`, `compose.gpu.yaml`, `.env.docker.example`,
`Dockerfile`, `docker/entrypoint.sh`, `docs/DOCKER_DEPLOYMENT.md`,
`tests/release-handoff.test.ts`

1. Add failing tests for cross-platform Compose invariants: CPU default has no
   mandatory GPU, web/runtime data persists, Ollama is not publicly exposed,
   required variables have safe defaults and stale release URLs are absent.
2. Run the targeted test and confirm failures describe the current gaps.
3. Update Docker configuration and documentation minimally to satisfy the
   contract, including PowerShell and POSIX commands.
4. Run targeted tests, `docker compose config` for both configurations and
   build the web image.
5. Commit the Docker handoff.

## Task 3: Make release and fine-tuning artifacts reproducible

**Files:** `scripts/package-submission.mjs`, `scripts/package-finetuning.mjs`,
`scripts/verify-release-handoff.mjs`, `training/README.md`, `package.json`,
`tests/release-handoff.test.ts`

1. Extend the failing release tests to require a version-derived asset manifest,
   adapter evidence and secret/runtime exclusions.
2. Confirm the test fails before implementation.
3. Implement packaging/verification so both ZIPs receive SHA-256 files and the
   fine-tuning ZIP has its own internal checksum manifest.
4. Generate both archives and inspect their entries for forbidden data.
5. Commit the artifact pipeline.

## Task 4: Align README, version and Android artifact

**Files:** `README.md`, `mobile/README.md`, `mobile/app.json`,
`mobile/package.json`, release/checksum documentation

1. Add failing assertions for one consistent version and live asset names.
2. Bump version/versionCode and update documentation after the failing run.
3. Run web/mobile typecheck and lint, build universal APK, verify signature,
   package name, SDK levels and all four ABIs.
4. Generate Source ZIP and fine-tuning ZIP for the final version.
5. Commit the versioned handoff.

## Task 5: Full verification and public release

**Files:** no new product behavior; release artifacts and Git state

1. Run full typecheck, test, build, AI smoke check, Docker configuration/build
   and archive verification; record any environment-only limitation.
2. Review the full branch diff for secrets, runtime databases and accidental
   model/checkpoint inclusion.
3. Merge the verified release branch into local `main`, push without force and
   confirm remote commit.
4. Create the matching GitHub Release, upload APK/ZIP/checksum assets and verify
   each public URL with a ranged download plus SHA-256 comparison.
5. Confirm the HTTPS web/admin endpoints and README links from outside the
   local server before reporting completion.

## Review Focus

- Docker Desktop behavior without NVIDIA and without Bash.
- No public bind for Ollama, no secret/database/model-base leakage.
- Candidate fine-tune status remains explicit and is not promoted by packaging.
- One version across APK metadata, README and release asset filenames.
- Release assets remain downloadable after the GitHub `latest` redirect.

