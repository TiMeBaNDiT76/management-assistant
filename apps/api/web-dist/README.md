# web-dist

Staging directory for the **exported web app** (Expo static export) that the
API serves at `/` when `WEB_DIST_PATH` is set (Cloud Run image: `/app/web`).

- Committed here: a placeholder `index.html` so `docker build` succeeds even
  without a staged export.
- CI overwrites this directory with the real `expo export` output **before**
  the image build (see `.github/workflows`).
- Do not hand-edit files here except the placeholder itself.
