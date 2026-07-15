#!/bin/bash

# =================================================================
# NetOps Portal - Professional Auto Update Script (v2.1)
# =================================================================

# กำหนดสีสำหรับ Output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}       NetOps Portal - Automated Update         ${NC}"
echo -e "${BLUE}================================================${NC}"

# --- [Step 0] Pre-flight Checks ---
echo -e "${YELLOW}[0/4] Checking Dependencies...${NC}"

# 1. ตรวจสอบว่ามี Git และ Docker หรือไม่
for cmd in git docker docker-compose; do
    if ! command -v $cmd &> /dev/null; then
        echo -e "${RED}ERROR: ไม่พบคำสั่ง $cmd โปรดติดตั้งก่อนเริ่มงาน${NC}"
        exit 1
    fi
done

# 2. ตรวจสอบว่า Docker กำลังรันอยู่หรือไม่
if ! docker info &> /dev/null; then
    echo -e "${RED}ERROR: Docker Daemon ไม่ทำงาน โปรดเปิด Docker Desktop หรือ Service ก่อน${NC}"
    exit 1
fi

# --- [Step 1] Git Update ---
echo -e "${YELLOW}[1/4] Checking for latest changes from GitHub...${NC}"

# ดึงข้อมูลล่าสุด
git fetch origin main &> /dev/null

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    echo -e "${GREEN}INFO: ระบบเป็นเวอร์ชั่นล่าสุดอยู่แล้ว ($LOCAL)${NC}"
    echo -e "${GREEN}ไม่มีการเปลี่ยนแปลง ไม่ต้องอัปเดต${NC}"
    exit 0
fi

echo -e "${BLUE}Updating from $LOCAL to $REMOTE...${NC}"
if ! git pull origin main; then
    echo -e "${RED}ERROR: ไม่สามารถ Pull โค้ดได้ (โปรดตรวจสอบ Network หรือ Git Conflict)${NC}"
    exit 1
fi

# --- [Step 2] Docker Build & Run ---
echo -e "${YELLOW}[2/4] Rebuilding and Restarting Containers...${NC}"

# ตรวจสอบไฟล์ docker-compose.yml
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}ERROR: ไม่พบไฟล์ docker-compose.yml ในโฟลเดอร์นี้${NC}"
    exit 1
fi

# รัน Docker Compose
if ! docker-compose up --build -d; then
    echo -e "${RED}ERROR: Docker Build หรือ Up ล้มเหลว${NC}"
    exit 1
fi

# --- [Step 3] Validation (Health Check) ---
echo -e "${YELLOW}[3/4] Validating Services...${NC}"
echo -n "Waiting for Backend to be ready..."

MAX_RETRIES=10
COUNT=0
until $(curl --output /dev/null --silent --head --fail http://localhost:2500/health); do
    printf '.'
    sleep 2
    COUNT=$((COUNT+1))
    if [ $COUNT -eq $MAX_RETRIES ]; then
        echo -e "\n${RED}WARNING: Backend ใช้เวลารันนานผิดปกติ โปรดตรวจสอบด้วย 'docker logs netops-portal-backend'${NC}"
        break
    fi
done
echo -e " ${GREEN}READY!${NC}"

# --- [Step 4] Cleanup ---
echo -e "${YELLOW}[4/4] Cleaning up...${NC}"
docker image prune -f &> /dev/null

echo -e "${BLUE}------------------------------------------------${NC}"
echo -e "${GREEN}SUCCESS: ระบบอัปเดตและเริ่มทำงานใหม่เรียบร้อยแล้ว${NC}"
echo -e "Frontend: ${BLUE}http://localhost:2000${NC}"
echo -e "Backend:  ${BLUE}http://localhost:2500/docs${NC}"
echo -e "${BLUE}------------------------------------------------${NC}"
