# Maktab AI - Windows start skripti
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "Maktab AI ishga tushirilmoqda..." -ForegroundColor Cyan
Write-Host ""

$mongoService = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
if ($mongoService -and $mongoService.Status -ne "Running") {
    Write-Host "MongoDB xizmati ishga tushirilmoqda..." -ForegroundColor Yellow
    try { Start-Service MongoDB } catch {
        Write-Host "! MongoDB xizmatini ishga tushirib bo'lmadi (admin huquqi kerak bo'lishi mumkin)" -ForegroundColor Yellow
    }
}
elseif (-not $mongoService) {
    Write-Host "! MongoDB xizmati topilmadi. https://www.mongodb.com/try/download/community dan o'rnating" -ForegroundColor Yellow
    Write-Host "  Yoki MongoDB Atlas (cloud) dan foydalaning va backend/.env da MONGODB_URI ni yangilang" -ForegroundColor Yellow
    Write-Host ""
}

Push-Location "$PSScriptRoot\backend"
try {
    if ($args[0] -eq "prod") {
        npm run prod
    } else {
        npm run dev
    }
}
finally {
    Pop-Location
}
