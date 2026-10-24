# HOSTORA AI — Báo cáo thiết lập môi trường

- Ngày kiểm tra: 2026-10-23 (Asia/Ho_Chi_Minh)
- Phạm vi: môi trường phát triển, Codex, MCP, nghiên cứu và kiểm thử
- Trạng thái ứng dụng: **đã khởi tạo HOSTORA AI local-first trong workspace**
- Quyền quản trị: **không dùng `sudo`**, không thay đổi kernel, driver GPU hoặc hệ điều hành

## 1. Kết luận nhanh

Môi trường local đã sẵn sàng và hiện được dùng để phát triển HOSTORA AI. Node/Python/Docker/GPU hoạt động; ứng dụng dùng Next.js, TypeScript, Playwright, Vitest và hai model Ollama local. Phần kết quả QA sản phẩm được theo dõi riêng tại `docs/QA_REPORT.md`.

Các phần chưa hoàn tất không được báo thành công:

- GitHub MCP đã cấu hình nhưng chưa kết nối vì biến `GITHUB_PAT_TOKEN` chưa có.
- Database/PostgreSQL và Supabase MCP được hoãn cho tới khi có database/project cụ thể để giới hạn quyền đúng phạm vi.
- Langfuse project tracing được hoãn tới khi có local instance/project; Langfuse Docs MCP vẫn hoạt động.

## 2. Phần cứng và hệ điều hành

| Hạng mục      | Kết quả                                              |
| ------------- | ---------------------------------------------------- |
| Ubuntu        | 24.04.5 LTS (Noble), kernel `7.0.0-38-generic`       |
| CPU           | Intel Core i5-13400F, 10 cores / 16 threads          |
| RAM           | 31 GiB tổng, 20 GiB available tại thời điểm kiểm tra |
| Swap          | 31 GiB, chưa sử dụng                                 |
| Ổ đĩa `/`     | 915 GiB tổng, 433 GiB trống, 51% đã dùng             |
| GPU           | NVIDIA GeForce RTX 5060 Ti, 16,311 MiB VRAM          |
| NVIDIA driver | 580.178.04                                           |
| CUDA toolkit  | 13.0 (`nvcc` 13.0.88)                                |

GPU/CUDA chỉ được kiểm tra, không bị thay đổi.

## 3. Công cụ hệ thống và phát triển

| Công cụ        | Phiên bản/trạng thái | Thao tác                                      |
| -------------- | -------------------- | --------------------------------------------- |
| Node.js        | 24.21.0              | Đã có; đạt yêu cầu Node 22+                   |
| npm            | 12.2.1               | Đã cập nhật trong NVM user prefix             |
| pnpm           | 12.15.0              | Đã cập nhật trong NVM user prefix             |
| Corepack       | 0.36.0               | Đã có                                         |
| Python         | 3.12.3 (system)      | Giữ nguyên                                    |
| pip            | 24.0 (system)        | Giữ nguyên; ưu tiên `uv` cho project          |
| uv / uvx       | 0.13.5               | Đã cập nhật bằng `uv self update`             |
| Git            | 2.43.0               | Hoạt động                                     |
| Codex CLI      | 0.164.0              | Đã cài bản npm mới nhất vào NVM user prefix   |
| Chromium       | 154.0.8037.97 (Snap) | Hoạt động                                     |
| Google Chrome  | Không cài            | Không cần cài; MCP dùng Chromium rõ đường dẫn |
| Docker Engine  | 29.8.1               | Hoạt động, chạy được container                |
| Docker Compose | v5.5.1               | Hoạt động                                     |

### Android / React Native

| Hạng mục              | Phiên bản/trạng thái                                      |
| --------------------- | --------------------------------------------------------- |
| Java                  | OpenJDK 21                                                |
| Android SDK           | Platform 34, 36 và 37; Build Tools 37.0.0                 |
| React Native          | 0.88.0                                                    |
| Expo native toolchain | SDK 58.0.17; không phụ thuộc Expo Go                      |
| Expo Router           | 58.0.25                                                   |
| Thiết bị kiểm tra     | Redmi Note 8 Pro, ADB online, arm64-v8a                   |
| APK                   | Gradle release build thành công; arm64 1.1.0 và universal |

APK cài trực tiếp nằm trong `mobile/releases/`. Local release hiện ký bằng Android debug certificate để cài thử; production store signing chưa được cấu hình.

Codex CLI ban đầu là bản `0.162.0-alpha.17.2` đi kèm VS Code extension. PATH hiện ưu tiên bản user-level `0.164.0` tại NVM; không chỉnh sửa trực tiếp binary của extension.

## 4. Tooling cục bộ của HOSTORA AI

Không cài framework/application dependency toàn hệ thống. Tooling được đặt cục bộ trong workspace:

| Package         | Phiên bản |
| --------------- | --------- |
| TypeScript      | 6.0.3     |
| ESLint          | 9.39.5    |
| Prettier        | 3.9.10    |
| Vitest          | 5.0.5     |
| Playwright Test | 1.64.1    |
| Next.js         | 16.4.2    |
| React           | 19.3.1    |

Các file nền tảng đã tạo:

- `package.json`: ứng dụng private, Node `>=22`, pnpm 12.15.0 và scripts test/build/AI.
- `pnpm-lock.yaml`: lockfile dependency.
- `tsconfig.json`: strict typecheck cho toàn bộ ứng dụng.
- `eslint.config.mjs`: ESLint flat config cho Next.js/TypeScript.
- `tests/`: unit/integration test; `e2e/`: Playwright desktop/mobile.
- `.gitignore`: bỏ qua dependency, build, coverage, Playwright artifact và file môi trường.

Lệnh kiểm tra sẵn có:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
```

Next.js 16.4.2 đã được cài cục bộ và ứng dụng thật đã build production thành công. Context7 xác nhận Next.js 16 yêu cầu Node.js từ 20.9; Node 24.21 hiện tại tương thích.

Training dùng môi trường riêng `training/.venv`: Python 3.12, Unsloth 2026.10.7, Transformers 5.17.0, TRL 1.15.0 và Torch 2.14.1+cu130. Qwen3.5-4B BF16 LoRA smoke đã hoàn thành một step, tối đa 8,81 GB VRAM.

## 5. MCP đang active

| MCP                   | Cấu hình                                                                                   | Kiểm tra thực tế                                                       | Trạng thái       |
| --------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | ---------------- |
| Playwright            | `@playwright/mcp@latest`, Chromium Snap, headless, isolated                                | 25 tools; mở TodoMVC, nhập todo, submit và tìm lại nội dung thành công | **Đã hoạt động** |
| Chrome DevTools       | `chrome-devtools-mcp@latest`, Chromium Snap, headless, isolated, tắt usage statistics/CrUX | Mở HOSTORA thật, đọc DOM/network/console; Lighthouse 4 nhóm đều 100    | **Đã hoạt động** |
| Context7              | `@upstash/context7-mcp@latest`                                                             | Resolve `/vercel/next.js` và truy xuất docs Next.js 16.2.9 thành công  | **Đã hoạt động** |
| OpenAI Developer Docs | `https://developers.openai.com/mcp`                                                        | Liệt kê 5 tools và gọi `search_openai_docs` thành công                 | **Đã hoạt động** |
| Langfuse Docs         | `https://langfuse.com/api/mcp`                                                             | Liệt kê 4 tools và gọi `searchLangfuseDocs` thành công                 | **Đã hoạt động** |
| Sequential Thinking   | package chính thức Model Context Protocol                                                  | Liệt kê được tool `sequentialthinking`                                 | **Đã hoạt động** |
| Figma                 | `https://mcp.figma.com/mcp`                                                                | `whoami` trả đúng tài khoản và plan; Code Layers khả dụng              | **Đã hoạt động** |
| GitHub                | `https://api.githubcopilot.com/mcp/`                                                       | Server đã cấu hình; `GITHUB_PAT_TOKEN` không tồn tại, chưa thể gọi API | **Chờ xác thực** |

`enabled` chỉ có nghĩa là đã ghi cấu hình; bảng trên chỉ ghi “Đã hoạt động” khi đã gọi tool thật.

Các package registry được quan sát tại ngày kiểm tra: `@playwright/mcp` 0.0.83, `chrome-devtools-mcp` 1.12.0, `@upstash/context7-mcp` 4.4.4 và `ctx7` 0.8.1. Cấu hình dùng `@latest`, nên phiên bản resolve có thể thay đổi ở lần khởi động sau.

## 6. MCP không active hoặc chưa cài

### Filesystem MCP

MCP cũ trỏ nhầm sang `$HOME/Documents/test`. Workspace QA có tên thư mục kết thúc bằng dấu cách (`NoInternet `); wrapper npm loại bỏ dấu cách cuối và server chặn symlink vượt root. Không mở rộng quyền sang toàn bộ `Downloads`, nên Filesystem MCP đã được gỡ khỏi cấu hình active.

Điều này không chặn công việc: Codex native filesystem đã đọc, tạo, sửa và kiểm tra file trong workspace thành công. Nếu muốn Filesystem MCP riêng, nên đổi tên thư mục thành đường dẫn không có dấu cách cuối trong một thao tác có chủ đích.

### PostgreSQL MCP

`postgres-pro` cũ dùng package bên thứ ba `postgres-mcp` đã crash trước khi kết nối với lỗi `AttributeError: 'Server' object has no attribute 'list_resources'` do không tương thích MCP SDK 2.x. Upstream có workaround ghim `mcp<2`, nhưng hiện chưa có `DATABASE_URI`, dự án chưa chọn database và upstream còn có cảnh báo bảo mật liên quan restricted mode. Vì vậy MCP này đã được gỡ thay vì giữ một connector không hoạt động.

Khi chọn database, ưu tiên một trong hai hướng:

1. Supabase MCP chính thức, project-scoped và read-only nếu HOSTORA dùng Supabase.
2. PostgreSQL connector được duy trì, ghim phiên bản và chạy với user DB read-only riêng; kiểm tra tool thật trước khi cấp quyền.

### Supabase MCP

Chưa cài. Endpoint chính thức là `https://mcp.supabase.com/mcp`, nhưng connector có thể thao tác database/project và cần OAuth. Chỉ nên cài sau khi có Supabase project cụ thể, giới hạn project và bật read-only trước.

### Langfuse project MCP

Chưa cài connector dữ liệu có xác thực vì chưa có project, region và API key. Langfuse Docs MCP không cần xác thực đã hoạt động. Khi ứng dụng có luồng AI thật, mới tạo project và kết nối project MCP/SDK; không ghi key trực tiếp vào `config.toml` hoặc commit vào Git.

### Testing MCP bổ sung

Không cài thêm. Playwright MCP + Chrome DevTools MCP + Vitest + Playwright Test đã phủ browser automation, DOM interaction, console/network inspection, unit/integration test và E2E foundation. Thêm một testing MCP khác lúc này chỉ trùng chức năng.

## 7. Kiểm tra khả năng thực tế

| Khả năng                     | Bằng chứng                                                                                                | Kết quả |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- | ------- |
| Đọc/chỉnh sửa source         | Tạo và sửa package/config/test/report trong workspace                                                     | Pass    |
| Chạy terminal command        | Toàn bộ inventory, install và smoke test chạy từ terminal                                                 | Pass    |
| Tìm thông tin mới trên web   | Đọc tài liệu chính thức OpenAI, Microsoft, Chrome DevTools, Figma, GitHub, Supabase, Context7 và Langfuse | Pass    |
| Playwright tương tác web     | Navigate + type + submit + find trên TodoMVC                                                              | Pass    |
| Chrome DevTools kiểm tra web | New page + evaluate DOM/title + console trên Example Domain                                               | Pass    |
| Context7 lấy documentation   | Resolve/query docs Next.js 16.2.9                                                                         | Pass    |
| Figma MCP                    | Gọi `whoami` trên official MCP, trả đúng tài khoản/plan                                                   | Pass    |
| Test project                 | Vitest: 7 files, 15 tests pass                                                                            | Pass    |
| Typecheck/lint/format        | TypeScript, ESLint, Prettier đều exit 0                                                                   | Pass    |
| Dependency audit             | `pnpm audit --audit-level high`: không có vulnerability đã biết                                           | Pass    |
| Build ứng dụng HOSTORA       | Next.js 16.4.2 production build, 23 routes                                                                | Pass    |
| Docker                       | `docker run --rm hello-world` thành công                                                                  | Pass    |
| Git                          | Init/add/commit/log trong repo tạm thành công                                                             | Pass    |
| Internet                     | OpenAI Docs endpoint phản hồi; npm, PyPI, GitHub đều HTTP 200                                             | Pass    |
| Quyền ghi file               | Tạo/xóa write probe và tạo project files thành công                                                       | Pass    |

## 8. Bước người dùng cần thực hiện

### Khi thay đổi cấu hình MCP lần sau

Session hiện tại đã nạp và gọi được Playwright, Chrome DevTools, Context7, Figma và các docs MCP. Chỉ cần reload Codex sau khi thêm/sửa MCP mới. Có thể kiểm tra bằng:

```bash
codex --version
codex mcp list
```

Kỳ vọng Codex CLI là 0.164.0 và danh sách có Playwright, Chrome DevTools, Context7, Figma, GitHub, Langfuse Docs, OpenAI Developer Docs, Sequential Thinking.

### GitHub authentication

Cấu hình hiện tại đọc token từ biến môi trường `GITHUB_PAT_TOKEN`; token chưa tồn tại. Tạo fine-grained PAT với quyền tối thiểu cho repository HOSTORA, nạp qua secret manager hoặc shell an toàn trước khi khởi động Codex. Không ghi token vào repository, `package.json`, `config.toml` hoặc nội dung chat.

### Context7 account (không bắt buộc)

Context7 đang dùng được và đã query thật, nên không chạy lại setup để tránh cấu hình trùng. Nếu muốn authenticated quota/rate limit, người dùng có thể chạy `npx ctx7 setup --codex` và hoàn tất device OAuth sau khi đã restart.

## 9. Nguồn chính thức đã đối chiếu

- [OpenAI Docs MCP](https://developers.openai.com/learn/docs-mcp)
- [Playwright MCP](https://github.com/microsoft/playwright/blob/main/docs/src/getting-started-mcp.md)
- [Chrome DevTools MCP configuration](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/configuration.md)
- [Figma MCP setup](https://help.figma.com/hc/en-us/articles/39216419318551-Get-started-with-the-Figma-MCP-server)
- [GitHub MCP Server](https://github.com/github/github-mcp-server)
- [Context7 for Codex](https://github.com/upstash/context7/blob/master/docs/clients/codex.mdx)
- [Supabase MCP](https://supabase.com/docs/guides/ai-tools/mcp)
- [Langfuse Docs MCP](https://langfuse.com/docs/docs-mcp)
- [Langfuse project MCP](https://langfuse.com/docs/api-and-data-platform/features/mcp-server)

## 10. Mức độ sẵn sàng

- Local coding/tooling: **Sẵn sàng**
- Research/documentation: **Sẵn sàng**
- Browser automation/debugging: **Sẵn sàng**
- Automated unit/build checks: **Sẵn sàng; gồm SEO unit test và RAG retrieval eval**
- Docker/local container workflow: **Sẵn sàng**
- Figma design workflow: **Sẵn sàng; quyền sửa phụ thuộc file/seat cụ thể**
- GitHub agent workflow: **Chờ token/quyền repository**
- Database/Supabase workflow: **Chưa chọn backend; cố ý hoãn**
- AI observability documentation: **Sẵn sàng**
- AI trace ingestion/evaluation project: **Chờ ứng dụng và Langfuse project**

Kết luận: môi trường và ứng dụng HOSTORA AI local-first đã sẵn sàng cho phát triển tiếp. Chỉ workflow GitHub cần token/quyền repository; database và observability project được cố ý hoãn tới khi có đích triển khai cụ thể.
