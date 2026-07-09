#!/bin/bash

# --- 1. แสดงข้อความเริ่มการทำงาน ---
echo "🚀 Starting Clean Rebuild of NetOps-Portal (Frontend & Backend)..."

# --- 2. ล้าง Build Cache และรันระบบใหม่ ---
# --no-cache: บังคับให้โหลดทุกอย่างใหม่ตั้งแต่บรรทัดแรก
# -d: รันในโหมดเบื้องหลัง (Detached mode)
echo "📦 Building and starting containers (No Cache)..."
docker-compose build --no-cache && docker-compose up -d

# เลือกทำเฉพาะ frontend และ backend ที่ต้องการ rebuild
# docker-compose up -d --build frontend
# docker-compose up -d --build backend

# --- 3. ล้างขยะ Docker ที่ไม่ได้ใช้ ---
echo "🧹 Cleaning up unused Docker resources..."
docker system prune -f

# --- 4. แสดงสถานะหลังรันเสร็จ ---
echo "✅ Rebuild complete! Current status:"
# เปลี่ยนจาก netprobe เป็น netops เพื่อให้ตรงกับชื่อ container_name ใน docker-compose.yml
docker ps | grep netops