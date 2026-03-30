#!/bin/bash
# ─────────────────────────────────────────────
# GCP Cloud Run Deploy Script
# Usage: bash scripts/deploy-gcp.sh
# ─────────────────────────────────────────────

set -e

# ── CONFIG — change these ──────────────────────
PROJECT_ID="your-gcp-project-id"
SERVICE_NAME="quotes-backend"
REGION="asia-south1"          # Mumbai — closest to India
IMAGE="gcr.io/$PROJECT_ID/$SERVICE_NAME"
# ──────────────────────────────────────────────

echo "🔨 Building Docker image..."
docker build -t "$IMAGE" .

echo "📤 Pushing to Google Container Registry..."
docker push "$IMAGE"

echo "🚀 Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE" \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production" \
  --project "$PROJECT_ID"

echo "✅ Deployed! Service URL:"
gcloud run services describe "$SERVICE_NAME" \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --format "value(status.url)"
