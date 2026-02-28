# Update Both Backend and Frontend
# Usage: .\update-both.ps1

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  FULL DEPLOYMENT UPDATE" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

# Update Backend
Write-Host "Step 1/2: Updating Backend..." -ForegroundColor Cyan
.\update-backend.ps1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backend update failed. Stopping." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host ""

# Update Frontend
Write-Host "Step 2/2: Updating Frontend..." -ForegroundColor Cyan
.\update-frontend.ps1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend update failed." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ FULL DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

$backendUrl = gcloud run services describe morpheus-backend --region us-central1 --format 'value(status.url)'
$frontendUrl = gcloud run services describe morpheus-frontend --region us-central1 --format 'value(status.url)'

Write-Host "🌐 Your Application is Live:" -ForegroundColor Yellow
Write-Host "   Backend:  $backendUrl" -ForegroundColor White
Write-Host "   Frontend: $frontendUrl" -ForegroundColor White
Write-Host ""
Write-Host "✨ All services updated successfully!" -ForegroundColor Green
