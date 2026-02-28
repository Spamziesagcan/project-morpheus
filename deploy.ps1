# Morpheus GCP Deployment Script (PowerShell)
# This script automates the deployment of backend and frontend to Google Cloud Run

$ErrorActionPreference = "Stop"

# Colors and symbols
function Write-Info($message) {
    Write-Host "ℹ $message" -ForegroundColor Blue
}

function Write-Success($message) {
    Write-Host "✓ $message" -ForegroundColor Green
}

function Write-Error-Custom($message) {
    Write-Host "✗ $message" -ForegroundColor Red
}

function Write-Warning-Custom($message) {
    Write-Host "⚠ $message" -ForegroundColor Yellow
}

# Check if gcloud is installed
try {
    $null = Get-Command gcloud -ErrorAction Stop
} catch {
    Write-Error-Custom "gcloud CLI is not installed. Please install it from:"
    Write-Host "https://cloud.google.com/sdk/docs/install"
    exit 1
}

# Get project configuration
Write-Info "Getting GCP project configuration..."
$PROJECT_ID = gcloud config get-value project 2>$null
$REGION = gcloud config get-value run/region 2>$null

if (-not $PROJECT_ID) {
    Write-Error-Custom "No GCP project configured. Run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
}

if (-not $REGION) {
    $REGION = "us-central1"
    Write-Warning-Custom "No region configured. Using default: $REGION"
    gcloud config set run/region $REGION
}

Write-Success "Project: $PROJECT_ID"
Write-Success "Region: $REGION"

# Ask for confirmation
Write-Host ""
$confirmation = Read-Host "Deploy to $PROJECT_ID in $REGION? (y/n)"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Info "Deployment cancelled."
    exit 0
}

# Enable required APIs
Write-Info "Enabling required GCP APIs..."
gcloud services enable run.googleapis.com containerregistry.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com
Write-Success "APIs enabled"

# Deploy Backend
Write-Host ""
Write-Info "=========================================="
Write-Info "DEPLOYING BACKEND"
Write-Info "=========================================="

Set-Location backend

# Build backend Docker image
Write-Info "Building backend Docker image..."
docker build -t "gcr.io/$PROJECT_ID/morpheus-backend:latest" .
Write-Success "Backend image built"

# Configure Docker auth
Write-Info "Configuring Docker authentication..."
gcloud auth configure-docker --quiet
Write-Success "Docker authentication configured"

# Push backend image
Write-Info "Pushing backend image to GCR..."
docker push "gcr.io/$PROJECT_ID/morpheus-backend:latest"
Write-Success "Backend image pushed"

# Deploy backend
Write-Info "Deploying backend to Cloud Run..."
gcloud run deploy morpheus-backend `
  --image "gcr.io/$PROJECT_ID/morpheus-backend:latest" `
  --platform managed `
  --region $REGION `
  --allow-unauthenticated `
  --set-env-vars PORT=8080 `
  --memory 2Gi `
  --cpu 2 `
  --timeout 300 `
  --max-instances 10 `
  --quiet

$BACKEND_URL = gcloud run services describe morpheus-backend --region $REGION --format 'value(status.url)'
Write-Success "Backend deployed: $BACKEND_URL"

Set-Location ..

# Deploy Frontend
Write-Host ""
Write-Info "=========================================="
Write-Info "DEPLOYING FRONTEND"
Write-Info "=========================================="

Set-Location frontend

# Build frontend Docker image
Write-Info "Building frontend Docker image..."
docker build -t "gcr.io/$PROJECT_ID/morpheus-frontend:latest" .
Write-Success "Frontend image built"

# Push frontend image
Write-Info "Pushing frontend image to GCR..."
docker push "gcr.io/$PROJECT_ID/morpheus-frontend:latest"
Write-Success "Frontend image pushed"

# Deploy frontend
Write-Info "Deploying frontend to Cloud Run..."
gcloud run deploy morpheus-frontend `
  --image "gcr.io/$PROJECT_ID/morpheus-frontend:latest" `
  --platform managed `
  --region $REGION `
  --allow-unauthenticated `
  --set-env-vars NEXT_PUBLIC_API_URL=$BACKEND_URL `
  --memory 1Gi `
  --cpu 1 `
  --timeout 60 `
  --max-instances 10 `
  --quiet

$FRONTEND_URL = gcloud run services describe morpheus-frontend --region $REGION --format 'value(status.url)'
Write-Success "Frontend deployed: $FRONTEND_URL"

Set-Location ..

# Update backend CORS
Write-Info "Updating backend CORS settings..."
gcloud run services update morpheus-backend `
  --region $REGION `
  --update-env-vars FRONTEND_URL=$FRONTEND_URL `
  --quiet

Write-Success "CORS settings updated"

# Deployment Summary
Write-Host ""
Write-Info "=========================================="
Write-Success "DEPLOYMENT COMPLETE! 🚀"
Write-Info "=========================================="
Write-Host ""
Write-Host "Backend URL:  $BACKEND_URL"
Write-Host "Frontend URL: $FRONTEND_URL"
Write-Host ""
Write-Warning-Custom "IMPORTANT NEXT STEPS:"
Write-Host "1. Set up secrets in Secret Manager (MONGO_URI, SECRET_KEY, etc.)"
Write-Host "2. Update backend service with secrets:"
Write-Host "   gcloud run services update morpheus-backend \"
Write-Host "     --region $REGION \"
Write-Host "     --set-secrets MONGO_URI=MONGO_URI:latest,SECRET_KEY=SECRET_KEY:latest"
Write-Host ""
Write-Host "3. Update CORS in backend/main.py with your frontend URL"
Write-Host ""
Write-Info "View logs:"
Write-Host "  Backend:  gcloud run services logs read morpheus-backend --region $REGION"
Write-Host "  Frontend: gcloud run services logs read morpheus-frontend --region $REGION"
Write-Host ""
Write-Info "For full documentation, see: GCP_DEPLOYMENT_GUIDE.md"
