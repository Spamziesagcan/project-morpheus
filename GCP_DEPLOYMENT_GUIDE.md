# GCP Deployment Guide for Project Morpheus

This guide provides step-by-step instructions to deploy your FastAPI backend and Next.js frontend on Google Cloud Platform (GCP).

## Prerequisites

1. **GCP Account**: Create a [Google Cloud account](https://cloud.google.com/)
2. **Project Setup**: Create a new GCP project or use an existing one
3. **Billing**: Enable billing for your GCP project
4. **Install Google Cloud SDK**: [Download and install gcloud CLI](https://cloud.google.com/sdk/docs/install)

## Initial Setup

### 1. Install and Configure gcloud CLI

```bash
# Install gcloud (if not already installed)
# Visit: https://cloud.google.com/sdk/docs/install

# Initialize gcloud
gcloud init

# Login to your Google account
gcloud auth login

# Set your project
gcloud config set project YOUR_PROJECT_ID
```

### 2. Enable Required GCP APIs

```bash
# Enable Cloud Run API
gcloud services enable run.googleapis.com

# Enable Container Registry API
gcloud services enable containerregistry.googleapis.com

# Enable Cloud Build API (for automated builds)
gcloud services enable cloudbuild.googleapis.com

# Enable Secret Manager API (for environment variables)
gcloud services enable secretmanager.googleapis.com
```

### 3. Set Environment Variables Locally

```bash
# Set your project ID
export PROJECT_ID="your-gcp-project-id"
export REGION="us-central1"  # or your preferred region

# Update gcloud config
gcloud config set project $PROJECT_ID
gcloud config set run/region $REGION
```

## Database Setup

### Option 1: MongoDB Atlas (Recommended)

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Get your connection string (format: `mongodb+srv://username:password@cluster.mongodb.net/dbname`)
3. Whitelist GCP IP addresses or use `0.0.0.0/0` (all IPs)

### Option 2: MongoDB on GCP Compute Engine

```bash
# Create a VM instance
gcloud compute instances create mongodb-instance \
  --machine-type=e2-medium \
  --zone=us-central1-a \
  --image-family=ubuntu-2004-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=20GB

# SSH into the instance and install MongoDB
gcloud compute ssh mongodb-instance --zone=us-central1-a

# Follow MongoDB installation instructions for Ubuntu
# https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/
```

## Backend Deployment (FastAPI)

### Step 1: Update Backend Configuration

1. Ensure your [backend/config.py](backend/config.py) uses environment variables:

```python
import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    mongo_uri: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    secret_key: str = os.getenv("SECRET_KEY", "your-secret-key")
    # Add other environment variables
```

### Step 2: Create Secrets in GCP Secret Manager

```bash
# Navigate to backend directory
cd backend

# Create secrets
echo -n "your-mongodb-connection-string" | gcloud secrets create MONGO_URI --data-file=-
echo -n "your-super-secret-jwt-key" | gcloud secrets create SECRET_KEY --data-file=-
echo -n "your-gemini-api-key" | gcloud secrets create GEMINI_API_KEY --data-file=-
# Add other secrets as needed (OPENAI_API_KEY, etc.)

# Grant Cloud Run access to secrets
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$PROJECT_ID@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Step 3: Build and Push Docker Image

```bash
# Still in backend directory
# Build the Docker image
docker build -t gcr.io/$PROJECT_ID/morpheus-backend:latest .

# Configure Docker to use gcloud as credential helper
gcloud auth configure-docker

# Push to Google Container Registry
docker push gcr.io/$PROJECT_ID/morpheus-backend:latest
```

### Step 4: Deploy Backend to Cloud Run

```bash
# Deploy to Cloud Run
gcloud run deploy morpheus-backend \
  --image gcr.io/$PROJECT_ID/morpheus-backend:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars PORT=8080 \
  --set-secrets MONGO_URI=MONGO_URI:latest,SECRET_KEY=SECRET_KEY:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 10

# Note your backend URL (e.g., https://morpheus-backend-xxxxx-uc.a.run.app)
export BACKEND_URL=$(gcloud run services describe morpheus-backend --region $REGION --format 'value(status.url)')
echo "Backend URL: $BACKEND_URL"
```

## Frontend Deployment (Next.js)

### Step 1: Update Next.js Configuration

1. Update [frontend/next.config.ts](frontend/next.config.ts) to enable standalone output:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // Required for Docker deployment
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
};

export default nextConfig;
```

2. Update [frontend/lib/config.ts](frontend/lib/config.ts) to use environment variable:

```typescript
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
```

### Step 2: Build and Push Frontend Docker Image

```bash
# Navigate to frontend directory
cd ../frontend

# Build the Docker image
docker build -t gcr.io/$PROJECT_ID/morpheus-frontend:latest .

# Push to Google Container Registry
docker push gcr.io/$PROJECT_ID/morpheus-frontend:latest
```

### Step 3: Deploy Frontend to Cloud Run

```bash
# Deploy to Cloud Run
gcloud run deploy morpheus-frontend \
  --image gcr.io/$PROJECT_ID/morpheus-frontend:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars NEXT_PUBLIC_API_URL=$BACKEND_URL \
  --memory 1Gi \
  --cpu 1 \
  --timeout 60 \
  --max-instances 10

# Get your frontend URL
export FRONTEND_URL=$(gcloud run services describe morpheus-frontend --region $REGION --format 'value(status.url)')
echo "Frontend URL: $FRONTEND_URL"
```

### Step 4: Update CORS Settings

Update your backend CORS settings to allow the frontend URL:

```bash
# Add FRONTEND_URL as a secret or environment variable
gcloud run services update morpheus-backend \
  --region $REGION \
  --update-env-vars FRONTEND_URL=$FRONTEND_URL
```

Update [backend/main.py](backend/main.py) to use this:

```python
import os

# Add after app initialization
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
        "http://localhost:3000",  # For local development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Custom Domain Setup (Optional)

### 1. Map Custom Domain to Cloud Run

```bash
# Map domain to frontend
gcloud run domain-mappings create \
  --service morpheus-frontend \
  --domain yourdomain.com \
  --region $REGION

# Map subdomain to backend
gcloud run domain-mappings create \
  --service morpheus-backend \
  --domain api.yourdomain.com \
  --region $REGION
```

### 2. Update DNS Records

Follow the instructions provided by GCP to add DNS records to your domain registrar.

## CI/CD with Cloud Build (Optional)

### Step 1: Create cloudbuild.yaml

```yaml
# In project root
steps:
  # Build backend
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/morpheus-backend:$COMMIT_SHA', './backend']
  
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/morpheus-backend:$COMMIT_SHA']
  
  # Deploy backend
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'morpheus-backend'
      - '--image=gcr.io/$PROJECT_ID/morpheus-backend:$COMMIT_SHA'
      - '--region=$_REGION'
      - '--platform=managed'
  
  # Build frontend
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/morpheus-frontend:$COMMIT_SHA', './frontend']
  
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/morpheus-frontend:$COMMIT_SHA']
  
  # Deploy frontend
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'morpheus-frontend'
      - '--image=gcr.io/$PROJECT_ID/morpheus-frontend:$COMMIT_SHA'
      - '--region=$_REGION'
      - '--platform=managed'

substitutions:
  _REGION: us-central1

images:
  - 'gcr.io/$PROJECT_ID/morpheus-backend:$COMMIT_SHA'
  - 'gcr.io/$PROJECT_ID/morpheus-frontend:$COMMIT_SHA'
```

### Step 2: Connect to GitHub

```bash
# Connect Cloud Build to your GitHub repository
gcloud builds triggers create github \
  --repo-name=project-morpheus \
  --repo-owner=YOUR_GITHUB_USERNAME \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml
```

## Monitoring and Logging

### View Logs

```bash
# Backend logs
gcloud run services logs read morpheus-backend --region $REGION

# Frontend logs
gcloud run services logs read morpheus-frontend --region $REGION

# Real-time logs
gcloud run services logs tail morpheus-backend --region $REGION
```

### Set Up Monitoring

1. Go to [GCP Console > Monitoring](https://console.cloud.google.com/monitoring)
2. Create dashboards for Cloud Run services
3. Set up alerts for errors, latency, and resource usage

## Cost Optimization

1. **Cloud Run**: You only pay for actual usage (requests and compute time)
2. **Set resource limits**:
   ```bash
   gcloud run services update morpheus-backend \
     --min-instances 0 \
     --max-instances 5 \
     --region $REGION
   ```
3. **Use Cloud Scheduler** to keep services warm during business hours
4. **Monitor costs** in [GCP Billing](https://console.cloud.google.com/billing)

## Troubleshooting

### Container fails to start
```bash
# Check logs
gcloud run services logs read morpheus-backend --region $REGION --limit 50

# Test locally
docker run -p 8080:8080 gcr.io/$PROJECT_ID/morpheus-backend:latest
```

### Database connection issues
- Verify MongoDB URI in Secret Manager
- Check MongoDB Atlas IP whitelist
- Ensure Cloud Run has Secret Manager access

### CORS errors
- Verify FRONTEND_URL in backend environment variables
- Check CORS middleware configuration in main.py

## Useful Commands

```bash
# List all Cloud Run services
gcloud run services list

# Describe a service
gcloud run services describe morpheus-backend --region $REGION

# Delete a service
gcloud run services delete morpheus-backend --region $REGION

# List all secrets
gcloud secrets list

# Access a secret value
gcloud secrets versions access latest --secret="MONGO_URI"

# Update environment variables
gcloud run services update morpheus-backend \
  --update-env-vars NEW_VAR=value \
  --region $REGION
```

## Security Best Practices

1. **Never commit secrets** to version control
2. **Use Secret Manager** for all sensitive data
3. **Enable authentication** for admin endpoints
4. **Regular security updates**: Rebuild images regularly
5. **Set up VPC** for production deployments
6. **Enable Cloud Armor** for DDoS protection

## Next Steps

1. Set up custom domain
2. Configure CDN with Cloud CDN
3. Set up automated backups for MongoDB
4. Implement monitoring and alerting
5. Set up staging environment
6. Configure WAF (Web Application Firewall)

## Support

For issues or questions:
- [GCP Documentation](https://cloud.google.com/docs)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [GCP Support](https://cloud.google.com/support)

---

**Deployment Complete! 🚀**

Your application should now be running on:
- Backend: `https://morpheus-backend-xxxxx-uc.a.run.app`
- Frontend: `https://morpheus-frontend-xxxxx-uc.a.run.app`
