#!/bin/bash
set -e

echo "Maktab AI platformasi o'rnatilmoqda..."

# Backend qaramliklarni o'rnatish
cd backend
echo "Backend paketlar o'rnatilmoqda..."
npm install
cd ..

echo ""
echo "✅ O'rnatish muvaffaqiyatli yakunlandi!"
echo ""
echo "Ishga tushirish uchun:"
echo "  bash start.sh"
