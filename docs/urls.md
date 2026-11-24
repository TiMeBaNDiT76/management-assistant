# Infrastructure & Application URLs

Alle URLs des Projekts — GCP (Projekt `managerassistant`), GitHub (Repo
`TiMeBaNDiT76/management-assistant`) und die deployten Anwendungen.

Stand: 2026-11-24

---

## Application (TEST — Deploy von `develop`)

| Was | URL |
|---|---|
| API `api-test` — Cloud Run (health) | _wird nach Deploy-Run eingetragen_ |
| API `api-test` — Entry (API-Metadaten) | _dito_ |
| API `api-test` — Swagger UI (`/docs`) | _dito_ |
| API `api-test` — tRPC-Endpunkt | _dito_ |
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
- **Artifact Registry URL (Docker)**: `europe-west3-docker.pkg.dev/managerassistant/mgmt-assistant-repo`
- **Runtime/Deploy Service Account**: `mgmt-api-runner@managerassistant.iam.gserviceaccount.com`
- **WIF Provider (für GitHub OIDC)**: `projects/625137775758/locations/global/workloadIdentityPools/github-actions-pool/providers/github-oidc`
- **Litestream-Replikat (S3-kompatibel)**: `gs://managerassistant-litestream-test/mgmt` bzw. `gs://managerassistant-litestream-prod/mgmt`

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
| PR #3 (Deploy-Fixes, gemerged) | https://github.com/TiMeBaNDiT76/management-assistant/pull/3 |

### Relevante Action-Runs
| Was | Run |
|---|---|
| Erster Deploy-TEST-Versuch (fehlgeschlagen: pnpm deploy + Expo-Test-Routen) | https://github.com/TiMeBaNDiT76/management-assistant/actions/runs/45399822256 |
| Deploy-TEST nach Fix | _Run-ID wird nach Abschluss eingetragen_ |
