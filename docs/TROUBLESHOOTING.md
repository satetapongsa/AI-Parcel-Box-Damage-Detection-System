# Troubleshooting

## `ECONNREFUSED 127.0.0.1:1883`
broker ยังไม่รัน
- `npm run broker` (Mosquitto) หรือ `npm run broker:node` (ไม่ต้องติดตั้งอะไร)
- `mosquitto` not recognized → ยังไม่ได้เพิ่ม `C:\Program Files\mosquitto` เข้า PATH (เปิด terminal ใหม่หลังแก้)
- Mosquitto บอก `Address already in use` → Windows service "Mosquitto Broker" รันอยู่ : `Stop-Service mosquitto` (PowerShell Admin) แล้วรันใหม่
- CiRA อยู่อีกเครื่อง → ใช้ IP ของเครื่อง broker (`ipconfig`) และเปิด Windows Firewall ให้ port 1883 (Inbound rule, TCP 1883, Private network)

## MongoDB Atlas
| ข้อความ | สาเหตุ / วิธีแก้ |
|---|---|
| `bad auth : authentication failed` | user/password ผิด — ใช้ **Database User** (Atlas → Database Access) ไม่ใช่รหัส login เว็บ; รหัสมี `@ : / ? # %` ต้อง URL-encode เช่น `@` → `%40` |
| `Server selection timed out` / `ETIMEDOUT` | IP ยังไม่อยู่ใน **Network Access** → Add Current IP Address (IP เปลี่ยนเมื่อเปลี่ยน Wi-Fi!) ; หรือ Wi-Fi มหาวิทยาลัยบล็อก port 27017 → ลอง hotspot มือถือ |
| `querySrv ENOTFOUND _mongodb._tcp...` | ชื่อ cluster ผิด หรือ DNS ไม่รองรับ SRV → ตั้ง DNS เป็น `8.8.8.8` / `1.1.1.1` หรือใช้ connection string แบบ "standard" (`mongodb://...` ไม่มี `+srv`) |
| `ไม่พบ MONGODB_URI` | ยังไม่ได้ copy `bridge/.env.example` → `bridge/.env` |

Dashboard ใช้ไฟล์แยก: `dashboard/.env.local` (copy จาก `dashboard/.env.example`)

## Bridge เตือน `Unknown class "xxx"`
ชื่อ class จากโมเดลไม่อยู่ใน `GOOD_CLASSES` / `DAMAGED_CLASSES` → เพิ่มชื่อนั้นใน `bridge/.env` แล้วรีสตาร์ท bridge
ดูชื่อจริงด้วย `npm run sniff`

## ไม่นับเลย (nothing counted)
ไล่ตามลำดับ:
1. `npm run sniff` มีข้อความเข้ามาไหม? ไม่มี → ปัญหาฝั่ง CiRA/MQTT (host, port, topic `spdi/line1/detections`)
2. sniff แสดง `=UNKNOWN` → แก้ชื่อ class
3. sniff แสดง `cannot find objects[]` → payload shape ไม่ตรง ดู bridge log `🔍 First message` เทียบกับ `cira_javascript_node.js`
4. confidence ต่ำกว่า `MIN_CONF` → ลด MIN_CONF
5. ค่า `x=` ใน sniff ไม่เคยข้าม `LINE_POS` → ตรวจ `FRAME_W` (x > 1 = FRAME_W เล็กไป), `BOX_ORIGIN`, `DIRECTION`
6. fps ต่ำมาก กล่องเห็นไม่ถึง `MIN_FRAMES` หรือกระโดดเกิน `MAX_DIST` → ลด MIN_FRAMES เป็น 3, เพิ่ม MAX_DIST เป็น 0.2
7. ทดสอบเร็ว ๆ: `npm run bridge:nodb` แล้วดู log

## นับซ้ำ (double counting)
- โมเดลกระพริบ (จับได้-ไม่ได้สลับกัน) → เพิ่ม `TRACK_TTL_MS` เป็น 1500–2000
- กล่องขยับเร็วเกิน `MAX_DIST` จนกลายเป็น track ใหม่ → เพิ่ม `MAX_DIST`
- ย้าย `LINE_POS` ไปบริเวณที่โมเดลจับได้นิ่งที่สุด (มักเป็นกลางจอ)
- รัน bridge 2 ตัวพร้อมกัน (เช่น `demo:sim` ค้างอยู่อีกหน้าต่าง) → ปิดให้เหลือตัวเดียว
- กล่อง 2 ใบติดกันถูกนับเป็นใบเดียว → ลด `MAX_DIST` หรือเว้นระยะกล่องในวิดีโอ

## Dashboard
- ไฟ Bridge แดง ทั้งที่ bridge รันอยู่ → bridge ต่อ MongoDB ไม่ได้ (ดู log) หรือ dashboard ชี้ไปคนละ database (`DB_NAME` สองไฟล์ต้องตรงกัน)
- ไฟ CiRA แดง แต่ Bridge เขียว → ไม่มีเฟรมเข้ามาใน 5 วินาทีล่าสุด
- ไฟทุกดวงแดง + แถบ error → ดูข้อความ error, ตรวจ `dashboard/.env.local`
- นาฬิกาเครื่องเพี้ยน → ไฟสถานะอาจแดงผิด ให้ sync เวลา Windows (Settings → Time → Sync now)

## Vercel deploy
1. Push repo ขึ้น GitHub (ตรวจว่า `.env`, `.env.local` **ไม่** ถูก commit: `git status`)
2. Vercel → New Project → import repo → **Root Directory = `dashboard`**
3. Settings → Environment Variables: `MONGODB_URI`, `DB_NAME` (ห้ามใส่ `NEXT_PUBLIC_`), `ADMIN_TOKEN` (ถ้าต้องการ)
4. Atlas → Network Access → Add `0.0.0.0/0` (Vercel ไม่มี IP คงที่) — **⚠️ ลบออกหลัง demo**
5. แก้ env แล้วต้อง **Redeploy** (Deployments → ⋯ → Redeploy) ค่าใหม่ถึงจะมีผล
6. Bridge / broker / CiRA ยังรันบน laptop เหมือนเดิม Vercel แค่อ่าน DB
- error `MONGODB_URI is not set` บน Vercel → ลืมใส่ env หรือยังไม่ redeploy
- Build fail → ตรวจว่า Root Directory เป็น `dashboard` จริง
