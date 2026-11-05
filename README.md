# 📦 SPDI — Smart Parcel Defect Inspection

โปรเจกต์ Edge AI + IoT: CiRA CORE ตรวจกล่องพัสดุบนสายพาน แยก **กล่องดี (`box_good`)** / **บุบ (`dent`)** / **ฉีกขาด (`tear`)** → ESP32 สั่งแขนปัดคัดกล่องเสียออก → ส่งผลขึ้น dashboard แบบ real-time

## 🏭 ระบบจำลอง (Digital Twin) — เปิดดูได้ทันที ไม่ต้องตั้งค่าอะไร
หน้าแรกของเว็บ (`/`) จำลองสายพานทั้งระบบในเบราว์เซอร์:
- กล่องดี / บุบ / ฉีก วิ่งผ่านกล้อง → **CiRA CORE** ตีกรอบ + class + % ความมั่นใจทุกเฟรม
- **Bridge** โหวตหลายเฟรม ตัดสิน PASS/REJECT **ครั้งเดียว** ที่เส้นตัดสิน
- **IR breakbeam → ESP32 → แขนปัด** ปัดกล่องเสียลงถัง REJECT · Tower light 3 สี
- **Store-and-forward:** ปิดอินเทอร์เน็ตได้ สายพานยังทำงาน ข้อมูลเข้าคิว SQLite (สูงสุด 500) แล้ว auto-resync
- Dashboard: KPI, ความแม่นเทียบของจริง, กราฟ, ประวัติพร้อมภาพหลักฐาน, ข้อความ MQTT สด
- แผงควบคุม: เดิน/หยุด, ความเร็วสายพาน, % กล่องฉีก, % กล่องบุบ (บันทึกอัตโนมัติในเบราว์เซอร์), ส่งกล่องเข้าสายเอง · หน้าเว็บเป็นภาษาอังกฤษ รองรับมือถือ
- ลังคัดออก 2 ใบ: **TORN** (เสียเลย) กับ **DENTED** (แค่บุบ) กล่องค้างอยู่ในลังให้เห็น · ปุ่ม **Fix dented / Repack torn** ซ่อมแล้ววนกลับต้นสายพาน (ติดเทปน้ำเงิน แล้วตรวจซ้ำ)
- ทุกกล่องมีเลข # · ปลายสายพานนับ SHIPPED พร้อมเลขล่าสุด · dashboard มี **Line balance** (เข้า = ส่งออก + ในลัง + บนสายพาน)

```bash
npm run dashboard
```
เปิด http://localhost:3000 (หน้า **ข้อมูลจริง** จาก CiRA + ฐานข้อมูลอยู่ที่ `/live`)

Deploy ขึ้น Vercel ได้เลย — หน้าจำลองไม่ต้องใช้ env ใด ๆ · โค้ดจำลองอยู่ที่ `dashboard/lib/sim/engine.js`
> ⚠️ Vercel → Project Settings → Build and Deployment: **Framework = Next.js**, **Root Directory = `dashboard`** (ของเดิมตั้งเป็น Vite ที่ root จะ build ไม่ผ่าน)

**ตีกรอบกล่องอัตโนมัติสำหรับ CiRA:** [tools/auto_label](tools/auto_label/README.md) — AI หา "cardboard box" แล้วเขียนไฟล์ `.gt` ข้างทุกรูป

**เวอร์ชันเก่า:** เว็บ Vite + React + TypeScript ตัวเดิม (Neon DB) ย้ายไปเก็บไว้ที่ [legacy/simulation-v1-vite](legacy/simulation-v1-vite/) ครบทุกไฟล์พร้อมประวัติ commit

## 🚀 เริ่มที่นี่ (Windows, ดับเบิลคลิกอย่างเดียว)

**ต้องมีก่อน:** Node.js ([nodejs.org](https://nodejs.org)) + บัญชี MongoDB Atlas ฟรี (ได้ connection string มา 1 บรรทัด)

| ไฟล์ | ทำเมื่อไร | ทำอะไร |
|---|---|---|
| `1-SETUP.bat` | ครั้งแรกครั้งเดียว | ติดตั้งทุกอย่าง + ถามให้วาง connection string |
| `2-DEMO-SIM.bat` | อยากลองระบบ (ไม่ต้องเปิด CiRA) | จำลองกล่องวิ่ง → เปิดหน้าเว็บให้เอง |
| `3-DEMO-CIRA.bat` | ใช้กับ CiRA จริง | เปิดตัวรับข้อมูล + หน้าเว็บ แล้วไปกด Run ใน CiRA |

ปิดระบบ = ปิดหน้าต่างสีดำ · ตั้งค่า CiRA ดู [cira/README_CIRA.md](cira/README_CIRA.md)

---

```
CiRA CORE --MQTT JSON--> Mosquitto --> Node.js Bridge (นับกล่องละครั้ง) --> MongoDB Atlas --> Next.js Dashboard
```
รายละเอียด: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · Demo: [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) · แก้ปัญหา: [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) · CiRA: [cira/README_CIRA.md](cira/README_CIRA.md)

## โครงสร้าง
| โฟลเดอร์ | คืออะไร |
|---|---|
| `broker/` | config Mosquitto + docker-compose |
| `bridge/` | Node.js: รับ MQTT → tracking/นับ → MongoDB (+ simulator, sniff, reset, dev broker) |
| `dashboard/` | Next.js + Tailwind + Recharts |
| `cira/` | โค้ดวางใน JavaScript node ของ CiRA + คู่มือ |
| `tools/` | `make_video.py` ผสมรูปกล่องเสียลงวิดีโอสายพาน |
| `docs/` | สถาปัตยกรรม, สคริปต์ demo, troubleshooting |

## สิ่งที่ต้องติดตั้ง
1. **Node.js 20+** — https://nodejs.org
2. **Mosquitto 2.x** — https://mosquitto.org/download/ (ดู [broker/README.md](broker/README.md))
   ไม่มีก็ได้: ใช้ `npm run broker:node` แทน
3. **MongoDB Atlas** (ฟรี M0) — https://cloud.mongodb.com
4. (ถ้าจะทำวิดีโอ) **Python 3.10+** — https://www.python.org (ติ๊ก "Add to PATH")

## ขั้นตอน

### 1) ติดตั้ง dependencies
```bash
npm run setup
```

### 2) ตั้งค่า MongoDB Atlas
1. สร้าง cluster M0 (ฟรี)
2. **Database Access** → Add New Database User (จำ user/password)
3. **Network Access** → Add Current IP Address
4. **Connect → Drivers** → copy connection string

### 3) สร้างไฟล์ .env (ห้าม commit!)
```bash
copy bridge\.env.example bridge\.env
```
```bash
copy dashboard\.env.example dashboard\.env.local
```
(macOS/Linux ใช้ `cp`) แล้วแก้ `MONGODB_URI` ในทั้งสองไฟล์ (ค่าเดียวกัน, `DB_NAME` ต้องตรงกัน)
ใน `bridge/.env` แก้ `GOOD_CLASSES` / `DAMAGED_CLASSES` ให้ตรงชื่อ class ของโมเดล

### 4) ทดสอบ
```bash
npm test
```

### 5a) Demo ด้วย simulator (ไม่ต้องมี CiRA)
Terminal 1:
```bash
npm run broker
```
Terminal 2:
```bash
npm run demo:sim
```
เปิด http://localhost:3000
> ไม่มี Mosquitto? ใช้ `npm run demo:sim:nobroker` คำสั่งเดียวจบ (รวม broker สำรองแล้ว)

### 5b) Demo กับ CiRA จริง
Terminal 1: `npm run broker` · Terminal 2: `npm run demo:cira` · แล้วกด Run ใน CiRA (ตั้งค่าตาม [cira/README_CIRA.md](cira/README_CIRA.md))
ตรวจข้อมูลที่เข้ามา: `npm run sniff`

## คำสั่งทั้งหมด
| คำสั่ง | ทำอะไร |
|---|---|
| `npm run setup` | ติดตั้ง deps ของ root + bridge + dashboard |
| `npm run broker` | รัน Mosquitto ด้วย `broker/mosquitto.conf` |
| `npm run broker:node` | broker สำรองแบบ Node.js (aedes) |
| `npm run bridge` | รัน bridge |
| `npm run bridge:nodb` | bridge แบบไม่ใช้ DB (นับ + log อย่างเดียว) |
| `npm run sim` | simulator ส่งเฟรมเหมือน CiRA (~15 fps, เสีย ~25%) |
| `npm run sim:events` | simulator ส่ง event ที่นับแล้ว |
| `npm run sniff` | ดูทุกข้อความใน `spdi/#` |
| `npm run reset` | ลบข้อมูลการตรวจทั้งหมด (ถาม y/N) |
| `npm run dashboard` | Next.js dev server :3000 |
| `npm run demo:sim` | bridge + sim + dashboard พร้อมกัน |
| `npm run demo:sim:nobroker` | dev broker + bridge + sim + dashboard |
| `npm run demo:cira` | bridge + dashboard (CiRA ส่งข้อมูลจริง) |
| `npm test` | unit tests ของ tracker |

## MQTT topics
| Topic | ใครส่ง | เนื้อหา |
|---|---|---|
| `spdi/line1/detections` | CiRA / simulator | ผลทุกเฟรม `{type:"frame", device, objects:[{name,conf,x,y,w,h}]}` |
| `spdi/line1/events` | (ทางเลือก) CiRA ที่นับเอง | 1 กล่อง `{result:"PASS"\|"FAIL", className, confidence}` |
| `spdi/line1/counted` | bridge | ทุก event ที่บันทึกแล้ว (สำหรับ ESP32 แขนคัดกล่องในอนาคต) |

## ทำวิดีโอสำหรับ demo
```bash
py -m pip install -r tools/requirements.txt
```
```bash
py tools/make_video.py --input conveyor_good.mp4 --images damaged --output conveyor_mixed.mp4 --box-height 0.28 --belt-y 0.55 --cross-seconds 4 --spawn-seconds 5
```
- `--cross-seconds` ให้เท่ากับเวลาที่กล่องจริงวิ่งข้ามจอ (ดูจากวิดีโอ) จะดูสมจริง
- ถ้ากล่องเสียทับกล่องดี ปรับ `--spawn-seconds` / `--first-spawn`
- ไฟล์ `*.mp4` ถูก ignore จาก git (ไฟล์ใหญ่)

## Deploy dashboard ขึ้น Vercel
- Deploy **เฉพาะ `dashboard/`** (Vercel → Root Directory = `dashboard`)
- Broker + Bridge + CiRA **ยังรันบน laptop**
- ใส่ env `MONGODB_URI`, `DB_NAME` ใน Vercel (ห้ามใช้ `NEXT_PUBLIC_`) แล้ว Redeploy
- Atlas Network Access เพิ่ม `0.0.0.0/0` ให้ Vercel เข้าได้ — **⚠️ ลบออกหลัง demo**
- รายละเอียด: [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md#vercel-deploy)

## ⚠️ ความปลอดภัย
- ห้าม commit `.env` / `.env.local` (อยู่ใน `.gitignore` แล้ว) — ถ้าเผลอ push รหัส Atlas ให้ **เปลี่ยนรหัส user ทันที**
- Broker เป็น anonymous + เปิดทุก interface → ใช้แค่ demo ใน LAN ที่ไว้ใจได้
- `0.0.0.0/0` ใน Atlas = ทั้งโลกเข้าถึงได้ (ถ้ามีรหัส) → ลบหลัง demo
- `/api/reset` ปิดอยู่จนกว่าจะตั้ง `ADMIN_TOKEN` (ใช้สตริงสุ่มยาว ๆ)
