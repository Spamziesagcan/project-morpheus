# Quick Frontend Update Script
# Usage: .\update-frontend.ps1

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  UPDATING FRONTEND" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Build
Write-Host "🔨 Building frontend Docker image..." -ForegroundColor Blue
Set-Location frontend
docker build -t gcr.io/skillsphere-api-2026/morpheus-frontend:latest .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host "✅ Build successful!" -ForegroundColor Green
Write-Host ""

# Push
Write-Host "📤 Pushing to Google Container Registry..." -ForegroundColor Blue
docker push gcr.io/skillsphere-api-2026/morpheus-frontend:latest

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Push failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host "✅ Push successful!" -ForegroundColor Green
Write-Host ""

# Deploy
Write-Host "🚀 Deploying to Cloud Run..." -ForegroundColor Blue
gcloud run deploy morpheus-frontend `
  --image gcr.io/skillsphere-api-2026/morpheus-frontend:latest `
  --region us-central1 `
  --quiet

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Set-Location ..

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ FRONTEND UPDATED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

$frontendUrl = gcloud run services describe morpheus-frontend --region us-central1 --format 'value(status.url)'
Write-Host "Frontend URL: $frontendUrl" -ForegroundColor Yellow
Write-Host ""
Write-Host "View logs: gcloud run services logs tail morpheus-frontend --region us-central1" -ForegroundColor Gray
