<#
.SYNOPSIS
    Tear down all KSM AutoPilot CDK stacks for a given environment.

.PARAMETER Env
    Target environment: dev | staging | prod

.EXAMPLE
    .\scripts\destroy.ps1 -Env dev
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev","staging","prod")]
    [string]$Env
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "`n===  KSM AutoPilot DESTROY  |  env=$Env  ===" -ForegroundColor Red

$confirm = Read-Host "This will DESTROY all KsmAp-$Env-* stacks. Type '$Env-destroy' to confirm"
if ($confirm -ne "$Env-destroy") {
    Write-Host "Aborted — confirmation string did not match." -ForegroundColor Yellow
    exit 1
}

if ($Env -eq "prod") {
    $doubleConfirm = Read-Host "PRODUCTION destroy. Type 'i understand prod is permanent' to proceed"
    if ($doubleConfirm -ne "i understand prod is permanent") {
        Write-Host "Aborted."; exit 1
    }
}

Push-Location "$Root\infra"
try {
    cdk destroy "KsmAp-$Env-*" --force --context deploy_env=$Env
    if ($LASTEXITCODE -ne 0) { throw "CDK destroy failed" }
} finally {
    Pop-Location
}

Write-Host "`n✓  All KsmAp-$Env-* stacks destroyed.`n" -ForegroundColor Green
