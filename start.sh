#!/bin/bash
set -e

echo "🚀 Maktab AI ishga tushirilmoqda..."
echo ""

# MongoDB ni ishga tushirish
if ! pgrep -x "mongod" > /dev/null; then
    echo "MongoDB ishga tushirilmoqda..."
    sudo systemctl start mongod
    sleep 2
fi

# Backend serverni ishga tushirish
echo "Backend server ishga tushirilmoqda..."
cd backend

if [ "$1" == "prod" ]; then
    npm run prod
    echo "✅ Backend PM2 bilan ishga tushdi"
else
    npm run dev &
    echo "✅ Backend development rejimida ishga tushdi"
fi

cd ..

echo ""
echo "========================================="
echo "  Maktab AI muvaffaqiyatli ishga tushdi!"
echo "========================================="
echo ""
echo "Backend: http://localhost:5000"
echo "Frontend: http://localhost:3000"
echo ""
echo "To'xtatish uchun: Ctrl+C"
