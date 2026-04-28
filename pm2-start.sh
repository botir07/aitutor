#!/bin/bash
echo "PM2 bilan ishga tushirilmoqda..."
cd backend
pm2 start server.js --name maktab-ai
pm2 save
pm2 startup
echo "✅ PM2 ishga tushdi. 'pm2 status' bilan tekshirishingiz mumkin."
