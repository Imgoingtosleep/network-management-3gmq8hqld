# Network Management Portal — NDS / CDS on NetBox

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-06B6D4?style=flat&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=flat&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com/)
[![NetBox](https://img.shields.io/badge/NetBox-DCIM%20%2F%20IPAM-2D9CDB?style=flat)](https://netbox.dev/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)

**เว็บพอร์ทัลกลางของทีม NDS (Network Design Services) และ CDS (Customer Design Service) ที่ใช้ NetBox เป็น Source of Truth — จัดการ Site, Device, Device/Module Type, IP Prefix, VRF, VLAN, เปลี่ยนรุ่นอุปกรณ์พร้อมย้าย Interface/IP แบบมี Rollback, จองพอร์ตให้ลูกค้า และ Trace เส้นทาง PE ↔ AGG ↔ LSW จาก IP เดียว**

ปัญหาที่แก้: งานออกแบบเครือข่ายใน NetBox ต้องคลิกหลายหน้า (สร้างอุปกรณ์ → สร้าง Interface → ผูก IP → ลากสาย → ตั้ง VLAN → ติดสถานะพอร์ต) และทำซ้ำทุกครั้งที่เปลี่ยนรุ่นอุปกรณ์หรือจองพอร์ตให้ลูกค้า — พอร์ทัลนี้รวมขั้นตอนเหล่านั้นเป็น workflow เดียวต่อทีม ผ่าน NetBox REST API โดยแยกสิทธิ์ NDS / CDS

![Path Trace](docs/screenshots/22-cds-topology-map.png)

---

## สารบัญ

1. [Architecture & Network Topology](#1-architecture--network-topology)
2. [Key Features](#2-key-features)
3. [Tech Stack](#3-tech-stack)
4. [Getting Started](#4-getting-started)
5. [Usage](#5-usage)
6. [Demo / Output](#6-demo--output)
7. [API Reference](#7-api-reference)
8. [Project Structure](#8-project-structure)
9. [Extending the Portal](#9-extending-the-portal)
10. [Known Issues & Security Notes](#10-known-issues--security-notes)

---

## 1. Architecture & Network Topology

### 1.1 System Architecture

```mermaid
flowchart LR
    subgraph Users["ผู้ใช้"]
        NDSU["ทีม NDS"]
        CDSU["ทีม CDS"]
        ADM["Admin (ทั้ง 2 ทีม)"]
    end

    subgraph Docker["Docker Compose (netops-network)"]
        FE["netops-portal-frontend<br/>React + Vite<br/>:2000"]
        BE["netops-portal-backend<br/>Express<br/>host :2500 → :4000"]
        CACHE[("In-memory<br/>cache 5 นาที<br/>+ snapshots<br/>+ CDS dashboard")]
    end

    NB[("NetBox<br/>DCIM / IPAM<br/>REST API")]

    NDSU & CDSU & ADM -->|HTTP :2000| FE
    FE -->|"REST /api + Bearer JWT"| BE
    BE --- CACHE
    BE -->|"Authorization: Token ..."| NB
```

| Service | Container | Port |
| :--- | :--- | :--- |
| Frontend | `netops-portal-frontend` | 2000 |
| Backend | `netops-portal-backend` | 2500 (host) → 4000 (container) |
| NetBox | ภายนอก (`NETBOX_API_URL`) | — |

### 1.2 Network Hierarchy ที่ระบบจัดการ

ระบบออกแบบให้ตรงกับโครงสร้างเครือข่าย Metro/Access: **PE → AGG → LSW Network → LSW Access** และใช้ NetBox role, cable, interface, IP และ VLAN แทนเส้นทางจริง

```mermaid
flowchart TB
    PE1["PE-BKK-CORE-01<br/>Provider Edge<br/>Loopback 10.0.0.1"] -->|"Gi0/1/1 ↔ 10GE1/0/1"| AGG1["AGG-BKK-LPR-01<br/>Aggregation"]
    PE2["PE-BKK-CORE-02<br/>Provider Edge"] --> AGG2["AGG-NBI-01<br/>Aggregation"]
    AGG1 -->|"10GE1/0/2 ↔ XGE0/0/1"| NW1["LSW-NW-LPR-01<br/>LSW_Network"]
    AGG2 --> NW2["LSW-NW-NBI-01<br/>LSW_Network"]
    NW1 -->|"Downlink main / backup<br/>(reserve)"| AC1["LSW-AC-LPR-0101<br/>LSW Access<br/>Vlanif100 10.10.1.11/24"]
    NW2 --> AC2["LSW-AC-NBI-0201<br/>LSW Access"]
    AC1 -.-> CUST["ลูกค้า<br/>VLAN access / untagged"]
```

### 1.3 CDS Search & Reserve Flow

```mermaid
sequenceDiagram
    participant U as CDS User
    participant FE as Search & Reserve
    participant BE as cds.service.js
    participant NB as NetBox

    U->>FE: เลือก LSW Network + กรอก Node / พอร์ต / Prefix / VLAN
    FE->>BE: POST /api/cds/dashboard
    BE->>NB: 1. สร้าง/หา Device LSW Access (type, role, site)
    BE->>NB: 1.5 สร้าง Vlanif + ผูก Primary IP
    BE->>NB: 2. Uplink main/backup ของ Access → label Fiber, "In Reserve"
    BE->>NB: 3. Downlink main/backup ของ LSW Network → reserve
    BE->>NB: 4. สร้าง Cable main/backup + ตั้ง VLAN access (untagged)
    BE->>NB: 5. PE port → reserve (ถ้ามี)
    BE-->>FE: บันทึกลง Dashboard
```

### 1.4 NDS Replace Device Flow

```mermaid
flowchart LR
    A["เลือกอุปกรณ์เดิม"] --> B["เลือก Device Type ใหม่"]
    B --> C["Map interface เก่า → ใหม่<br/>(VLAN, description, cable, IP)"]
    C --> D["เลือก Vlanif / IP mode<br/>+ โมดูลที่จะติดตั้ง"]
    D --> E["Snapshot ก่อนเปลี่ยน"]
    E --> F["ถอดโมดูลเดิม → เปลี่ยน type<br/>→ ย้าย config → ติดตั้งโมดูล"]
    F --> G{"ผลถูกต้อง?"}
    G -->|ใช่| H["เสร็จ"]
    G -->|ไม่| R["Rollback จาก snapshot"]
```

---

## 2. Key Features

### Portal & Access Control
- Login แยกบัญชี **NDS / CDS / Admin** → JWT (HMAC-SHA256) หมดอายุตาม `JWT_EXPIRES_IN`
- Backend บังคับสิทธิ์ทีมที่ router (`/api/nds/*`, `/api/cds/*`) และ frontend มี `ProtectedRoute` ต่อทีม
- Hub หน้าแรกเลือกเข้า NDS หรือ CDS

### NDS — Network Design Services
| หน้า | ความสามารถ |
| :--- | :--- |
| **Site Management** | CRUD Site พร้อม region, ชื่อไทย/อังกฤษ (custom fields) |
| **Devices** | CRUD อุปกรณ์, กรองตาม role, ผูก Primary/OOB IP อัตโนมัติ |
| **Device Types** | สร้าง Device Type + Port Template / เพิ่มพอร์ตเป็นชุด |
| **Module Types** | สร้าง Module Type และ interface template ของโมดูล |
| **Sync Interfaces** | Bulk sync interface ของอุปกรณ์ให้ตรงกับ template ของ Device/Module Type (Add missing / Sync & update) |
| **Module Bays** | ลากโมดูลใส่ Module Bay ของอุปกรณ์ (Drag & Drop) |
| **Replace Device** | เปลี่ยนรุ่นอุปกรณ์: map interface เก่า→ใหม่, ย้าย VLAN/IP/cable, เลือก Vlanif, ติดตั้งโมดูล, **snapshot + rollback** |
| **IP Management** | Prefix พร้อม VRF, ring name, VLAN, utilization |
| **Domains** | VRF list + prefix/IP ในแต่ละ VRF |
| **VLANs** | รายการ VLAN / VLAN group |

### CDS — Customer Design Service
| หน้า | ความสามารถ |
| :--- | :--- |
| **Dashboard** | รายการที่จองแล้ว (Node / VLAN) + Export CSV |
| **Search & Reserve** | 2 ขั้นตอน: เลือก LSW Network → จองพอร์ต (สร้าง device, IP, cable, VLAN ใน NetBox ให้อัตโนมัติ) |
| **Topology Map** | **Path Trace** จาก IP/Node ID → แสดง Subnet, gateway, VLAN, อุปกรณ์และพอร์ตเชื่อมต่อทีละชั้น · **Site Topology** จาก Site Code |
| **Bulk Import** | นำเข้า CSV (LSW Network, IP Prefix, IP Address, PE Port Map) |
| **Domain** | Domain → Aggregation devices → IP network → IP address |
| **VLANs / VLAN Assign** | สร้าง VLAN, ดู VLAN group/prefix, assign VLAN ให้ลูกค้าที่จองแล้ว |
| **Devices / Models / Site Code** | ค้นหาอุปกรณ์, รายละเอียดรุ่นและจำนวน interface, รายการ Site Code |

### Backend
- `netbox.service.js` เป็น shared service ของทุกทีม: pagination อัตโนมัติ, cache 5 นาที, ตรวจ custom field ที่มีจริงก่อนส่ง
- Helmet, CORS whitelist, Morgan request log, error handler กลาง, format response `{ success, message, data }`

---

## 3. Tech Stack

| Layer | เครื่องมือ |
| :--- | :--- |
| Frontend | **React 18**, **Vite 5**, **Tailwind CSS 3**, React Router 6, Axios |
| Backend | **Node.js 22**, **Express 4**, Helmet, Morgan, CORS, JWT (เขียนเองด้วย `crypto`) |
| Source of Truth | **NetBox REST API** — DCIM (sites, devices, types, modules, interfaces, cables) + IPAM (prefixes, IPs, VRFs, VLANs) |
| Infra | **Docker Compose**, Nginx (production frontend image) |
| Scripts | `update.sh` (auto update), `rebuild.sh`, `sync-code.sh` |

---

## 4. Getting Started

### 4.1 Prerequisites

| รายการ | รายละเอียด |
| :--- | :--- |
| Docker + Compose | Docker 24+ |
| NetBox | 4.x ที่เข้าถึงได้จาก backend + **API token แบบ v1** (`Authorization: Token <key>`) ที่มีสิทธิ์เขียน |
| NetBox data model | device role ชื่อ `Provider Edge`, `Aggregation`, `LSW_Network`, `LSW Access` · custom fields ที่รองรับ: `name_thai`, `site_name` (site), `nodeid` (device), `ringname` (prefix), `owner_group`, `owner`, `port_status` |
| Port ว่าง | 2000, 2500 |
| (ไม่ใช้ Docker) | Node.js 18+ |

### 4.2 Clone & Environment

```bash
git clone git@github.com:Imgoingtosleep/network-management.git
cd network-management
cp .env.example .env
```

```ini
PORT=4000
CORS_ORIGIN=http://localhost:2000
VITE_API_BASE_URL=http://localhost:2500/api

JWT_SECRET=change-me-long-random
JWT_EXPIRES_IN=1d

AUTH_NDS_USERNAME=nds
AUTH_NDS_PASSWORD=change-me
AUTH_CDS_USERNAME=cds
AUTH_CDS_PASSWORD=change-me
AUTH_ADMIN_USERNAME=admin
AUTH_ADMIN_PASSWORD=change-me

NETBOX_API_URL=https://netbox.example.com/api
NETBOX_API_TOKEN=<40-char v1 token>
```

### 4.3 Run

```bash
docker compose up -d --build
curl http://localhost:2500/api/health
# {"success":true,"message":"network-portal API is healthy","timestamp":"..."}
```

เปิด **http://localhost:2000** แล้ว login ด้วยบัญชีใน `.env`

อัปเดตโค้ดบน server: `./update.sh`

### 4.4 Run แบบไม่ใช้ Docker

```bash
cd backend && npm install && npm run dev      # :4000
cd frontend && npm install && npm run dev     # :5173 (ตั้ง VITE_API_BASE_URL=http://localhost:4000/api)
```

---

## 5. Usage

| บทบาท | เข้าได้ |
| :--- | :--- |
| `nds` | Hub + NDS |
| `cds` | Hub + CDS |
| `admin` | ทั้งหมด |

- **เปลี่ยนรุ่นอุปกรณ์ (NDS)**: Replace Device → เลือกอุปกรณ์ → เลือก Model ใหม่ → จับคู่ interface → ยืนยัน → ตรวจผล / Rollback
- **เพิ่ม interface ให้ตรง template (NDS)**: Sync Interfaces → เลือก Model หรืออุปกรณ์ → Add missing / Sync & update
- **จองพอร์ตลูกค้า (CDS)**: Search & Reserve → เลือก LSW Network → กรอก node, พอร์ต main/backup, prefix, VLAN → Reserve → ดูใน Dashboard
- **หาเส้นทาง (CDS)**: Topology Map → กรอก IP หรือ Node ID → Start Trace

---

## 6. Demo / Output

> ภาพถ่ายจากระบบที่รันจริงด้วย Docker Compose (headless Chrome 1440×900) ต่อกับ **NetBox 4.6 ทดสอบที่ตั้งขึ้นแยก** และใส่ข้อมูลสมมติ (4 sites, 9 อุปกรณ์ Huawei, cables, 6 prefixes, 3 VRFs, 5 VLANs) — ไม่ใช่ข้อมูลเครือข่ายจริง

### 6.1 Login & Hub
| Login | Hub |
| :---: | :---: |
| ![](docs/screenshots/01-login.png) | ![](docs/screenshots/02-home.png) |

### 6.2 NDS
| Site Management | Devices |
| :---: | :---: |
| ![](docs/screenshots/10-nds-sites.png) | ![](docs/screenshots/11-nds-devices.png) |
| **Device Types** | **Module Types** |
| ![](docs/screenshots/12-nds-device-types.png) | ![](docs/screenshots/13-nds-module-types.png) |
| **Sync Interfaces** | **Module Bays (Drag & Drop)** |
| ![](docs/screenshots/14-nds-sync-interfaces.png) | ![](docs/screenshots/15-nds-module-bays.png) |
| **Replace Device** | **IP Management (Prefix)** |
| ![](docs/screenshots/16-nds-replace-device.png) | ![](docs/screenshots/17-nds-prefixes.png) |
| **Domains (VRF)** | **VLANs** |
| ![](docs/screenshots/18-nds-domains.png) | ![](docs/screenshots/19-nds-vlans.png) |

### 6.3 CDS
| Dashboard | Search & Reserve |
| :---: | :---: |
| ![](docs/screenshots/20-cds-dashboard.png) | ![](docs/screenshots/21-cds-search-reserve.png) |
| **Topology Map — Path Trace `10.10.1.11`** | **Bulk Import** |
| ![](docs/screenshots/22-cds-topology-map.png) | ![](docs/screenshots/23-cds-bulk-import.png) |
| **Domain → AGG → IP** | **Domain (VRF)** |
| ![](docs/screenshots/24-cds-domain-ip.png) | ![](docs/screenshots/25-cds-domain-demo.png) |
| **VLANs** | **VLAN Assign** |
| ![](docs/screenshots/26-cds-vlans.png) | ![](docs/screenshots/27-cds-vlan-assign.png) |
| **Devices** | **Models** |
| ![](docs/screenshots/28-cds-devices.png) | ![](docs/screenshots/29-cds-models.png) |
| **Site Code** | |
| ![](docs/screenshots/30-cds-site-code.png) | |

### 6.4 Terminal

```bash
$ curl -s localhost:2500/api/health
{"success":true,"message":"network-portal API is healthy","timestamp":"2026-09-17T09:38:59.033Z"}

$ curl -s -X POST localhost:2500/api/auth/login -H 'content-type: application/json' \
    -d '{"username":"admin","password":"***"}'
{"success":true,"message":"เข้าสู่ระบบสำเร็จ","data":{"token":"eyJ...","user":{"username":"admin","role":"admin","allowedTeams":["nds","cds"]}}}
```

Backend log (Morgan) — สังเกต cache ของ NetBox (ครั้งแรก 257 ms, ครั้งถัดไป ~1 ms):

```text
POST /api/auth/login 200 0.959 ms - 466
GET /api/nds/pes 200 257.235 ms - 292
⚡ [Cache] Returning cached NetBox devices
GET /api/nds/devices 200 1.642 ms - 9394
GET /api/nds/sites 200 1.203 ms - 1768
GET /api/nds/regions 200 38.418 ms - 192
```

---

## 7. API Reference

Base: `http://localhost:2500/api` — `/nds/*` และ `/cds/*` ต้องมี `Authorization: Bearer <JWT>` และสิทธิ์ทีม

### Auth
| Method | Path | คำอธิบาย |
| :--- | :--- | :--- |
| GET | `/health` | สถานะ API |
| POST | `/auth/login` | login → JWT |
| GET | `/auth/me` | ผู้ใช้ปัจจุบัน |
| GET | `/auth/info` | รายชื่อบัญชี/ทีม (สำหรับหน้า Login) |

### NDS (`/nds`)
| กลุ่ม | Endpoints |
| :--- | :--- |
| Devices | `GET/POST /devices` · `PUT/DELETE /devices/:id` · `GET /devices/:id/interfaces` · `PATCH /interfaces/:interfaceId` |
| Replace / Sync | `POST /devices/sync-interfaces` · `POST /devices/replace` · `POST /devices/rollback` · `GET /devices/snapshots/:snapshotId` |
| Device types | `GET/POST /device-types` · `GET/POST /device-types/:id/interfaces` · `GET/POST /port-presets` · `GET /interface-type-choices` |
| Modules | `GET/POST /module-types` · `PATCH/DELETE /module-types/:id` · `GET/POST /module-types/:id/interfaces` · `PATCH/DELETE /interface-templates/:id` · `GET /device-types/:id/module-bays` · `GET /devices/:id/module-bays` · `POST /module-bays/install` · `DELETE /modules/:moduleId` |
| Lookups | `/device-roles` `/tenants` `/tenant-groups` `/locations` `/racks` `/platforms` `/config-templates` `/clusters` `/virtual-chassises` `/tags` `/regions` `/vlans` · `GET /netbox-redirect` |
| CRUD resources | `sites` `prefixes` `pes` `aggs` `lsw_nts` `domains` `rings` → `GET/POST /{resource}` · `PUT/DELETE /{resource}/:id` |
| Projects | `GET/POST /projects` · `GET /projects/:id` |

### CDS (`/cds`)
| กลุ่ม | Endpoints |
| :--- | :--- |
| Dashboard / Reserve | `GET/POST /dashboard` · `PATCH /dashboard/:id` |
| Topology | `GET /topology` · `GET /topology/:site_code` · `GET /path-trace?query=` (หรือ `?ip=`) · `GET /device-details/:id` |
| IPAM | `GET /prefixes` · `GET /ip-addresses` · `GET /available-ips` · `GET/POST /vlans` · `GET /vlan-roles` · `GET /vlan-groups` |
| Other | `GET /sites` · `GET/POST /projects` · `GET /projects/:id` |

---

## 8. Project Structure

```text
network-management/
├── docker-compose.yml         # frontend :2000, backend :2500
├── .env.example
├── update.sh / rebuild.sh / sync-code.sh
├── backend/
│   ├── Dockerfile / Dockerfile.dev / nodemon.json
│   └── src/
│       ├── server.js, app.js          # helmet, cors, morgan, error handler
│       ├── config/                    # env → config, บัญชีผู้ใช้ต่อทีม
│       ├── middlewares/               # verifyToken, requireTeam, errorHandler, notFound
│       ├── routes/                    # index (/auth, /nds, /cds), nds.routes, cds.routes
│       ├── controllers/               # auth, nds, cds
│       ├── services/
│       │   ├── netbox.service.js      # NetBox API shared (~2,800 บรรทัด): cache, replace, rollback, modules
│       │   ├── nds.service.js
│       │   └── cds.service.js         # Reserve flow, path trace, topology
│       ├── models/                    # in-memory data (fallback / dashboard)
│       └── utils/                     # jwt.js, apiResponse.js
├── frontend/
│   ├── Dockerfile / Dockerfile.dev / nginx.conf
│   └── src/
│       ├── routes/AppRoutes.jsx       # /login, /, /nds/*, /cds/*
│       ├── context/AuthContext.jsx
│       ├── api/                       # axiosClient + auth / nds / cds
│       ├── components/                # Navbar, Sidebar, ProtectedRoute, NetworkGraphic, ...
│       └── pages/
│           ├── nds/                   # 16 ไฟล์ (รวม NDSLayout)
│           └── cds/                   # 13 ไฟล์ (รวม CDSLayout)
└── docs/screenshots/
```

---

## 9. Extending the Portal

เพิ่มทีมใหม่ (เช่น OPS):

```text
Backend:  routes/ops.routes.js → controllers/ops.controller.js → services/ops.service.js
          routes/index.js: router.use('/ops', verifyToken, requireTeam('ops'), opsRoutes)
          config/index.js: เพิ่มบัญชีและ allowedTeams ['ops']
Frontend: pages/ops/OPSLayout.jsx, OPSHomePage.jsx → เพิ่ม route ใน AppRoutes.jsx
```

เพิ่มฟีเจอร์ใน CDS: route → controller → service (เรียก `netbox.service.js`) → page → route

---

## 10. Known Issues & Security Notes

ตรวจจากโค้ดและทดสอบกับระบบ demo

| # | ปัญหา | ผลกระทบ | แนวทางแก้ |
| :--- | :--- | :--- | :--- |
| 1 | รหัสผ่านมีค่า default ในโค้ด (`nds_password`, `cds_password`, `admin_password`) และ `JWT_SECRET` default | ถ้าไม่ตั้ง `.env` ใครก็ login เป็น admin หรือปลอม JWT ได้ | บังคับตั้งค่า ไม่ใช้ default |
| 2 | รหัสผ่านเก็บเป็น plain text ใน `.env` และเทียบตรง ๆ, ไม่มี rate limit ที่ `/auth/login` | brute force ได้ | hash + rate limit / ใช้ SSO |
| 3 | `GET /auth/info` (ไม่ต้อง login) คืนรายชื่อ username ทุกบัญชี | ช่วยผู้โจมตีเดา username | แสดงเฉพาะชื่อทีม |
| 4 | `getAllPEs` / `getAllAGGs` / `getAllLswNts` กรองด้วย `d.device_role?.name` แต่ object ที่ map แล้วมีแค่ `role` | **ทดสอบแล้ว**: `/api/nds/pes` คืนข้อมูล mock (`bkk-pe-01`, Cisco ASR 9010) แทน PE จริงใน NetBox | กรองด้วย `d.role_name` |
| 5 | Snapshot ของ Replace Device และข้อมูล CDS Dashboard เก็บใน memory | restart backend แล้ว rollback ไม่ได้ / dashboard หาย | เก็บลง DB (มี config `DB_*` เตรียมไว้) |
| 6 | NetBox 4.6+ ใช้ token v2 เป็นค่าเริ่มต้น แต่ backend ส่ง `Token <key>` (v1) | ต้องสร้าง token แบบ v1 | รองรับ `Bearer nbt_...` |
| 7 | `sync-code.sh` รัน `git reset --hard` + `git clean -fd` | ลบงานที่ยังไม่ commit ทั้งหมด | ใช้ด้วยความระวัง |
| 8 | `rebuild.sh` รัน `docker system prune -f` | ลบ resource ที่ไม่ได้ใช้ทั้งเครื่อง | |
| 9 | docker-compose รัน `Dockerfile.dev` (vite dev / nodemon) และ mount source | ไม่เหมาะกับ production | ใช้ `Dockerfile` (nginx build) |

**FAQ**
- **หน้าเว็บขึ้นแต่ข้อมูลว่าง** — ตรวจ `NETBOX_API_URL` / token และ log backend (`Netbox API ส่งคืนค่าผิดพลาดสถานะ 403`)
- **`Invalid v1 token`** — token ที่สร้างใน NetBox เป็น v2 ให้สร้าง v1 (ดู issue #6)
- **แก้ข้อมูลใน NetBox แล้วพอร์ทัลยังไม่เปลี่ยน** — cache 5 นาที รอหรือ restart backend
- **เข้า NDS ไม่ได้ด้วยบัญชี cds** — เป็นไปตามสิทธิ์ ใช้บัญชี `nds` หรือ `admin`

---

> Private — Internal Use Only
