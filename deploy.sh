#!/bin/bash

# Morpheus GCP Deployment Script
# This script automates the deployment of backend and frontend to Google Cloud Run

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

print_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI is not installed. Please install it from:"
    echo "https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get project configuration
print_info "Getting GCP project configuration..."
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
REGION=$(gcloud config get-value run/region 2>/dev/null)

if [ -z "$PROJECT_ID" ]; then
    print_error "No GCP project configured. Run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

if [ -z "$REGION" ]; then
    REGION="us-central1"
    print_warning "No region configured. Using default: $REGION"
    gcloud config set run/region $REGION
fi

print_success "Project: $PROJECT_ID"
print_success "Region: $REGION"

# Ask for confirmation
echo ""
read -p "Deploy to $PROJECT_ID in $REGION? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Deployment cancelled."
    exit 0
fi

# Enable required APIs
print_info "Enabling required GCP APIs..."
gcloud services enable run.googleapis.com containerregistry.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com

print_success "APIs enabled"

# Deploy Backend
echo ""
print_info "=========================================="
print_info "DEPLOYING BACKEND"
print_info "=========================================="

cd backend

# Build backend Docker image
print_info "Building backend Docker image..."
docker build -t gcr.io/$PROJECT_ID/morpheus-backend:latest .
print_success "Backend image built"

# Configure Docker auth
print_info "Configuring Docker authentication..."
gcloud auth configure-docker --quiet
print_success "Docker authentication configured"

# Push backend image
print_info "Pushing backend image to GCR..."
docker push gcr.io/$PROJECT_ID/morpheus-backend:latest
print_success "Backend image pushed"

# Deploy backend
print_info "Deploying backend to Cloud Run..."
gcloud run deploy morpheus-backend \
  --image gcr.io/$PROJECT_ID/morpheus-backend:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars PORT=8080 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 10 \
  --quiet

BACKEND_URL=$(gcloud run services describe morpheus-backend --region $REGION --format 'value(status.url)')
print_success "Backend deployed: $BACKEND_URL"

cd ..

# Deploy Frontend
echo ""
print_info "=========================================="
print_info "DEPLOYING FRONTEND"
print_info "=========================================="

cd frontend

# Build frontend Docker image
print_info "Building frontend Docker image..."
docker build -t gcr.io/$PROJECT_ID/morpheus-frontend:latest .
print_success "Frontend image built"

# Push frontend image
print_info "Pushing frontend image to GCR..."
docker push gcr.io/$PROJECT_ID/morpheus-frontend:latest
print_success "Frontend image pushed"

# Deploy frontend
print_info "Deploying frontend to Cloud Run..."
gcloud run deploy morpheus-frontend \
  --image gcr.io/$PROJECT_ID/morpheus-frontend:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars NEXT_PUBLIC_API_URL=$BACKEND_URL \
  --memory 1Gi \
  --cpu 1 \
  --timeout 60 \
  --max-instances 10 \
  --quiet

FRONTEND_URL=$(gcloud run services describe morpheus-frontend --region $REGION --format 'value(status.url)')
print_success "Frontend deployed: $FRONTEND_URL"

cd ..

# Update backend CORS
print_info "Updating backend CORS settings..."
gcloud run services update morpheus-backend \
  --region $REGION \
  --update-env-vars FRONTEND_URL=$FRONTEND_URL \
  --quiet

print_success "CORS settings updated"

# Deployment Summary
echo ""
print_info "=========================================="
print_success "DEPLOYMENT COMPLETE! 🚀"
print_info "=========================================="
echo ""
echo "Backend URL:  $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"
echo ""
print_warning "IMPORTANT NEXT STEPS:"
echo "1. Set up secrets in Secret Manager (MONGO_URI, SECRET_KEY, etc.)"
echo "2. Update backend service with secrets:"
echo "   gcloud run services update morpheus-backend \\"
echo "     --region $REGION \\"
echo "     --set-secrets MONGO_URI=MONGO_URI:latest,SECRET_KEY=SECRET_KEY:latest"
echo ""
echo "3. Update CORS in backend/main.py with your frontend URL"
echo ""
print_info "View logs:"
echo "  Backend:  gcloud run services logs read morpheus-backend --region $REGION"
echo "  Frontend: gcloud run services logs read morpheus-frontend --region $REGION"
echo ""
print_info "For full documentation, see: GCP_DEPLOYMENT_GUIDE.md"
