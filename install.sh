#!/bin/bash
set -e

echo "Maktab AI o'rnatilmoqda..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js topilmadi. https://nodejs.org dan o'rnating."
    exit 1
fi

cd backend
echo "Backend paketlar o'rnatilmoqda..."
npm install

if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ .env yaratildi (.env.example dan)"
fi

cd ..

echo ""
echo "✅ O'rnatish tugadi!"
echo ""
echo "Keyingi qadamlar:"
echo "  1. MongoDB ishga tushirilganini tekshiring"
echo "  2. backend/.env faylida JWT_SECRET ni o'zgartiring"
echo "  3. Ishga tushirish: bash start.sh"
