# Quick Start: GCP Deployment

This is a quick reference guide. For detailed instructions, see [GCP_DEPLOYMENT_GUIDE.md](GCP_DEPLOYMENT_GUIDE.md).

## Prerequisites

1. **Install gcloud CLI**: https://cloud.google.com/sdk/docs/install
2. **Install Docker**: https://docs.docker.com/get-docker/
3. **GCP Project**: Create a project at https://console.cloud.google.com/

## One-Command Deployment

### For Linux/Mac:
```bash
./deploy.sh
```

### For Windows PowerShell:
```powershell
.\deploy.ps1
```

## Manual Deployment (Step-by-Step)

### 1. Initial Setup (One-time)

```bash
# Login and set project
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud config set run/region us-central1

# Enable APIs
gcloud services enable run.googleapis.com containerregistry.googleapis.com secretmanager.googleapis.com

# Configure Docker
gcloud auth configure-docker
```

### 2. Set Up Secrets

```bash
# Create secrets for sensitive data
echo -n "your-mongodb-uri" | gcloud secrets create MONGO_URI --data-file=-
echo -n "your-secret-key" | gcloud secrets create SECRET_KEY --data-file=-
echo -n "your-gemini-key" | gcloud secrets create GEMINI_API_KEY --data-file=-
```

### 3. Deploy Backend

```bash
cd backend

# Build and push
docker build -t gcr.io/YOUR_PROJECT_ID/morpheus-backend .
docker push gcr.io/YOUR_PROJECT_ID/morpheus-backend

# Deploy
gcloud run deploy morpheus-backend \
  --image gcr.io/YOUR_PROJECT_ID/morpheus-backend \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets MONGO_URI=MONGO_URI:latest,SECRET_KEY=SECRET_KEY:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --memory 2Gi

cd ..
```

### 4. Deploy Frontend

```bash
cd frontend

# Build and push
docker build -t gcr.io/YOUR_PROJECT_ID/morpheus-frontend .
docker push gcr.io/YOUR_PROJECT_ID/morpheus-frontend

# Deploy (use your actual backend URL)
gcloud run deploy morpheus-frontend \
  --image gcr.io/YOUR_PROJECT_ID/morpheus-frontend \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars NEXT_PUBLIC_API_URL=YOUR_BACKEND_URL \
  --memory 1Gi

cd ..
```

## Get Service URLs

```bash
# Backend URL
gcloud run services describe morpheus-backend --format 'value(status.url)'

# Frontend URL
gcloud run services describe morpheus-frontend --format 'value(status.url)'
```

## View Logs

```bash
# Real-time logs
gcloud run services logs tail morpheus-backend

# Recent logs
gcloud run services logs read morpheus-backend --limit 100
```

## Update Deployment

```bash
# Rebuild and redeploy backend
cd backend
docker build -t gcr.io/YOUR_PROJECT_ID/morpheus-backend .
docker push gcr.io/YOUR_PROJECT_ID/morpheus-backend
gcloud run deploy morpheus-backend --image gcr.io/YOUR_PROJECT_ID/morpheus-backend

# Rebuild and redeploy frontend
cd frontend
docker build -t gcr.io/YOUR_PROJECT_ID/morpheus-frontend .
docker push gcr.io/YOUR_PROJECT_ID/morpheus-frontend
gcloud run deploy morpheus-frontend --image gcr.io/YOUR_PROJECT_ID/morpheus-frontend
```

## Environment Variables

Add more environment variables:

```bash
gcloud run services update morpheus-backend \
  --update-env-vars NEW_VAR=value,ANOTHER_VAR=value
```

## Troubleshooting

### Check if service is running
```bash
gcloud run services list
```

### View errors
```bash
gcloud run services logs read morpheus-backend --limit 50
```

### Test locally
```bash
# Backend
cd backend
docker build -t morpheus-backend .
docker run -p 8080:8080 morpheus-backend

# Frontend
cd frontend
docker build -t morpheus-frontend .
docker run -p 8080:8080 morpheus-frontend
```

## Cost Estimate

For a small project:
- **Cloud Run**: ~$5-20/month (depends on traffic)
- **Container Registry**: ~$1-5/month
- **MongoDB Atlas**: Free tier available

## Next Steps

1. ✅ Deploy application
2. 🔒 Set up custom domain
3. 📊 Configure monitoring
4. 🔄 Set up CI/CD with GitHub Actions
5. 🛡️ Configure Cloud Armor (DDoS protection)
6. 📦 Set up Cloud CDN

---

For detailed explanations, troubleshooting, and advanced configurations, see [GCP_DEPLOYMENT_GUIDE.md](GCP_DEPLOYMENT_GUIDE.md).
