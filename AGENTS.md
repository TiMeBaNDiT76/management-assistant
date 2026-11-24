# Project Context: Leadership & People Management Assistant

## 1. Vision & Core Domain
A personal, extensible AI-assisted management companion accessible via Desktop Browser (Web) and Native Mobile Apps (iOS & Android). Built as a private single-tenant workspace per authenticated manager account.
Core capabilities:
- **Relationship Mapping:** Visualizing reporting lines, informal networks, team dependencies, and stakeholder relationships as interactive graphs.
- **Conversation & 1:1 Tracking:** Logging 1:1 meetings, structured notes, mood/sentiment indicators, career goals, and recurring action items.
- **AI Management Co-Pilot:** Automated 1:1 preparation briefings based on historical notes/open action items, conversation summarization, and semantic vector search across past logs.
- **Extensible Modular Architecture:** Domain-driven design so future modules (OKRs, calendar sync, team analytics) can be added cleanly without refactoring core layers.

## 2. Tech Stack & Architecture (Monorepo)
- **Language:** TypeScript (strict mode enabled across all workspaces).
- **Monorepo Tooling:** Turborepo + pnpm workspaces (`apps/mobile-web`, `apps/api`, `packages/shared`).
- **UI/UX Reference Assets:** Pre-existing screen mockups and wireframes are stored in `/mockups` at the repository root.
- **Frontend (Universal Web + iOS + Android):** React Native with **Expo** (Expo Router, NativeWind / Tailwind CSS, React Flow or D3/SVG for relationship graphs).
- **Backend / API:** Node.js with **Fastify** + **tRPC** (end-to-end type safety) + **OpenAPI / Swagger** (`/docs`).
- **Database & ORM:** **SQLite** (`better-sqlite3` with WAL mode enabled + `sqlite-vec` for vector embeddings) via **Drizzle ORM** (`drizzle-orm/better-sqlite3`).
- **Persistence & Replication:** **Litestream** running inside the Cloud Run container, replicating SQLite WAL frames continuously to Google Cloud Storage (`gs://<bucket>/mgmt.db`).
- **AI Integration:** Google **Vertex AI / Gemini API** (`@google/genai` SDK) for structured summaries, 1:1 prep briefings, and text embeddings (`text-embedding-004`).
- **Auth & Notifications:** Firebase Authentication (JWT verified in Fastify) & Firebase Cloud Messaging (FCM).

## 3. Single-Project GCP Infrastructure & Gitflow
- **Single GCP Project Strategy:** All resources run inside ONE GCP project, separated by environment (`test` vs. `prod`):
  - **Shared Infrastructure:** 1x Artifact Registry repository, 1x Firebase Auth project, 1x GitHub OIDC Workload Identity Pool.
  - **Environment Isolation:**
    - **TEST (`develop` branch):** Cloud Run service `api-test` (`--max-instances=1`), GCS Litestream bucket `${GCP_PROJECT_ID}-db-test`, Web bucket/CDN `web-test`.
    - **PROD (`main` branch):** Cloud Run service `api-prod` (`--max-instances=1`), GCS Litestream bucket `${GCP_PROJECT_ID}-db-prod`, Web bucket/CDN `web-prod`.
- **SQLite + Litestream Rules:**
  - Always enable `PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 5000;` on database initialization.
  - Cloud Run services MUST be deployed with `--max-instances=1` (and `--concurrency=80`) to prevent concurrent multi-container write corruption on SQLite.
  - Container entrypoint must run `litestream restore -if-db-not-exists -if-replica-exists` before starting Node.js, and wrap the Node.js process via `litestream replicate -exec "node dist/index.js"`.
- **Gitflow Branching Strategy:**
  - `main` -> Protected production branch. Triggers automated CI/CD deployment to **PROD**. Never commit directly to `main`.
  - `develop` -> Protected integration branch. Triggers automated CI/CD deployment to **TEST**. Never commit directly to `develop`.
  - `feat/<name>`, `fix/<name>`, `chore/<name>` -> All active development happens exclusively in short-lived branches branched off `develop`, merged via PR after passing all checks.

## 4. Coding Conventions & Multi-Agent Rules
- **Multi-Agent Role Separation & Mandatory Unit Tests:**
  - **Backend Agent (`@backend`):** Owns `packages/shared` and `apps/api`. Must write unit tests (`*.test.ts` with Vitest, using in-memory `:memory:` SQLite for fast isolated DB tests) for every repository, service, and tRPC router alongside implementation.
  - **Frontend Agent (`@frontend`):** Owns `apps/mobile-web` and reads `/mockups`. Must write component and hook unit tests (`*.test.tsx` with Jest / React Native Testing Library) alongside every new screen or UI component.
  - **QA & Release Gate Agent (`@qa-gate`):** Runs after implementation. Executes `pnpm typecheck`, `pnpm lint`, and `pnpm test`, audits test completeness for new files, verifies Gitflow branch rules, scans for leaked secrets, and blocks merge/deployment until 100% pass.
- **Mockup-Driven UI:** Always inspect `/mockups` before creating or modifying UI screens. Never delete or overwrite files in `/mockups`.
- **Domain-Driven Backend Modules:** Structure `apps/api/src/modules/<domain>/` into `router.ts`, `service.ts`, and `repository.ts`. Define shared Zod and Drizzle schemas in `packages/shared` first.
- **Strict Tenant Isolation:** Filter every SQLite query by `owner_user_id` extracted from the verified Firebase Auth JWT.
- **Public Repository Security:** This repository is public on GitHub. Never hardcode GCP Project IDs, bucket names, API keys, service account JSONs, or real employee names in source code, scripts, tests, or `/mockups`.

## 5. Current Project State
- **Phase:** Initial repository scaffolding & cloud-ready foundation.
- **Completed:** Architecture (SQLite + Litestream on GCP Cloud Run), Gitflow, 3-agent setup.
- **Next Steps:**
  1. Create `.opencode/agents/` definitions (`backend.md`, `frontend.md`, `qa-gate.md`).
  2. Initialize pnpm + Turborepo monorepo (`apps/api`, `apps/mobile-web`, `packages/shared`), `.gitignore`, and `/mockups`.
  3. Set up `packages/shared` with Drizzle SQLite schema (`employees`, `employee_relationships`, `conversations`, `action_items`) + `sqlite-vec` support and Zod schemas.
  4. Scaffold `apps/api` (Fastify + tRPC + OpenAPI `/docs` + `/health` + Firebase Auth + Vertex AI service + Litestream `Dockerfile` & `litestream.yml`).
  5. Scaffold `apps/mobile-web` (Expo Router + NativeWind + tRPC client + Jest/RNTL).
  6. Configure GitHub Actions (`ci.yml`, `deploy-test.yml`, `deploy-prod.yml`).

- **macOS (Apple Silicon) Dev vs. Linux Cloud Run Compatibility:**
  - Local development runs natively on macOS (`arm64`) using a local SQLite file (`./data/dev.db`) without Litestream overhead.
  - `.dockerignore` MUST exclude `node_modules`, `.turbo`, `dist`, and `data/*.db` so native macOS binaries (`better-sqlite3`) are never copied into Docker images.
  - The `apps/api/Dockerfile` must target `linux/amd64`, install build dependencies (`python3`, `make`, `g++`) in the builder stage to compile `better-sqlite3` natively for Linux, and include the static `litestream` binary.
