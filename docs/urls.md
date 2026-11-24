# Application URLs

Die Web-App wird vom API-Service selbst ausgeliefert (eine Origin,
SPA-Fallback) — die alte GCS-Web-Bucket-URL ist abgeschaltet.

## TEST (Deploy von `develop`)

| Was | URL |
|---|---|
| **App (TEST) — Login & alles** | https://api-test-uqdribntpa-ey.a.run.app/ |
| API `api-test` — Health | https://api-test-uqdribntpa-ey.a.run.app/health |
| API `api-test` — Swagger UI (`/docs`) | https://api-test-uqdribntpa-ey.a.run.app/docs |
| API `api-test` — tRPC-Endpunkt | https://api-test-uqdribntpa-ey.a.run.app/trpc |

## PROD (Deploy von `main`)

| Was | URL |
|---|---|
| App (PROD) | _erster Deploy nach Merge auf `main`_ (Basis-URL des `api-prod`-Service) |
| API `api-prod` — Health / `/docs` / `/trpc` | _dito_ |

---
Stand: 2026-11-24 — TEST live und verifiziert (Health ok, Swagger 200, tRPC 401 ohne Token).
GitHub-Var `EXPO_PUBLIC_API_URL` zeigt für TEST auf `…api-test…/trpc`; vor dem ersten
PROD-Deploy zusätzlich `EXPO_PUBLIC_API_URL_PROD` (Repo-Variable) auf `…api-prod…/trpc` setzen.
Infrastruktur-/GitHub-URLs: siehe Projekt-Notizen bzw. GCP-/GitHub-Console.
