$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "`n===  KSM AutoPilot — Dev Environment Setup  ===" -ForegroundColor Cyan

Write-Host "`n[1/4] Installing frontend dependencies..." -ForegroundColor Yellow
Push-Location "$Root\frontend"
npm ci
Pop-Location

Write-Host "`n[2/4] Setting up backend Python venv..." -ForegroundColor Yellow
Push-Location "$Root\backend\layer"
if (-not (Test-Path ".venv")) {
    python -m venv .venv
}
& ".\.venv\Scripts\python.exe" -m pip install -r requirements.txt --quiet
Pop-Location

Write-Host "`n[3/4] Setting up CDK Python venv..." -ForegroundColor Yellow
Push-Location "$Root\infra"
if (-not (Test-Path ".venv")) {
    python -m venv .venv
}
& ".\.venv\Scripts\python.exe" -m pip install -r requirements.txt --quiet
Pop-Location

Write-Host "`n[4/4] Installing test dependencies..." -ForegroundColor Yellow
Push-Location "$Root\tests\backend"
python -m pip install -r requirements-test.txt --quiet
Pop-Location

Write-Host "`n?  Dev environment ready." -ForegroundColor Green
Write-Host "  Next steps:"
Write-Host "  1. Configure AWS CLI: aws configure"
Write-Host '  2. Bootstrap CDK:     cd infra && cdk bootstrap --context deploy_env=dev'
Write-Host '  3. Deploy dev:        .\scripts\deploy.ps1 -Env dev'
Write-Host '  4. Export env vars:   python scripts\export_env.py --env dev'
Write-Host '  5. Start frontend:    cd frontend && npm run dev'
Write-Host ''
