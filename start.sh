#!/bin/bash
set -e

echo "🚀 Maktab AI ishga tushirilmoqda..."
echo ""

# MongoDB ni ishga tushirish (Linux)
if command -v systemctl &> /dev/null; then
    if ! pgrep -x "mongod" > /dev/null; then
        echo "MongoDB ishga tushirilmoqda..."
        sudo systemctl start mongod || echo "⚠️  MongoDB avtomatik ishga tushmadi. Qo'lda ishga tushiring."
        sleep 2
    fi
fi

cd backend

if [ "$1" == "prod" ]; then
    npm run prod
    echo "✅ Backend PM2 bilan ishga tushdi"
else
    npm run dev
fi
