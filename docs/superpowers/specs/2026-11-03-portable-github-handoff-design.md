# HOSTORA portable GitHub handoff design

## Intent

Publish one consistent HOSTORA handoff that a reviewer can clone on Windows,
macOS or Linux, start with Docker, inspect the fine-tuning evidence, and install
the matching Android APK without relying on files that exist only on the author
machine.

## Goals

- Push the current web, admin, Android and documentation source to GitHub.
- Keep source, APK, Source ZIP, fine-tuning ZIP and README links on one release
  version.
- Make Docker CPU startup the portable default and retain an explicit NVIDIA
  override.
- Package adapters, manifests, evaluation and promotion evidence with SHA-256.
- Provide copy-paste instructions for Windows PowerShell, macOS and Linux.
- Never publish secrets, runtime SQLite data, raw customer data, base-model
  weights or reproducible training checkpoints.

## Non-goals

- Claim that a candidate adapter is the production model when its promotion
  gate did not pass.
- Guarantee GPU acceleration on every Docker Desktop platform.
- Publish a Google Play production-signed APK or a production payment setup.
- Put tens of gigabytes of GGUF/checkpoints in Git history.

## Constraints

- The worktree contains prior user changes and intentional cleanup; they must
  not be reset or overwritten.
- `origin/main` contains a newer mobile cinematic commit that must be integrated.
- The product model remains local-only through Ollama loopback/network-local
  Docker plumbing.
- GitHub Releases, not Git blobs, hold APK and adapter archives.

## Approaches considered

1. **Commit every model/checkpoint to Git.** Simple to describe but makes clone
   impractical, exceeds normal Git hosting limits and duplicates base weights.
2. **Publish source only and omit trained artifacts.** Small, but does not meet
   the requested fine-tuning handoff and cannot be audited independently.
3. **Hybrid source plus release artifacts (selected).** Git tracks source,
   configs, datasets and scripts; a release carries APK, Source ZIP and a
   checksum-protected fine-tuning ZIP. Docker downloads runtime models on first
   launch. This is portable and keeps provenance explicit.

## Delivery design

- Release version is bumped once after merging the current remote cinematic
  source. The APK metadata, filenames and README use that version.
- `compose.yaml` is the CPU-compatible baseline. `compose.gpu.yaml` adds the
  NVIDIA device request only when explicitly selected.
- Docker stores Ollama models, RAG index and app SQLite data in named volumes.
- A cross-platform Docker helper is optional convenience; README always includes
  raw `docker compose` commands that work in PowerShell and POSIX shells.
- The fine-tuning archive contains the selected chatbot and Studio adapters,
  tokenizer/config, dataset/training manifests, evaluation and promotion files,
  plus a generated SHA-256 manifest. It excludes base weights and checkpoints.
- A release verification script checks required assets, names, checksums and
  public download URLs before the release is announced.

## Acceptance

- Fresh source passes typecheck, tests, production build and targeted release
  handoff tests.
- `docker compose config` succeeds for CPU and NVIDIA configurations; a built
  web image answers `/api/health` in the tested stack or the exact external
  blocker is reported.
- APK metadata and ABIs match README.
- Source and fine-tuning archives can be downloaded, checksums verified and
  inspected without secrets or runtime databases.
- GitHub `main` and the release assets are publicly readable after push.

