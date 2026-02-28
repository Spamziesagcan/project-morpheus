# Quick Backend Update Script
# Usage: .\update-backend.ps1

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  UPDATING BACKEND" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Build
Write-Host "🔨 Building backend Docker image..." -ForegroundColor Blue
Set-Location backend
docker build -t gcr.io/skillsphere-api-2026/morpheus-backend:latest .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host "✅ Build successful!" -ForegroundColor Green
Write-Host ""

# Push
Write-Host "📤 Pushing to Google Container Registry..." -ForegroundColor Blue
docker push gcr.io/skillsphere-api-2026/morpheus-backend:latest

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Push failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host "✅ Push successful!" -ForegroundColor Green
Write-Host ""

# Deploy
Write-Host "🚀 Deploying to Cloud Run..." -ForegroundColor Blue
gcloud run deploy morpheus-backend `
  --image gcr.io/skillsphere-api-2026/morpheus-backend:latest `
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
Write-Host "  ✅ BACKEND UPDATED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

$backendUrl = gcloud run services describe morpheus-backend --region us-central1 --format 'value(status.url)'
Write-Host "Backend URL: $backendUrl" -ForegroundColor Yellow
Write-Host ""
Write-Host "View logs: gcloud run services logs tail morpheus-backend --region us-central1" -ForegroundColor Gray
