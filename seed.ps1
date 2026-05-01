# Maktab AI - Seed ma'lumotlarini yuklash
$ErrorActionPreference = "Stop"
Push-Location "$PSScriptRoot\backend"
try {
    node scripts/seed.js
}
finally {
    Pop-Location
}
