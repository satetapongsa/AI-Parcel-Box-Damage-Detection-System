# เชื่อม CiRA CORE เข้ากับ SPDI

## 1. Flow ใน CiRA CORE
```
ButtonRun → VideoFile → DeepDetect → Debug → JavaScript → MqttPub
```
ลาก node จาก panel ซ้ายตามแท็บนี้:

| Node | อยู่ที่แท็บ / หมวด | ใช้ทำอะไร |
|---|---|---|
| **ButtonRun** (หรือ **AutoRun**) | แท็บแรก 🌐 → General | ปุ่มเริ่ม flow (AutoRun = เริ่มเองตอนเปิดโปรเจกต์) |
| **VideoFile** | แท็บที่ 2 🖼 → Acquisition | เลือกไฟล์ `conveyor_mixed.mp4` (ใช้กล้องจริงให้เปลี่ยนเป็น **WebCam**) |
| **DeepDetect** | แท็บแรก → CiRA AI | โหลดโมเดลที่เทรนไว้ (class เช่น `good_box`, `damaged_box`) |
| **Debug** | แท็บแรก → General | ดูว่า DeepDetect ส่งอะไรออกมา (ชื่อ class, ค่า x,y) |
| **JavaScript** | แท็บแรก → Script | วางโค้ดจาก `cira_javascript_node.js` ทั้งไฟล์ |
| **MqttPub** | แท็บแรก → MQTT | ส่งไป broker |

> ⚠️ **อย่าใช้ DeepClassif** (แท็บที่ 2) เพราะ node นั้นจำแนกทั้งภาพโดยไม่บอกตำแหน่งกล่อง bridge ต้องใช้ x,y ในการติดตามและนับ จึงต้องใช้ **DeepDetect** เท่านั้น
>
> ถ้าใช้ DeepDetect แบบ CPU ผลจะอยู่ใน `payload.DeepDetectCPU` โค้ดจะสลับให้เองอัตโนมัติ หรือจะแก้เป็นบรรทัด `var dd = payload.DeepDetectCPU;` ก็ได้

### node อื่นที่อาจได้ใช้
- **RecordVideo** (Image Processing): อัดวิดีโอที่มีกรอบ detection ไว้ใช้เป็นแผนสำรองวัน demo
- **LineBot / TGNotify** (Bot&Notification): ต่อยอดให้แจ้งเตือนเมื่อเจอกล่องเสีย ทำผ่าน bridge แทนก็ได้
- **MqttSub**: ไว้ subscribe `spdi/line1/counted` ถ้าอยากให้ CiRA ตอบสนองต่อผลที่ bridge นับแล้ว
- **PythonScript**: ใช้แทน JavaScript ได้ แต่โค้ดในโปรเจกต์นี้เขียนไว้สำหรับ JavaScript node

### เช็คก่อนวางโค้ด
1. ต่อแค่ `ButtonRun → VideoFile → DeepDetect → Debug` แล้วกด Run ก่อน
2. ดูผลใน Debug ว่าอยู่ใต้ key ชื่ออะไร (`DeepDetect` หรือ `DeepDetectCPU`) และใน `objects` มี field อะไรบ้าง (`name`, `confidence`, `x`, `y`, `w`, `h`)
3. ถ้าชื่อ field ต่างจากนี้ ไม่ต้องตกใจ เพราะ bridge รับได้หลายแบบ ถ้ายังไม่ได้ ให้ส่ง log บรรทัด `🔍 First message` มาดู

## 2. ตั้งค่า MqttPub
| ช่อง | ค่า |
|---|---|
| Host / Broker | `127.0.0.1` (ถ้า CiRA อยู่คนละเครื่อง ใส่ IP ของเครื่องที่รัน broker) |
| Port | `1883` |
| Topic | `spdi/line1/detections` |
| Username/Password | เว้นว่าง |
| QoS | 0 |

⚠️ ชื่อช่องใน dialog MQTT ของ CiRA อาจต่างกันตามเวอร์ชัน (เช่น "Server", "Address", "Topic name") — ใส่ค่าตามตารางให้ตรงความหมาย
ถ้ามีตัวเลือก "send payload as JSON" ให้เปิดไว้

> ถ้าใช้ไฟล์ `conveyor_mixed.mp4` ที่สร้างจาก tools ให้เปิด loop video เพื่อให้กล่องวิ่งต่อเนื่อง

## 3. ตรวจว่าข้อมูลมาถึงจริง
เปิด terminal ที่โฟลเดอร์ `spdi/`:
```bash
npm run sniff
```
ควรเห็นประมาณนี้:
```
[10:15:02] #12 spdi/line1/detections (142 B)
   {"type":"frame","device":"cira-01","ts":...,"objects":[{"name":"damaged_box","conf":0.91,"x":312,"y":240,"w":120,"h":140}]}
   → 1 object(s): damaged_box=FAIL@0.91 x=0.49
```
- `=UNKNOWN` → ชื่อ class ไม่ตรงกับ `.env` (ดูข้อ 4)
- `cannot find objects[]` → payload shape ไม่ตรง ดูที่ bridge log บรรทัด `🔍 First message` แล้วส่งให้ผู้ดูแลโค้ด
- ไม่มีอะไรขึ้นเลย → CiRA ยังไม่ได้ส่ง / host-port-topic ผิด / broker ไม่ได้รัน

## 4. ตั้งชื่อ class ให้ตรงกับโมเดล
เปิด `bridge/.env` แล้วใส่ชื่อ class **ให้ตรงกับที่โมเดลส่งออกมา** (ไม่สนตัวพิมพ์เล็ก/ใหญ่, คั่นด้วย comma):
```
GOOD_CLASSES=good_box
DAMAGED_CLASSES=damaged_box,crushed,torn
```
class ที่ไม่อยู่ในทั้งสองรายการจะถูกข้าม และ bridge จะเตือนครั้งเดียว: `Unknown class "xxx"`
รีสตาร์ท bridge ทุกครั้งที่แก้ `.env`

## 5. จูนค่าการนับ (bridge/.env)
| ค่า | ใช้ทำอะไร | วิธีจูน |
|---|---|---|
| `FRAME_W`, `FRAME_H` | ความละเอียดวิดีโอ (ใช้เมื่อ CiRA ส่ง x,y เป็น pixel) | ใส่ให้ตรงกับวิดีโอ เช่น 1280 / 720 ถ้า sniff แสดง `x=1.85` แปลว่า FRAME_W เล็กไป |
| `BOX_ORIGIN` | x,y คือจุดกึ่งกลาง (`center`) หรือมุมซ้ายบน (`topleft`) | ดูใน Debug: ถ้ากล่องชิดซ้ายสุดแล้ว x≈0 แปลว่า topleft |
| `LINE_POS` | ตำแหน่งเส้นนับ 0 (ซ้าย) – 1 (ขวา) | 0.5 = กลางจอ ถ้ากล่องเกิด/หายกลางจอ ให้ย้ายไปที่โมเดลจับได้ชัดที่สุด |
| `DIRECTION` | `ltr` ซ้าย→ขวา / `rtl` ขวา→ซ้าย | ต้องตรงกับทิศสายพาน ไม่งั้นจะนับ 0 |
| `MAX_DIST` | ระยะที่กล่องขยับได้ต่อเฟรม (0–1) | fps ต่ำหรือสายพานเร็ว → เพิ่มเป็น 0.2 ; กล่องชิดกันแล้วนับรวม → ลดเป็น 0.08 |
| `MIN_FRAMES` | ต้องเห็นกี่เฟรมก่อนนับ | กันการนับจาก detection หลอก ถ้า fps ต่ำ (<5) ลดเป็น 3 |
| `TRACK_TTL_MS` | กล่องหายไปนานเท่าไรถึงลืม | ถ้านับซ้ำเพราะโมเดลกระพริบ → เพิ่มเป็น 1500–2000 |
| `MIN_CONF` | ตัด detection ที่มั่นใจต่ำ | 0.5 เป็นค่าเริ่มต้นที่ดี |
| `FAIL_RATIO` | สัดส่วนเฟรม "damaged" ขั้นต่ำที่จะตัดสินว่า FAIL | 0.3 = เอนไปทาง FAIL (ปลอดภัยกว่า) |

## 6. ทดสอบโดยไม่ต้องมี Atlas
```bash
npm run bridge:nodb
```
bridge จะนับและพิมพ์ `✅ PASS #1 ...` / `🟥 FAIL #2 ...` แต่ไม่บันทึกลงฐานข้อมูล — ใช้จูนค่าการนับได้สบาย ๆ

## 7. ทางเลือก: นับใน CiRA เอง
ถ้า CiRA นับกล่องเองได้แล้ว ให้ publish ไป topic `spdi/line1/events` ทีละกล่อง:
```json
{ "type": "event", "result": "FAIL", "className": "damaged_box", "confidence": 0.93, "device": "cira-01" }
```
`result` รับ `PASS/FAIL/OK/NG` หรือจะส่งแค่ `className` ก็ได้ (bridge จะแปลงตาม GOOD/DAMAGED_CLASSES)
