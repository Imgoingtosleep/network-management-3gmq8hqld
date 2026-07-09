# Network Portal — NDS / CDS

เว็บพอร์ทัลกลางสำหรับทีม **NDS (Network Design Services)** และ **CDS (Core Design Services)**
งานด้าน Network โดยแยกหน้าการทำงานของแต่ละทีมออกจากกันตั้งแต่ต้น แต่ใช้ backend และ component กลางร่วมกัน
เพื่อให้ต่อยอด (เพิ่มทีมใหม่ / เพิ่มฟีเจอร์ใหม่) ได้ง่ายในอนาคต

```
network-portal/
├── backend/     → Node.js + Express REST API (แยก route ตามทีม)
└── frontend/    → React + Vite + TailwindCSS (Black Modern theme)
```

## แนวคิดโครงสร้าง (สำคัญ ต้องอ่านก่อนต่อยอด)

- **แยกตามทีมตั้งแต่ระดับ route/page**: `nds/*` และ `cds/*` แยกกันทั้ง frontend page และ backend route/controller/service/model
  เพื่อไม่ให้โค้ดของสองทีมชนกัน แต่ยังแชร์ layout, component, middleware, utils ร่วมกันได้
- **เพิ่มทีมใหม่ในอนาคต** (เช่น ทีมที่ 3): ทำตามแพทเทิร์นเดิม
  - backend: เพิ่มไฟล์ `routes/<team>.routes.js`, `controllers/<team>.controller.js`, `services/<team>.service.js`, `models/<team>.model.js`
  - frontend: เพิ่มโฟลเดอร์ `pages/<team>/` และเพิ่ม route ใน `AppRoutes.jsx`
- **.env**: ทั้ง 2 ฝั่งมีไฟล์ `.env.example` ให้ copy เป็น `.env` แล้วใส่ค่าจริงเอง (ไม่ถูก commit ขึ้น git)

## เริ่มต้นใช้งาน (Quick start)

### Backend
```bash
cd backend
cp .env.example .env
npm install
npm run dev        # รันที่ http://localhost:4000
```

### Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev         # รันที่ http://localhost:5173
```

## เอกสารเพิ่มเติม
ดูรายละเอียด path/route ทั้งหมดได้ใน `backend/README.md` และ `frontend/README.md` (ถ้ามี) หรือดูคอมเมนต์ในแต่ละไฟล์ route
