#!/usr/bin/env bash
set -euo pipefail

# Aufruf:
# GCP_PROJECT_ID="deine-id" GITHUB_REPO="dein-user/management-assistant" ./scripts/setup-gcp.sh

: "${GCP_PROJECT_ID:?Bitte GCP_PROJECT_ID setzen}"
: "${GITHUB_REPO:?Bitte GITHUB_REPO im Format 'owner/repo' setzen}"

REGION="europe-west3"
REPO_NAME="mgmt-assistant-repo"
SA_NAME="mgmt-api-runner"
POOL_NAME="github-actions-pool"
PROVIDER_NAME="github-oidc"

BUCKET_TEST="${GCP_PROJECT_ID}-litestream-test"
BUCKET_PROD="${GCP_PROJECT_ID}-litestream-prod"

gcloud config set project "$GCP_PROJECT_ID"

echo ">>> 1. Aktiviere GCP APIs..."
gcloud services enable \
  run.googleapis.com \
  storage.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  aiplatform.googleapis.com \
  firebase.googleapis.com \
  identitytoolkit.googleapis.com \
  iamcredentials.googleapis.com

echo ">>> 2. Erstelle Artifact Registry & Service Account..."
gcloud artifacts repositories create "$REPO_NAME" \
  --repository-format=docker \
  --location="$REGION" || true

gcloud iam service-accounts create "$SA_NAME" \
  --display-name="Management Assistant Runner & Deployer" || true

SA_EMAIL="${SA_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"

for ROLE in \
  "roles/aiplatform.user" \
  "roles/secretmanager.secretAccessor" \
  "roles/run.admin" \
  "roles/artifactregistry.writer" \
  "roles/iam.serviceAccountUser"; do
  gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="$ROLE" \
    --quiet
  sleep 5
done

echo ">>> 3. Erstelle GCS Buckets für SQLite Litestream Replikation (Test & Prod)..."
for BUCKET in "$BUCKET_TEST" "$BUCKET_PROD"; do
  gcloud storage buckets create "gs://${BUCKET}" \
    --location="$REGION" \
    --uniform-bucket-level-access || true

  # Versionierung aktivieren für Point-in-Time Recovery
  gcloud storage buckets update "gs://${BUCKET}" --versioning

  # Service Account Zugriff auf den Bucket geben
  gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/storage.objectAdmin"
done

echo ">>> 3b. Erstelle Web-Buckets für statisches Expo Web Export (Test & Prod)..."
for WEB_BUCKET in "${GCP_PROJECT_ID}-web-test" "${GCP_PROJECT_ID}-web-prod"; do
  gcloud storage buckets create "gs://${WEB_BUCKET}" \
    --location="$REGION" \
    --uniform-bucket-level-access || true

  # Statisches Hosting: index.html als Start- und Fehlerseite
  gcloud storage buckets update "gs://${WEB_BUCKET}" \
    --web-main-page-suffix=index.html \
    --web-error-page=index.html

  # Öffentlicher Lesezugriff für statisches Hosting
  gcloud storage buckets add-iam-policy-binding "gs://${WEB_BUCKET}" \
    --member="allUsers" \
    --role="roles/storage.objectViewer" \
    --quiet

  # Deploy-SA: Buckets.get (rsync-Prüfung) + Objekt-Upload/Update
  gcloud storage buckets add-iam-policy-binding "gs://${WEB_BUCKET}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/storage.admin" \
    --quiet
done

echo ">>> 4. Workload Identity Federation für GitHub Actions (Keyless Auth)..."
PROJECT_NUMBER=$(gcloud projects describe "$GCP_PROJECT_ID" --format='value(projectNumber)')

gcloud iam workload-identity-pools create "$POOL_NAME" \
  --location="global" \
  --display-name="GitHub Actions Pool" || true

gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_NAME" \
  --location="global" \
  --workload-identity-pool="$POOL_NAME" \
  --display-name="GitHub OIDC Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
  --attribute-condition="assertion.repository == '${GITHUB_REPO}'" \
  --issuer-uri="https://token.actions.githubusercontent.com" || true

gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_NAME}/attribute.repository/${GITHUB_REPO}"

WIF_PROVIDER="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_NAME}/providers/${PROVIDER_NAME}"

echo "=============================================================================="
echo "Setup abgeschlossen! Trage diese Werte als GitHub Repository Secrets ein:"
echo "  GCP_PROJECT_ID:        $GCP_PROJECT_ID"
echo "  WIF_PROVIDER:          $WIF_PROVIDER"
echo "  WIF_SERVICE_ACCOUNT:   $SA_EMAIL"
echo "  LITESTREAM_BUCKET_TEST: $BUCKET_TEST"
echo "  LITESTREAM_BUCKET_PROD: $BUCKET_PROD"
echo "=============================================================================="

