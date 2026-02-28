# Deployment Update Workflow

## 🎉 Your Deployed URLs

- **Backend:** https://morpheus-backend-517072344431.us-central1.run.app
- **Frontend:** https://morpheus-frontend-517072344431.us-central1.run.app

---

## 🔄 Updating Your Deployment

Since you have many features and frequent changes, here's your workflow:

### Option 1: Quick Update Script (Recommended)

Create this script for fast updates:

**`update-backend.ps1`:**
```powershell
# Quick Backend Update Script
Write-Host "🔨 Building backend..." -ForegroundColor Blue
cd backend
docker build -t gcr.io/skillsphere-api-2026/morpheus-backend:latest .

Write-Host "📤 Pushing to GCR..." -ForegroundColor Blue
docker push gcr.io/skillsphere-api-2026/morpheus-backend:latest

Write-Host "🚀 Deploying to Cloud Run..." -ForegroundColor Blue
gcloud run deploy morpheus-backend `
  --image gcr.io/skillsphere-api-2026/morpheus-backend:latest `
  --region us-central1

Write-Host "✅ Backend updated!" -ForegroundColor Green
cd ..
```

**`update-frontend.ps1`:**
```powershell
# Quick Frontend Update Script
Write-Host "🔨 Building frontend..." -ForegroundColor Blue
cd frontend
docker build -t gcr.io/skillsphere-api-2026/morpheus-frontend:latest .

Write-Host "📤 Pushing to GCR..." -ForegroundColor Blue
docker push gcr.io/skillsphere-api-2026/morpheus-frontend:latest

Write-Host "🚀 Deploying to Cloud Run..." -ForegroundColor Blue
gcloud run deploy morpheus-frontend `
  --image gcr.io/skillsphere-api-2026/morpheus-frontend:latest `
  --region us-central1

Write-Host "✅ Frontend updated!" -ForegroundColor Green
cd ..
```

**`update-both.ps1`:**
```powershell
# Update both backend and frontend
.\update-backend.ps1
.\update-frontend.ps1
```

---

### Option 2: Manual Commands

#### Update Backend Only:
```powershell
cd backend
docker build -t gcr.io/skillsphere-api-2026/morpheus-backend:latest .
docker push gcr.io/skillsphere-api-2026/morpheus-backend:latest
gcloud run deploy morpheus-backend --image gcr.io/skillsphere-api-2026/morpheus-backend:latest --region us-central1
cd ..
```

#### Update Frontend Only:
```powershell
cd frontend
docker build -t gcr.io/skillsphere-api-2026/morpheus-frontend:latest .
docker push gcr.io/skillsphere-api-2026/morpheus-frontend:latest
gcloud run deploy morpheus-frontend --image gcr.io/skillsphere-api-2026/morpheus-frontend:latest --region us-central1
cd ..
```

---

## 🔐 Managing Environment Variables & Secrets

### Add New Secret:
```powershell
echo "your-new-secret-value" | gcloud secrets create NEW_SECRET_NAME --data-file=-
```

### Update Existing Secret:
```powershell
echo "updated-value" | gcloud secrets versions add SECRET_NAME --data-file=-
```

### Update Backend to Use New Secret:
```powershell
gcloud run services update morpheus-backend `
  --region us-central1 `
  --update-secrets "NEW_SECRET_NAME=NEW_SECRET_NAME:latest"
```

### Add/Update Regular Environment Variable:
```powershell
gcloud run services update morpheus-backend `
  --region us-central1 `
  --update-env-vars "VAR_NAME=value"
```

---

## 🏗️ Development Best Practices

### 1. **Test Locally First**
```powershell
# Backend
cd backend
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm run dev
```

### 2. **Use Git for Version Control**
```bash
git add .
git commit -m "Add new feature"
git push origin main
```

### 3. **Deploy After Testing**
```powershell
.\update-backend.ps1  # or update-frontend.ps1
```

---

## 🤖 Automated CI/CD (Recommended for Frequent Updates)

### Setup with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GCP Cloud Run

on:
  push:
    branches: [ main ]
  workflow_dispatch:

env:
  PROJECT_ID: skillsphere-api-2026
  REGION: us-central1

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      
      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
      
      - name: Configure Docker
        run: gcloud auth configure-docker
      
      - name: Build Backend
        run: |
          cd backend
          docker build -t gcr.io/$PROJECT_ID/morpheus-backend:${{ github.sha }} .
          docker push gcr.io/$PROJECT_ID/morpheus-backend:${{ github.sha }}
      
      - name: Deploy Backend
        run: |
          gcloud run deploy morpheus-backend \
            --image gcr.io/$PROJECT_ID/morpheus-backend:${{ github.sha }} \
            --region $REGION \
            --platform managed

  deploy-frontend:
    runs-on: ubuntu-latest
    needs: deploy-backend
    steps:
      - uses: actions/checkout@v3
      
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      
      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
      
      - name: Configure Docker
        run: gcloud auth configure-docker
      
      - name: Build Frontend
        run: |
          cd frontend
          docker build -t gcr.io/$PROJECT_ID/morpheus-frontend:${{ github.sha }} .
          docker push gcr.io/$PROJECT_ID/morpheus-frontend:${{ github.sha }}
      
      - name: Deploy Frontend
        run: |
          gcloud run deploy morpheus-frontend \
            --image gcr.io/$PROJECT_ID/morpheus-frontend:${{ github.sha }} \
            --region $REGION \
            --platform managed
```

**To enable GitHub Actions:**
1. Create a GCP Service Account with Cloud Run Admin role
2. Download the JSON key
3. Add it as a GitHub secret named `GCP_SA_KEY`
4. Push to main branch → automatic deployment! 🎉

---

## 📊 Monitoring & Debugging

### View Logs:
```powershell
# Backend logs (real-time)
gcloud run services logs tail morpheus-backend --region us-central1

# Frontend logs (real-time)
gcloud run services logs tail morpheus-frontend --region us-central1

# Recent logs
gcloud run services logs read morpheus-backend --region us-central1 --limit 100
```

### Check Service Status:
```powershell
gcloud run services describe morpheus-backend --region us-central1
gcloud run services describe morpheus-frontend --region us-central1
```

### View All Services:
```powershell
gcloud run services list
```

---

## 🔧 Common Scenarios

### Scenario 1: You Added a New Backend Feature
1. Code your feature in `backend/`
2. Test locally: `cd backend; uvicorn main:app --reload`
3. Deploy: `.\update-backend.ps1`

### Scenario 2: You Changed Frontend UI
1. Update components in `frontend/`
2. Test locally: `cd frontend; npm run dev`
3. Deploy: `.\update-frontend.ps1`

### Scenario 3: You Need a New API Key
1. Add to local `.env` file (don't commit!)
2. Create secret: `echo "key-value" | gcloud secrets create NEW_API_KEY --data-file=-`
3. Update backend: `gcloud run services update morpheus-backend --region us-central1 --update-secrets "NEW_API_KEY=NEW_API_KEY:latest"`

### Scenario 4: You Changed Both Backend & Frontend
1. Test both locally
2. Deploy: `.\update-both.ps1`

### Scenario 5: Database Schema Changed
1. Update your MongoDB schema
2. Test migration locally
3. Deploy backend: `.\update-backend.ps1`

---

## 🎯 Quick Reference

```powershell
# View current deployment
gcloud run services list

# Get service URL
gcloud run services describe morpheus-backend --format 'value(status.url)'

# Rollback to previous version
gcloud run services update-traffic morpheus-backend --to-revisions=REVISION=100 --region us-central1

# Scale service
gcloud run services update morpheus-backend --min-instances 1 --max-instances 20 --region us-central1

# Change resources
gcloud run services update morpheus-backend --memory 4Gi --cpu 4 --region us-central1

# Delete service (careful!)
gcloud run services delete morpheus-backend --region us-central1
```

---

## 💡 Tips for Efficient Development

1. **Use Separate Environments:**
   - Keep `http://localhost:3000` and `http://localhost:8000` for local dev
   - Production URLs for deployed version

2. **Environment-Specific Configs:**
   ```typescript
   // frontend/lib/config.ts
   export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
   ```

3. **Hot Reload During Development:**
   - Backend: `uvicorn main:app --reload`
   - Frontend: `npm run dev`

4. **Test Before Deploy:**
   Always test locally before pushing to production

5. **Version Control:**
   Commit often, deploy when stable

6. **Monitor Costs:**
   Check GCP billing dashboard regularly: https://console.cloud.google.com/billing

---

## 🚨 Troubleshooting

### Build Fails:
- Check Dockerfile syntax
- Ensure all dependencies are in requirements.txt/package.json
- Review build logs for specific errors

### Deployment Fails:
- Check Cloud Run quota limits
- Verify secrets exist: `gcloud secrets list`
- Check service account permissions

### App Not Working:
- View logs: `gcloud run services logs tail SERVICE_NAME`
- Check environment variables are set correctly
- Verify MongoDB connection
- Test API endpoints directly

### CORS Errors:
```powershell
# Update ALLOWED_ORIGINS
gcloud run services update morpheus-backend --update-env-vars "ALLOWED_ORIGINS=https://your-frontend-url.run.app"
```

---

## 📞 Need Help?

- **GCP Documentation:** https://cloud.google.com/run/docs
- **View Service Status:** https://console.cloud.google.com/run
- **Billing & Costs:** https://console.cloud.google.com/billing

---

**Next Steps:**
1. ✅ Test your deployed application
2. 📝 Create update scripts for easy deployment
3. 🤖 Set up CI/CD for automatic deployments
4. 📊 Configure monitoring and alerts
5. 🔒 Review security settings

**Your app is live! Start using it and deploy updates as needed.** 🚀
