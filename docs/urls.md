# Infrastructure & Application URLs

Alle URLs des Projekts — GCP (Projekt `managerassistant`), GitHub (Repo
`TiMeBaNDiT76/management-assistant`) und die deployten Anwendungen.

Stand: 2026-11-24 — Phase 0 abgeschlossen: TEST-Deployment grün und live verifiziert.

---

## Application (TEST — Deploy von `develop`)

| Was | URL |
|---|---|
| API `api-test` — Cloud Run (health) | https://api-test-uqdribntpa-ey.a.run.app/health |
| API `api-test` — Entry (API-Metadaten) | https://api-test-uqdribntpa-ey.a.run.app/ |
| API `api-test` — Swagger UI (`/docs`) | https://api-test-uqdribntpa-ey.a.run.app/docs |
| API `api-test` — tRPC-Endpunkt | https://api-test-uqdribntpa-ey.a.run.app/trpc |
| Web `web-test` — statisches Expo Web (GCS) | https://storage.googleapis.com/managerassistant-web-test/index.html |

## Application (PROD — Deploy von `main`)

| Was | URL |
|---|---|
| API `api-prod` — Cloud Run | _noch nicht deployt (erster Deploy nach Merge auf `main`)_ |
| Web `web-prod` — statisches Expo Web (GCS) | https://storage.googleapis.com/managerassistant-web-prod/index.html |

## Local Development

| Was | URL |
|---|---|
| API (lokal, `pnpm --filter @mgmt/api dev`) | http://localhost:4000 |
| API lokal — Swagger UI | http://localhost:4000/docs |
| API lokal — tRPC-Endpunkt | http://localhost:4000/trpc |
| Expo Web Dev (`pnpm --filter @mgmt/mobile-web web`) | http://localhost:8081 |

---

## GCP Console (Projekt `managerassistant`)

| Was | URL |
|---|---|
| Projekt-Übersicht | https://console.cloud.google.com/home/dashboard?project=managerassistant |
| Cloud Run — Service `api-test` | https://console.cloud.google.com/run/detail/europe-west3/api-test?project=managerassistant |
| Cloud Run — Service `api-prod` | https://console.cloud.google.com/run/detail/europe-west3/api-prod?project=managerassistant |
| Cloud Run — Service-Liste | https://console.cloud.google.com/run?project=managerassistant |
| GCS — Bucket `managerassistant-litestream-test` | https://console.cloud.google.com/storage/browser/managerassistant-litestream-test?project=managerassistant |
| GCS — Bucket `managerassistant-litestream-prod` | https://console.cloud.google.com/storage/browser/managerassistant-litestream-prod?project=managerassistant |
| GCS — Bucket `managerassistant-web-test` | https://console.cloud.google.com/storage/browser/managerassistant-web-test?project=managerassistant |
| GCS — Bucket `managerassistant-web-prod` | https://console.cloud.google.com/storage/browser/managerassistant-web-prod?project=managerassistant |
| Artifact Registry — `mgmt-assistant-repo` (Docker-Images) | https://console.cloud.google.com/artifacts/docker/managerassistant/europe-west3/mgmt-assistant-repo?project=managerassistant |
| Service Accounts (IAM) | https://console.cloud.google.com/iam-admin/serviceaccounts?project=managerassistant |
| Workload Identity Pool (GitHub OIDC) | https://console.cloud.google.com/iam-admin/workload-identity-pool?project=managerassistant |
| Enabled APIs | https://console.cloud.google.com/apis/dashboard?project=managerassistant |

### GCP-Komponenten (IDs, nicht URIs)
- **Cloud Run Service-URL (TEST)**: `https://api-test-uqdribntpa-ey.a.run.app`
- **Artifact Registry URL (Docker)**: `europe-west3-docker.pkg.dev/managerassistant/mgmt-assistant-repo`
- **Runtime/Deploy Service Account**: `mgmt-api-runner@managerassistant.iam.gserviceaccount.com`
- **WIF Provider (für GitHub OIDC)**: `projects/625137775758/locations/global/workloadIdentityPools/github-actions-pool/providers/github-oidc`
- **Litestream-Replikat (nativ `gs`-Typ, ADC der Runtime-SA)**: `gs://managerassistant-litestream-test/mgmt` bzw. `gs://managerassistant-litestream-prod/mgmt` — Replikation in TEST läuft (Stichprobe: `ltx/`-Objekte im Bucket)
- **Litestream-Version im Image**: v0.5.18 (Config wird im `entrypoint.sh` aus der Container-Umgebung gerendert — v0.5 expandiert keine Env-Vars in der YAML)

## Firebase

| Was | URL |
|---|---|
| Firebase Console (Projekt) | https://console.firebase.google.com/u/0/project/managerassistant |
| Firebase Auth (Users & Sign-In) | https://console.firebase.google.com/u/0/project/managerassistant/authentication |

---

## GitHub

| Was | URL |
|---|---|
| Repository | https://github.com/TiMeBaNDiT76/management-assistant |
| Actions (alle Runs) | https://github.com/TiMeBaNDiT76/management-assistant/actions |
| Workflow `ci.yml` | https://github.com/TiMeBaNDiT76/management-assistant/actions/workflows/ci.yml |
| Workflow `deploy-test.yml` | https://github.com/TiMeBaNDiT76/management-assistant/actions/workflows/deploy-test.yml |
| Workflow `deploy-prod.yml` | https://github.com/TiMeBaNDiT76/management-assistant/actions/workflows/deploy-prod.yml |
| Workflow `qa-gate.yml` (reusable) | https://github.com/TiMeBaNDiT76/management-assistant/actions/workflows/qa-gate.yml |
| Secrets & Variables | https://github.com/TiMeBaNDiT76/management-assistant/settings/secrets/actions |
| Branches (`develop`, `main`) | https://github.com/TiMeBaNDiT76/management-assistant/branches |
| PR #1 (Monorepo-Scaffolding, gemerged) | https://github.com/TiMeBaNDiT76/management-assistant/pull/1 |
| PR #2 (GCP-Setup-Alignment, gemerged) | https://github.com/TiMeBaNDiT76/management-assistant/pull/2 |
| PR #3 (Deploy-Fixes: pnpm deploy --legacy, Test-Dateien aus `app/`, gemerged) | https://github.com/TiMeBaNDiT76/management-assistant/pull/3 |
| PR #4 (Deploy-Berechtigungen, `^@^`-Env-Syntax, Litestream `gs`-Typ, `docs/urls.md`, gemerged) | https://github.com/TiMeBaNDiT76/management-assistant/pull/4 |
| PR #5 (Litestream-Upgrade v0.5.18, gemerged) | https://github.com/TiMeBaNDiT76/management-assistant/pull/5 |
| PR #6 (Entrypoint rendert Litestream-Config aus Env, gemerged) | https://github.com/TiMeBaNDiT76/management-assistant/pull/6 |
| PR #7 (Phase-0-Abschluss: `--allow-unauthenticated`, URLs verifiziert) | https://github.com/TiMeBaNDiT76/management-assistant/pull/7 |

### Relevante Action-Runs
| Was | Run |
|---|---|
| Erster Deploy-TEST-Versuch (fehlgeschlagen: pnpm deploy + Expo-Test-Routen) | https://github.com/TiMeBaNDiT76/management-assistant/actions/runs/45399822256 |
| Deploy-TEST nach Fix (Berechtigungen/Syntax) | https://github.com/TiMeBaNDiT76/management-assistant/actions/runs/45400664708 |
| Deploy-TEST (Web grün, Litestream v0.3 fehlte gs) | https://github.com/TiMeBaNDiT76/management-assistant/actions/runs/45401546237 |
| Deploy-TEST (v0.5-Env-Expansion fehlte) | https://github.com/TiMeBaNDiT76/management-assistant/actions/runs/45402548757 |
| **Deploy-TEST — erster vollständig grüner Run** | https://github.com/TiMeBaNDiT76/management-assistant/actions/runs/45403610077 |

## Verifikation (2026-11-24, nach erstem grünem Deploy-Run)
| Check | Ergebnis |
|---|---|
| `/health` | `{"status":"ok","version":"0.1.0"}` |
| `/docs` (Swagger UI) | HTTP 200 |
| `/trpc/employees.list` ohne Token | HTTP 401 (Auth-Wall aktiv; `DEV_BYPASS_AUTH` wird in Produktion ignoriert) |
| Web-Bucket `index.html` | HTTP 200 (Expo-Export, ~27 KB) |
| Litestream | Replikation läuft (`ltx/`-Objekte im Replikat-Bucket `managerassistant-litestream-test/mgmt/`) |
| Cloud Run IAM | `allUsers` → `roles/run.invoker` (App-Auth via Firebase-JWT, nicht IAM; `--allow-unauthenticated` im Workflow sichert die Binding) |
