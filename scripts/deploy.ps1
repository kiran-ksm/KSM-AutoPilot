<#
.SYNOPSIS
    KSM AutoPilot deployment script (Windows PowerShell).

.DESCRIPTION
    Deploys infrastructure (CDK) and frontend assets (S3 + CloudFront) for a
    given environment. Designed for local developer use — CI/CD uses
    .github/workflows/deploy.yml instead.

.PARAMETER Env
    Target environment: dev | staging | prod

.PARAMETER SkipInfra
    Skip CDK deploy (infrastructure already up to date).

.PARAMETER SkipFrontend
    Skip frontend build and S3 sync.

.EXAMPLE
    .\scripts\deploy.ps1 -Env dev
    .\scripts\deploy.ps1 -Env staging -SkipFrontend
    .\scripts\deploy.ps1 -Env prod -SkipInfra
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev","staging","prod")]
    [string]$Env,

    [switch]$SkipInfra,
    [switch]$SkipFrontend
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "`n===  KSM AutoPilot Deploy  |  env=$Env  ===" -ForegroundColor Cyan

# ── Guard: prod requires explicit confirmation ────────────────────────────────
if ($Env -eq "prod") {
    $confirm = Read-Host "You are deploying to PRODUCTION. Type 'yes' to confirm"
    if ($confirm -ne "yes") { Write-Host "Aborted."; exit 1 }
}

# ── 1. CDK Infrastructure ─────────────────────────────────────────────────────
if (-not $SkipInfra) {
    Write-Host "`n[1/3] Deploying CDK stacks for '$Env'..." -ForegroundColor Yellow
    Push-Location "$Root\infra"
    try {
        cdk deploy "KsmAp-$Env-*" `
            --require-approval never `
            --context deploy_env=$Env `
            --outputs-file "$Root\cdk-outputs-$Env.json"
        if ($LASTEXITCODE -ne 0) { throw "CDK deploy failed" }
    } finally {
        Pop-Location
    }

    Write-Host "`n[2/3] Exporting CDK outputs to .env files..." -ForegroundColor Yellow
    python "$Root\scripts\export_env.py" --env $Env
    if ($LASTEXITCODE -ne 0) { throw "export_env.py failed" }
} else {
    Write-Host "`n[1/3] Skipping CDK deploy (--SkipInfra)" -ForegroundColor DarkGray
    Write-Host "`n[2/3] Skipping env export" -ForegroundColor DarkGray
}

# ── 2. Frontend build + sync ──────────────────────────────────────────────────
if (-not $SkipFrontend) {
    Write-Host "`n[3/3] Building and deploying frontend for '$Env'..." -ForegroundColor Yellow

    $envFile = "$Root\frontend\.env.$Env.local"
    if (-not (Test-Path $envFile)) {
        Write-Warning ".env.$Env.local not found at $envFile."
        Write-Warning "Run: python scripts/export_env.py --env $Env  first."
        exit 1
    }

    Push-Location "$Root\frontend"
    try {
        # Load env vars from the .local file into current process
        Get-Content $envFile | Where-Object { $_ -notmatch "^#" -and $_ -match "=" } | ForEach-Object {
            $parts = $_ -split "=", 2
            [System.Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
        }

        Write-Host "  npm ci..."
        npm ci --silent
        if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }

        Write-Host "  npm run build..."
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "npm build failed" }
    } finally {
        Pop-Location
    }

    # Read bucket name and distribution ID from CDK outputs
    $outputs = Get-Content "$Root\cdk-outputs-$Env.json" | ConvertFrom-Json
    $foundationKey = "KsmAp-$Env-Foundation"
    $bucket  = $outputs.$foundationKey.BucketName
    $distId  = $outputs.$foundationKey.DistributionId

    Write-Host "  Syncing to s3://$bucket ..."

    # Upload JS/CSS assets with explicit content-type (s3 sync guesses wrong with --cache-control)
    Get-ChildItem "$Root\frontend\dist\assets" -Filter "*.js" | ForEach-Object {
        $key = "assets/$($_.Name)"
        aws s3api put-object --bucket $bucket --key $key --body $_.FullName `
            --content-type "application/javascript" `
            --cache-control "public, max-age=31536000, immutable" 2>&1 | Out-Null
    }
    Get-ChildItem "$Root\frontend\dist\assets" -Filter "*.css" -ErrorAction SilentlyContinue | ForEach-Object {
        $key = "assets/$($_.Name)"
        aws s3api put-object --bucket $bucket --key $key --body $_.FullName `
            --content-type "text/css" `
            --cache-control "public, max-age=31536000, immutable" 2>&1 | Out-Null
    }

    # Upload any other non-JS, non-HTML assets (favicons, etc.)
    aws s3 sync "$Root\frontend\dist\" "s3://$bucket/" --delete `
        --exclude "index.html" --exclude "assets/*.js" --exclude "assets/*.css" `
        --cache-control "public, max-age=31536000, immutable" 2>&1
    if ($LASTEXITCODE -ne 0) { throw "S3 sync failed" }

    aws s3 cp "$Root\frontend\dist\index.html" "s3://$bucket/index.html" `
        --cache-control "no-cache, no-store, must-revalidate"
    if ($LASTEXITCODE -ne 0) { throw "S3 copy index.html failed" }

    Write-Host "  Invalidating CloudFront distribution $distId ..."
    aws cloudfront create-invalidation --distribution-id $distId --paths "/*"
    if ($LASTEXITCODE -ne 0) { throw "CloudFront invalidation failed" }
} else {
    Write-Host "`n[3/3] Skipping frontend deploy (--SkipFrontend)" -ForegroundColor DarkGray
}

Write-Host "`n✓  Deploy complete for environment: $Env`n" -ForegroundColor Green
