# Maktab AI - Windows install skripti
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "Maktab AI o'rnatilmoqda..." -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "X Node.js topilmadi. https://nodejs.org dan o'rnating." -ForegroundColor Red
    exit 1
}

Push-Location "$PSScriptRoot\backend"
try {
    Write-Host "Backend paketlar o'rnatilmoqda..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install failed" }

    if (-not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
        Write-Host "+ .env yaratildi (.env.example dan)" -ForegroundColor Green
    }
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "+ O'rnatish tugadi" -ForegroundColor Green
Write-Host ""
Write-Host "Keyingi qadamlar:" -ForegroundColor Cyan
Write-Host "  1. MongoDB ishga tushirilganini tekshiring (mongod xizmati)"
Write-Host "  2. backend/.env faylida JWT_SECRET ni o'zgartiring"
Write-Host "  3. Ishga tushirish uchun: .\start.ps1"
Write-Host ""
