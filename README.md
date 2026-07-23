# 🌐 Network Portal — NDS / CDS

เว็บพอร์ทัลกลางสำหรับทีม **NDS (Network Design Services)** และ **CDS (Customer Design Service)** งานด้าน Network โดยแยกหน้าการทำงานของแต่ละทีมออกจากกันตั้งแต่ต้น แต่ใช้ Backend และ Component กลางร่วมกัน เพื่อให้ต่อยอด (เพิ่มทีมใหม่ / เพิ่มฟีเจอร์ใหม่) ได้ง่ายในอนาคต

---

## 📑 สารบัญ

- [สถาปัตยกรรม](#-สถาปัตยกรรม)
- [Tech Stack](#-tech-stack)
- [โครงสร้างโปรเจกต์](#-โครงสร้างโปรเจกต์)
- [เริ่มต้นใช้งาน](#-เริ่มต้นใช้งาน)
- [Environment Variables](#-environment-variables)
- [Backend API Routes](#-backend-api-routes)
- [Frontend Pages](#-frontend-pages)
- [CDS Reserve Flow](#-cds-reserve-flow)
- [การ Deploy ด้วย Docker](#-การ-deploy-ด้วย-docker)
- [แนวทางการต่อยอด](#-แนวทางการต่อยอด)

---

## 🏗 สถาปัตยกรรม

```
┌──────────────────────────────────────────────────────────┐
│                     Frontend (React)                     │
│              Vite + TailwindCSS + React Router           │
│                    Port: 2000 (Docker)                   │
├────────────────────────┬─────────────────────────────────┤
│      NDS Pages         │          CDS Pages              │
│  (Devices, PEs, AGGs,  │  (Dashboard, Search & Reserve,  │
│   Prefixes, Domains,   │   Topology Map, Devices,        │
│   Rings, Sites, VLANs) │   VLANs, Domain IP, Site Code)  │
└────────────┬───────────┴──────────────┬──────────────────┘
             │          REST API        │
             ▼                          ▼
┌────────────────────────────────────────────────────────────┐
│                   Backend (Express.js)                     │
│                    Port: 2500 (Docker)                     │
├────────────────────────┬──────────────────────────────────┤
│   /api/nds/*           │        /api/cds/*                │
│   nds.controller.js    │        cds.controller.js         │
│   nds.service.js       │        cds.service.js            │
│   nds.model.js         │        cds.model.js              │
└────────────┬───────────┴──────────────┬──────────────────┘
             │       NetBox REST API    │
             ▼                          ▼
┌────────────────────────────────────────────────────────────┐
│                    NetBox (DCIM/IPAM)                      │
│              netbox.service.js (Shared Service)            │
└────────────────────────────────────────────────────────────┘
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite 5, TailwindCSS 3, React Router 6, Axios |
| **Backend** | Node.js, Express 4, Helmet, Morgan, CORS |
| **Data Source** | NetBox REST API (DCIM / IPAM) |
| **Deployment** | Docker Compose |
| **Dev Tools** | Nodemon, PostCSS, Autoprefixer |

---

## 📂 โครงสร้างโปรเจกต์

```
network-management/
├── .env.example              # ตัวอย่าง Environment Variables
├── docker-compose.yml        # Docker Compose สำหรับ Deploy
├── rebuild.sh                # Script สำหรับ Rebuild Docker
├── update.sh                 # Script สำหรับ Update
│
├── backend/
│   └── src/
│       ├── app.js            # Express App Setup
│       ├── server.js         # Server Entry Point
│       ├── config/           # App Configuration
│       ├── middlewares/       # Error Handler, Not Found
│       ├── routes/
│       │   ├── index.js      # Route Mapping (/api/nds, /api/cds)
│       │   ├── nds.routes.js # NDS API Routes
│       │   └── cds.routes.js # CDS API Routes
│       ├── controllers/
│       │   ├── nds.controller.js
│       │   └── cds.controller.js
│       ├── services/
│       │   ├── netbox.service.js  # NetBox API Integration (Shared)
│       │   ├── nds.service.js     # NDS Business Logic
│       │   └── cds.service.js     # CDS Business Logic + Reserve Flow
│       └── models/
│           ├── nds.model.js       # NDS In-Memory Data
│           └── cds.model.js       # CDS In-Memory Data (Dashboard)
│
└── frontend/
    └── src/
        ├── App.jsx           # Root Component
        ├── main.jsx          # Entry Point
        ├── index.css         # Global Styles
        ├── api/              # Axios API Clients
        ├── components/       # Shared UI Components
        ├── layouts/          # Layout Wrappers
        ├── routes/           # React Router Config
        └── pages/
            ├── HomePage.jsx
            ├── LoginPage.jsx
            ├── NotFoundPage.jsx
            ├── nds/          # NDS Team Pages (12 files)
            └── cds/          # CDS Team Pages (12 files)
```

---

## 🚀 เริ่มต้นใช้งาน

### Prerequisites

- Node.js >= 18
- npm >= 9
- NetBox instance + API Token

### Backend

```bash
cd backend
cp .env.example .env          # แก้ไขค่า NETBOX_API_URL, NETBOX_API_TOKEN
npm install
npm run dev                   # http://localhost:4000
```

### Frontend

```bash
cd frontend
cp .env.example .env          # แก้ไขค่า VITE_API_BASE_URL
npm install
npm run dev                   # http://localhost:5173
```

---

## 🔑 Environment Variables

| ตัวแปร | คำอธิบาย | ค่าเริ่มต้น |
|--------|---------|------------|
| `PORT` | พอร์ตของ Backend Server | `4000` |
| `NODE_ENV` | Environment Mode | `development` |
| `CORS_ORIGIN` | URL ที่อนุญาตให้เข้าถึง API | `http://localhost:2000` |
| `VITE_API_BASE_URL` | Base URL ของ API สำหรับ Frontend | `http://localhost:2500/api` |
| `NETBOX_API_URL` | URL ของ NetBox API | `https://demo.netbox.dev/api` |
| `NETBOX_API_TOKEN` | API Token สำหรับ NetBox | - |
| `DB_*` | Database Config (สำหรับอนาคต) | - |
| `JWT_*` | Auth Config (สำหรับอนาคต) | - |

---

## 📡 Backend API Routes

### NDS Routes (`/api/nds`)

| Method | Endpoint | คำอธิบาย |
|--------|----------|---------|
| GET | `/projects` | ดึงรายการโปรเจกต์ NDS |
| GET | `/devices` | ดึงอุปกรณ์ทั้งหมดจาก NetBox |
| GET | `/devices/:id/interfaces` | ดึง Interface ของอุปกรณ์ |
| GET | `/interface-templates/:deviceTypeId` | ดึง Interface Templates ตาม Device Type |
| GET | `/device-types` | ดึงประเภทอุปกรณ์ |
| GET | `/device-roles` | ดึง Device Roles |
| GET | `/sites` | ดึงข้อมูล Sites |
| GET | `/prefixes` | ดึง IP Prefixes |
| GET | `/pes` | ดึงอุปกรณ์ PE ทั้งหมด |
| GET | `/aggs` | ดึงอุปกรณ์ AGG ทั้งหมด |
| GET | `/lsw_nts` | ดึง LSW Network ทั้งหมด |
| GET | `/vlans` | ดึง VLANs |
| GET | `/domains` | ดึง Domains |
| GET | `/rings` | ดึง Rings |
| POST/PATCH/DELETE | `/sites/:id`, `/prefixes/:id`, `/devices/:id` | CRUD Operations |

### CDS Routes (`/api/cds`)

| Method | Endpoint | คำอธิบาย |
|--------|----------|---------|
| GET | `/projects` | ดึงรายการโปรเจกต์ CDS |
| GET | `/dashboard` | ดึงข้อมูล Dashboard (ข้อมูลที่ Reserve แล้ว) |
| POST | `/dashboard` | บันทึกข้อมูล Reserve ใหม่ + สร้าง Device ใน NetBox |
| GET | `/topology/:siteCode` | ดึง Site Topology |
| GET | `/path-trace/:ip` | Trace Path จาก IP ไปยัง PE Router |
| GET | `/device-details/:id` | ดึงรายละเอียดอุปกรณ์ |
| GET | `/available-ips/:prefix` | ดึง IP ที่ว่างใน Prefix |

---

## 🖥 Frontend Pages

### CDS Pages

| หน้า | ไฟล์ | คำอธิบาย |
|------|------|---------|
| **Dashboard** | `CDSDashboardPage.jsx` | ตารางแสดงข้อมูลที่ Reserve แล้ว (Node + VLAN tabs) |
| **Search & Reserve** | `CDSSearchReservePage.jsx` | ฟอร์มค้นหา/สร้าง Node + จองพอร์ต (2 Steps) |
| **Topology Map** | `CDSTopologyMapPage.jsx` | แผนผัง Network Topology แบบ Interactive |
| **Devices** | `CDSDevicesPage.jsx` | จัดการอุปกรณ์ใน NetBox |
| **VLANs** | `CDSVlansPage.jsx` | จัดการ VLANs |
| **Domain IP** | `CDSDomainIPPage.jsx` | จัดการ Domain IP |
| **Site Code** | `CDSSiteCodePage.jsx` | จัดการ Site Code |
| **Models** | `CDSModelsPage.jsx` | จัดการ Device Models |
| **Bulk Import** | `CDSBulkImportPage.jsx` | นำเข้าข้อมูลจำนวนมาก |

### NDS Pages

| หน้า | ไฟล์ | คำอธิบาย |
|------|------|---------|
| **Devices** | `DevicesPage.jsx` | จัดการอุปกรณ์ Network |
| **PEs** | `PEsPage.jsx` | จัดการ Provider Edge Routers |
| **AGGs** | `AggsPage.jsx` | จัดการ Aggregation Switches |
| **LSW Networks** | `LswNtsPage.jsx` | จัดการ LSW Network Switches |
| **Prefixes** | `PrefixesPage.jsx` | จัดการ IP Prefixes |
| **Sites** | `SitesPage.jsx` | จัดการ Sites |
| **Domains** | `DomainsPage.jsx` | จัดการ Domains |
| **Rings** | `RingsPage.jsx` | จัดการ Ring Networks |
| **VLANs** | `NDSVlansPage.jsx` | จัดการ VLANs |

---

## 🔄 CDS Reserve Flow

ขั้นตอนการทำงานเมื่อผู้ใช้กด **Reserve** ในหน้า Search & Reserve:

```
Frontend (CDSSearchReservePage.jsx)
  │
  ├─ 1. สร้าง Payload จากข้อมูลในฟอร์ม
  ├─ 2. บันทึกลง LocalStorage
  └─ 3. ส่ง POST /api/cds/dashboard
         │
         ▼
Backend (cds.service.js → addDashboardData)
  │
  ├─ Step 1:   สร้าง Device (LSW Access) ใน NetBox
  │             → resolveDeviceTypeId() → resolveRoleId() → resolveSiteId()
  │             → createOrGetDevice()
  │
  ├─ Step 1.5: สร้าง Vlanif Interface + ผูก Primary IP
  │             → setupVlanifAndPrimaryIp()
  │
  ├─ Step 2:   อัปเดต Port Uplink บน LSW Access → reserve
  │             → reservePorts(accessDeviceId, [uplink, uplink_backup])
  │             → label='Fiber', description='In Reserve', port_status='reserve'
  │
  ├─ Step 3:   อัปเดต Port Downlink บน LSW Network → reserve
  │             → findDeviceByNameOrNodeId() → reservePorts()
  │             → label='Fiber', description='In Reserve', port_status='reserve'
  │
  ├─ Step 4:   สร้าง Cable Links + ตั้งค่า VLAN
  │             → setupCablingAndVlan()
  │             → Main Cable: Access Uplink ↔ Network Downlink
  │             → Backup Cable: Access Uplink Backup ↔ Network Downlink Backup
  │             → VLAN mode=access, untagged_vlan
  │
  ├─ Step 5:   อัปเดต PE Port → reserve (ถ้ามี)
  │             → reservePePort()
  │
  └─ Final:    บันทึกลง In-Memory Model
```

### Dashboard Field Mapping

| Dashboard Header | Payload Key | แหล่งข้อมูล |
|-----------------|-------------|-------------|
| PE Name | `pe_name` | PE Router ที่เชื่อมต่อ |
| IP Loopback | `ip_loopback` | IP ของ PE |
| Port Downlink Main (NW LSW) | `nw_lsw_port` | พอร์ตฝั่ง LSW Network |
| Port Downlink Backup (NW LSW) | `nw_lsw_port_backup` | พอร์ตสำรอง LSW Network |
| Port Uplink Main | `access_lsw_port_uplink` | พอร์ตขาขึ้น LSW Access |
| Port Uplink Backup | `access_lsw_port_uplink_backup` | พอร์ตสำรองขาขึ้น LSW Access |
| IP Network | `agg_ip_network` | Prefix ที่เลือก |
| VLAN | `agg_vlan` | VLAN ID ที่เลือก |

---

## 🐳 การ Deploy ด้วย Docker

```bash
# Build & Start ทั้ง Frontend + Backend
docker-compose up -d --build

# ดู Logs
docker-compose logs -f

# Stop
docker-compose down
```

| Service | Container Name | Port |
|---------|---------------|------|
| Frontend | `netops-portal-frontend` | `2000` |
| Backend | `netops-portal-backend` | `2500` |

---

## 🔧 แนวทางการต่อยอด

### เพิ่มทีมใหม่ (เช่น ทีม OPS)

```
Backend:
  ├── routes/ops.routes.js
  ├── controllers/ops.controller.js
  ├── services/ops.service.js
  └── models/ops.model.js
  → เพิ่มใน routes/index.js: router.use('/ops', opsRoutes)

Frontend:
  └── pages/ops/
      ├── OPSLayout.jsx
      ├── OPSHomePage.jsx
      └── ...
  → เพิ่ม route ใน routes/AppRoutes.jsx
```

### เพิ่มฟีเจอร์ใหม่ใน CDS

1. **เพิ่ม API Route** ใน `cds.routes.js`
2. **เพิ่ม Controller** ใน `cds.controller.js`
3. **เพิ่ม Business Logic** ใน `cds.service.js`
4. **เพิ่มหน้า Frontend** ใน `pages/cds/`
5. **เพิ่ม Route** ใน `AppRoutes.jsx`

### Shared Services

- `netbox.service.js` — ใช้ร่วมกันทุกทีม สำหรับติดต่อ NetBox API
- มี **in-memory cache** (TTL 5 นาที) สำหรับ Devices, Prefixes, Sites, VLANs
- ใช้ `fetchNetboxApi()` helper สำหรับ CRUD operations ทั้งหมด

---

## 📄 License

Private — Internal Use Only
