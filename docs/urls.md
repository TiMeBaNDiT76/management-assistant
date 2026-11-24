# Application URLs

## TEST (Deploy von `develop`)

| Was | URL |
|---|---|
| Web-App (TEST) | https://storage.googleapis.com/managerassistant-web-test/index.html |
| API `api-test` — Basis | https://api-test-uqdribntpa-ey.a.run.app |
| API `api-test` — Health | https://api-test-uqdribntpa-ey.a.run.app/health |
| API `api-test` — Swagger UI (`/docs`) | https://api-test-uqdribntpa-ey.a.run.app/docs |
| API `api-test` — tRPC-Endpunkt | https://api-test-uqdribntpa-ey.a.run.app/trpc |

## PROD (Deploy von `main`)

| Was | URL |
|---|---|
| Web-App (PROD) | https://storage.googleapis.com/managerassistant-web-prod/index.html |
| API `api-prod` — Basis | _erster Deploy nach Merge auf `main`_ |
| API `api-prod` — Health | _dito_ |
| API `api-prod` — Swagger UI (`/docs`) | _dito_ |
| API `api-prod` — tRPC-Endpunkt | _dito_ |

---
Stand: 2026-11-24 — TEST live und verifiziert (Health ok, Swagger 200, tRPC 401 ohne Token). Infrastruktur-/GitHub-URLs: siehe Projekt-Notizen bzw. GCP-/GitHub-Console.
