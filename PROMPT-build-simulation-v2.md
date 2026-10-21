# PROMPT v2: เขียนเว็บจำลองระบบ SPDI ตามสไลด์ล่าสุดของกลุ่ม

> ไฟล์นี้ใช้แทน `PROMPT-build-simulation.md` เวอร์ชันแรก (เวอร์ชันนั้นมีข้อผิดพลาดเรื่องความหมายสีไฟ tower light ดูข้อ 6.3)
> เขียนจากสไลด์ล่าสุด `AI_Parcel_Box_Damage_Detection_System.pptx` + repo จริง + ทุกอย่างที่คุยกันในโปรเจกต์
>
> วิธีใช้: เปิด Claude Code ในโฟลเดอร์ repo แนบไฟล์นี้ (ถ้ามี `SPDI-project-context.md` แนบด้วยได้ แต่ไฟล์นี้ครบพอจะทำงานได้เอง) แล้วพิมพ์:
> "อ่าน PROMPT-build-simulation-v2.md ให้ครบ แล้วเริ่มทำตามลำดับงานในข้อ 11"

---

## 1. บทบาทและเป้าหมาย

คุณคือ Senior Full-Stack Engineer ที่ช่วยทีมนักศึกษาสร้างโปรเจกต์ **SPDI (Smart Parcel Damage Inspector)**

**เป้าหมาย:** ทำให้เว็บใน repo นี้ **จำลองการทำงานของทั้งระบบตาม System Flow ในสไลด์** ได้ครบทุกจุด โดยไม่ต้องมีฮาร์ดแวร์หรือ CiRA CORE จริง ใช้สำหรับ (1) ซ้อมนำเสนออาจารย์ (2) ทดสอบกติกาและจังหวะการปัดก่อนซื้ออุปกรณ์ (3) เป็นแบบให้ทีมอื่นเห็นภาพตรงกัน

เมื่อของจริงมาถึง ต้องสลับจาก "ตัวจำลอง" เป็น "ของจริง" ได้ที่ชั้น adapter จุดเดียว โดยไม่ต้องเขียนหน้าเว็บใหม่

ผู้ใช้ที่คุยกับคุณคือเศรษฐพงศ์ (ฝั่ง Dashboard & UI) ระดับ Vibe Coder / Junior: เข้าใจตรรกะของระบบ แต่ไม่คล่องโค้ดลึก ไม่คล่อง git/debug ต้องการโค้ดที่ deploy ได้เลย ไม่ใช่โค้ดครึ่งๆ กลางๆ

---

## 2. ความรู้โปรเจกต์ (จากสไลด์ล่าสุดของกลุ่ม ถือเป็นข้อกำหนด)

**ชื่อ:** AI Parcel Box Damage Detection System, "ระบบประเมินและคัดแยกพัสดุชำรุดก่อนเข้าสู่ระบบขนส่ง ด้วย Edge AI และ IoT" โปรเจกต์กลุ่ม 4 คน (ศรีปทุม Sec002)

### 2.1 ปัญหา
พัสดุบุบ ฉีกขาด หรือเปียกน้ำ หลุดรอดจาก Sorting Hub ถึงลูกค้า -> Return และค่าเคลมเพิ่ม, ข้อพิพาทต้นทาง-ขนส่ง-ปลายทาง, ไม่มีภาพหลักฐาน ณ จุดตรวจ (Proof of Condition) ระบบเดิมพึ่งการตรวจด้วยสายตา ช้าและล้า

### 2.2 ผู้ใช้ระบบ (ใช้ออกแบบหน้าเว็บ)
- **Hub Operator**: ดูไฟสถานะ และจัดการกล่อง Reject
- **Claim & QA**: ค้นหาภาพหลักฐานด้วย Tracking Number
- **Hub Manager**: ดู KPI ของเสียและแนวโน้มคุณภาพการขนส่ง

### 2.3 Input / Sensor และเหตุผลที่เลือก
- Webcam 1080p x2 (Top + Side): เก็บภาพรอบกล่องระยะใกล้
- **IR Breakbeam**: hardware trigger ให้กล้องถ่ายเมื่อกล่องถึงจุดตรวจ ลดภาระ GPU
- Load Cell + HX711: ตรวจน้ำหนักประกอบภาพ เพิ่มหลักฐาน (Phase 2 เปิด/ปิดได้)
- USB Barcode Scanner: จับคู่ภาพกับ Tracking Number โดยไม่พึ่ง OCR บนสายพานที่มี motion blur

### 2.4 การประมวลผลและตัดสินใจ
- **CiRA CORE (Edge AI)** ตรวจ 2 คลาสความเสียหายหลัก: **DENT (บุบ)** และ **TEAR (ฉีกขาด)** (ในโค้ด/README ยังมี WATER_STAIN และ WEIGHT_ANOMALY เป็นส่วนเสริม)
- ภาพปกติ = **PASS** / AI มั่นใจว่าพบบุบหรือฉีก = **REJECT** แล้วส่งคำสั่งปัดทันที
- ค่า confidence threshold เริ่มต้น 85 % (จาก README)

### 2.5 Output / Actuator และการสื่อสาร
- ตัวปัดคัดแยก: **สไลด์ขัดกันเอง** หน้า 3 เขียน Servo แต่แผนภาพ System Flow หน้า 5 และ README เป็น Pneumatic Cylinder/Solenoid, ต้นแบบ Wokwi ของฝั่ง Embedded ใช้ Servo -> ให้ทำเป็น config สลับได้ ค่าเริ่มต้น **Pneumatic** (ตามแผนภาพ) และติดป้าย "รอทีมยืนยัน"
- **LED Tower Light 3 สี + Buzzer** (ความหมายตามสไลด์ ห้ามสลับ):
  - เขียว = PASS
  - แดง + เสียงบัซเซอร์ = ชำรุด / กำลังปัดออก (REJECT)
  - เหลือง = เน็ตหลุด (offline) หรือระบบขัดข้อง
- UART / Modbus: CiRA CORE <-> ESP32/PLC (รับ trigger, ส่งคำสั่งปัด) ในแผนภาพเขียน "ESP32/PLC control via digital I/O"
- MQTT (publish/subscribe): Edge Gateway -> Cloud ส่ง tracking และสถานะ

### 2.6 การเก็บและแสดงข้อมูล
- เก็บข้อมูล+รูปลง **Local SQLite** ที่หน้างาน และ **Cloud DB** เพื่อเป็นหลักฐาน ป้องกันเคลมมั่ว
- แสดงผลผ่าน Dashboard (สไลด์เขียน Grafana/Node-RED แต่เว็บจริงของเราเป็น **React Web Dashboard** ในหน้า Architecture ให้ระบุว่า "Web Dashboard" และเว้นหมายเหตุว่าเป็นตัวแทนของ Grafana/Node-RED ในสไลด์)

### 2.7 เมื่อ Internet/Server ใช้ไม่ได้: Store-and-Forward
AI และตัวปัดหน้างานทำงานต่อได้ 100 % บันทึกข้อมูล/รูปลง Local SQLite ไฟเหลืองแจ้งโหมดออฟไลน์ เมื่อกลับมาเชื่อมต่อ SYNC TO CLOUD อัตโนมัติ ข้อมูลไม่หาย (คิวสำรองสูงสุด 500 records ตาม README)

### 2.8 System Anomalies และ Failure Case (ต้องจำลองได้ทั้งหมด)
- **Vision Fault**: เช็กความสว่างเฉลี่ยของภาพ ถ้ามืดเกินไป = กล้องโดนบัง เลนส์มัว หรือไฟหน้างานดับ
- **Belt Jam**: IR ถูกบังค้างเกิน timeout -> หยุดสายพานและแจ้งเตือนขึ้น Dashboard
- **Case 1 AI False Positive**: กล่องพิมพ์ลายคล้ายรอยฉีกต้องถูก PASS
- **Case 2 Offline Fail-safe**: ถอด LAN ตอนกล่องชำรุดวิ่งผ่าน ตัวปัดต้องยังปัดได้ ต่อ LAN กลับแล้วข้อมูลขึ้น Dashboard ครบ ไม่หาย
- **Case 3 Delay Time Tuning**: เปลี่ยนความเร็วสายพาน แล้วจูนพารามิเตอร์ผ่านหน้าเว็บให้ปัดแม่น โดยไม่แก้โค้ด

### 2.9 ทีม (สไลด์หน้า 10-11)
01 AI & Computer Vision: วชิระ (CiRA CORE, Dent/Tear, อ่าน Barcode, จูน Threshold) / 02 Embedded & Control: นนทพัทธ์ (ESP32/PLC, IR, Load Cell, Servo, Tower Light) / 03 Backend & Data Pipeline: ณัฐวัฒน์ (SQLite, Store-and-Forward, MQTT, Sync) / 04 Dashboard & UI: เศรษฐพงศ์ (Web Dashboard, KPI, ภาพหลักฐาน, Analytics, ปรับ Parameter ผ่านเว็บ)

### 2.10 หลักฐานความคืบหน้าจริงที่เห็นในสไลด์ (ให้ตัวจำลองเลียนรูปแบบนี้)
- **CiRA CORE จริง (สไลด์ 9):** flow เป็น `Button Run -> VideoFile -> Deep Detect (v5)` และหน้าผลมีแท็บ `Payload / Output / Image` ภาพผลลัพธ์มี bounding box สีม่วงพร้อมป้าย **`box_good-157 95%`** แปลว่าชื่อคลาสที่ใช้จริงอย่างน้อยมี `box_good` (ยังไม่รู้ชื่อคลาสความเสียหาย และไม่รู้ความหมายของเลข `157` อาจเป็น ID) -> ทำเป็น **class mapping ที่แก้ได้ใน Settings** (`box_good -> NORMAL`, ชื่ออื่นตั้งเอง) และให้แสดงป้ายในรูปแบบเดียวกัน `ชื่อคลาส-เลข เปอร์เซ็นต์`
- **ต้นแบบ ESP32 ใน Wokwi (สไลด์ 6):** ESP32 + Servo + เซนเซอร์ + LED เขียว/เหลือง/แดง serial monitor แสดง `Parcel Sorting System Ready`, `Enter 1=PASS, 2=WAIT, 3=FAIL`, `GREEN: Parcel PASSED`, `YELLOW: Waiting for inspection`, `RED: Parcel FAILED` -> ให้ตัวจำลองมีหน้าต่าง "UART Console" ที่ส่งคำสั่ง `1/2/3` และแสดงข้อความตอบกลับแบบนี้ (ติดป้าย "อิงต้นแบบ Wokwi ยังไม่ใช่โปรโตคอลจริง")
- **ภาพ Dashboard ในสไลด์ 8** เป็นภาพจำลอง ตัวเลขในภาพ (เช่น 1,248 / 1,082 / 166 / 12) ไม่ใช่ข้อมูลจริง ห้ามใช้เป็นข้อเท็จจริง
- สไลด์ 12 (ซ่อนอยู่) ระบุชุดทดสอบ 5 อย่าง: Vision Fault/Brightness, Belt Jam/IR Timeout, False Positive, Offline Fail-safe, Delay Time Tuning

---

## 3. Diagram ที่ต้องจำลอง (อิง System Flow สไลด์ 5 + สิ่งที่ตกลงกันเพิ่ม)

```
พัสดุเข้าสู่จุดตรวจ
      |
 [IR Breakbeam] --trigger--> [Webcam Top+Side] --> [CiRA CORE Edge AI] --> [PASS / REJECT]
      |                                                    |                      |
      |                                        ผลตรวจ (class+confidence)           |  REJECT
      |                                                    |                      v
      |                                                    |        ESP32/PLC (digital I/O) --> [Pneumatic Cylinder|Servo] ปัดกล่อง
      |                                                    |                 |--> Tower Light 3 สี + Buzzer
      |                                                    v
      |                                    Edge PC: Python bridge (เก็บ Local SQLite + Store-and-Forward, คิว <= 500)
      |                                                    |
      |                              MQTT  (หรือ HTTP POST /api/inspections + x-api-key)
      |                                                    v
      |                                   Cloud DB (Supabase)  -->  Web Dashboard (realtime)

 REAL-TIME CONTROL PATH (PHYSICAL): IR -> ESP32/PLC -> ตัวปัด  ทำงานที่ Edge ไม่พึ่งเน็ต
 LOCAL DATA PATH (EDGE): Local SQLite + Store-and-Forward
 CLOUD DATA PATH: Edge -> Cloud DB -> Dashboard
```

**กฎเหล็ก (ต้องสะท้อนในตัวจำลอง):**
1. เส้นทางควบคุม Edge ทำงานต่อได้แม้ตัดอินเทอร์เน็ต
2. เว็บ/คลาวด์มีหน้าที่แสดงผลและเก็บหลักฐาน ห้ามเป็นตัวตัดสิน
3. เน็ตหลุด -> เข้าคิว -> เน็ตกลับ -> ส่งตามลำดับ ไม่ซ้ำ ไม่หาย

---

## 4. สถานะปัจจุบันของโค้ด (อย่าเริ่มจากศูนย์)

Repo: `github.com/satetapongsa/AI-Parcel-Box-Damage-Detection-System` / Demo: https://ai-parcel-boxdetectionsys.vercel.app/

- **Stack:** React 19 + Vite + TypeScript + Tailwind v4 + Recharts บน Vercel (**ไม่ใช่ Next.js** API ต้องเป็นไฟล์ `api/*.ts` ที่ root)
- **Phase 1 เสร็จ:** Dashboard ข้อมูลจำลอง โครงสร้างเดิมมี `src/context/SimulationContext.tsx`, `src/data/mockData.ts`, `src/lib/edge/{edgeBridge,mockEdgeBridge,ciraCoreAdapter}.ts` (โหมด MOCK | LIVE_EDGE), `src/lib/events/*`, `src/lib/database/inspectionRepository.ts` (in-memory 500), `src/lib/mqtt/topics.ts` (topic `spdi/SORT-01/inspection`), `src/lib/realtime/realtimeClient.ts`, หน้า Analytics/Architecture/Dashboard/Evidence/FailureTests/InspectionHistory/LiveInspection/Overview/ParcelDetail/Settings
- **ปัญหาที่รู้:** `src/types/` มี type สองชุดไม่ตรงกัน ชุดเก่า `NORMAL|DAMAGED|WET|OPEN` + สถานะ `HOLD|MANUAL INSPECTION` กับชุดใหม่ `NORMAL|DENT|TEAR|WATER_STAIN|WEIGHT_ANOMALY` + `PASS|REJECT` (ตรงกับ DB) และ `InspectionEvent` ใช้ camelCase/ตัวพิมพ์เล็ก ต่างจาก DB
- **ร่างโค้ดชุดเชื่อมคลาวด์ที่ทำไว้แล้ว (ยังไม่เคยรันจริง):** `supabase/inspections.sql`, `api/inspections.ts`, `src/lib/realtime/useInspections.ts`, `vercel.json` (แก้ rewrite ยกเว้น `/api/`), `.env.example`
- **bridge.py (Edge PC):** ส่ง `{tracking_no, station_id, result, damage_type, confidence, weight_g, inspected_at}` ด้วย header `x-api-key`, คิว SQLite สูงสุด 500 ทิ้งรายการเก่าสุด, กติกา retry ที่แก้บั๊กแล้ว: ลบคิวเฉพาะ 2xx และ 400/422, ส่วน 401/403/404/429/5xx **เก็บไว้ลองใหม่** (บั๊กเดิมคือ 401 ทำให้คิวถูกลบหมด) ส่วน `on_cira_result()` ยังไม่ต่อกับ CiRA CORE
- **API:** 401 key ผิด, 400/422 payload ผิด, 500 DB พัง, 201 สำเร็จ; `tracking_no` unique + upsert ignoreDuplicates (ส่งซ้ำไม่เกิดแถวซ้ำ); RLS: anon select อย่างเดียว เขียนผ่าน service_role เท่านั้น

---

## 5. ก่อนเขียนโค้ด

อ่านไฟล์เหล่านี้จริง (อย่าเดา): `package.json`, `vite.config.ts`, `vercel.json`, `README.md`, `src/context/SimulationContext.tsx`, `src/data/mockData.ts`, `src/lib/**`, `src/types/**`, `src/pages/**`, `src/components/**`
แล้วสรุปให้ผมสั้นๆ: ของเดิมทำอะไรได้, จะใช้ซ้ำอะไร, จะเปลี่ยนอะไร, หน้าไหนใช้ type ชุดไหน ก่อนลงมือ

**ข้อจำกัดทางเทคนิค (ห้ามฝ่าฝืน):**
- ตัวจำลองรัน **ในเบราว์เซอร์ทั้งหมด** ไม่ต้องมี backend ก็ใช้งานได้
- **ห้ามใส่ API key / service role key / secret ในโค้ดฝั่งเบราว์เซอร์** และห้ามให้ตัวจำลองเขียน Supabase ตรงจากเบราว์เซอร์
- ห้ามเพิ่ม dependency ถ้าไม่จำเป็น (ถ้าเพิ่มต้องบอกเหตุผลและคำสั่ง `npm i`)
- `npm run build` (รัน `tsc -b`) และ `npm run lint` ต้องผ่าน ห้ามใช้ `any` ถ้าไม่จำเป็น ห้ามทิ้ง TODO
- ห้ามเขียนโค้ดแบบ "...ส่วนที่เหลือเหมือนเดิม" ต้องส่งไฟล์เต็มหรือแก้ไฟล์ตรงๆ
- UI เป็นภาษาไทยผสมศัพท์เทคนิคอังกฤษ ธีมมืดแบบห้องควบคุม (design philosophy "Quiet Instrumentation": เส้น hairline, cyan หนึ่งสีสำหรับเส้นทางข้อมูลสด, เขียว/เหลือง/แดงใช้แสดงสถานะเท่านั้น, วาดอุปกรณ์แบบ schematic, ตัวเลขใหญ่, ข้อความน้อย)

---

## 6. สิ่งที่ตัวจำลองต้องทำ

### 6.1 Simulation Engine (แยกจาก UI)
โมดูลเช่น `src/lib/sim/` เป็น state machine ขับเคลื่อนด้วย tick มี play/pause และความเร็ว x0.5/x1/x2/x4

ลำดับของพัสดุ 1 กล่อง (ทุกขั้นเขียนลง Timeline พร้อมเวลาและแหล่งที่มา):
1. `IR_TRIGGER` กล่องบัง IR (ถ้าบังค้างเกิน timeout = Belt Jam)
2. `CAPTURE` กล้องบน/ข้างถ่ายภาพ (ภาพเป็นกราฟิก SVG/Canvas) + ตรวจค่า brightness
3. `BARCODE` สแกนเลข `THA-YYYYMMDD-XXXXXX`
4. `EDGE_AI` CiRA CORE ตรวจ: ผลตามคลาส + confidence + bounding box + เวลาประมวลผลตาม config แสดงป้ายแบบ `box_good-157 95%`
5. `WEIGHT` (ถ้าเปิด Load cell) เทียบน้ำหนักที่คาดไว้
6. `DECISION` ตัดสิน PASS/REJECT ตามข้อ 6.2
7. `UART_TX` ส่งคำสั่งให้ ESP32 (`1=PASS`, `3=FAIL`, `2=WAIT`) และรับข้อความตอบกลับ
8. `ACTUATOR` ถ้า REJECT: ตัวปัดทำงานหลังหน่วงตามที่คำนวณ ไฟ/บัซเซอร์เปลี่ยนตามข้อ 6.3
9. `LOCAL_SAVE` เก็บลง Local SQLite (เสมือน) ทุกกล่อง ไม่ว่าเน็ตเป็นอย่างไร
10. `CLOUD_SYNC` ส่งขึ้นคลาวด์ตามสถานะเน็ตและรหัสตอบกลับ สำเร็จแล้วจึงถือว่า synced

### 6.2 กติกาและค่าที่ปรับได้ (หน้า Settings ทั้งหมด)
| ค่า | เริ่มต้น | หมายเหตุ |
|---|---|---|
| Confidence threshold | 85 % | REJECT เมื่อพบความเสียหายและ confidence >= threshold |
| ความคลาดเคลื่อนน้ำหนัก | +-5 % | ใช้เมื่อเปิด Load cell (ยังไม่รู้ที่มาของ "น้ำหนักที่ควรเป็น" ให้เป็นค่าสุ่มรอบน้ำหนักตั้งต้น และติดป้ายสมมติ) |
| ความเร็วสายพาน | 0.75 m/s | |
| เวลาประมวลผล AI | 0.20 s | **ค่าสมมติ ติดป้าย "ต้องวัดจริงจาก CiRA CORE"** |
| หน่วงตัวปัด | 180 ms | |
| ชนิดตัวปัด | Pneumatic (สลับ Servo ได้) | ติดป้าย "รอทีมยืนยัน" |
| ระยะตัวปัดที่ติดตั้งจริง | ตั้งเอง (เมตร) | |
| IR timeout (Belt Jam) | ตั้งเอง (วินาที) | |
| Brightness ต่ำสุด (Vision Fault) | ตั้งเอง | |
| ขนาดคิวสำรอง | 500 | เต็มแล้วทิ้งเก่าสุด แจ้งเตือน |
| class mapping | `box_good -> NORMAL` ฯลฯ | แก้ได้ ชื่อคลาสจริงรอวชิระยืนยัน |
| สถานะที่สาม "รอคนตรวจ" (REVIEW) | ปิด | ยังไม่ได้ตัดสินใจกับทีม ถ้าเปิด: confidence 60-85 % -> REVIEW |

- **ระยะตัวปัดที่ต้องการ = ความเร็ว x (เวลา AI + หน่วงตัวปัด)** แสดงแบบเรียลไทม์ (ตัวอย่าง 0.75 x (0.20+0.18) ≈ 0.29 m) ถ้าระยะติดตั้งจริงสั้นกว่า ตัวปัดต้องพลาดและบันทึกเหตุการณ์ `MISSED_REJECT` พร้อมแจ้งเตือนแดง นี่คือ Case 3 (Delay Time Tuning) ที่ต้องปรับจากหน้าเว็บโดยไม่แก้โค้ด

### 6.3 Virtual Hardware Panel (ความหมายสีตามสไลด์ ห้ามสลับ)
แสดงแบบ schematic เส้นเดียว: สายพาน (เคลื่อนไหว), IR, กล้อง x2, CiRA CORE, ESP32, ตัวปัด (ยืด/หด), tower light, buzzer, Edge PC, Local SQLite, MQTT/HTTP, Internet, Cloud
- **Tower light: เขียว = PASS / แดง + เสียงบัซเซอร์ = REJECT/กำลังปัดออก / เหลือง = ออฟไลน์หรือระบบขัดข้อง**
- สีของโหนดอุปกรณ์: เขียว = ปกติ, เหลือง = เตือน, แดง = ผิดพลาด (ใช้ไอคอน/ข้อความประกอบ ไม่พึ่งสีอย่างเดียว)
- บัซเซอร์เสมือนใช้ Web Audio ปิดเป็นค่าเริ่มต้น
- มี **CiRA CORE Panel** เลียนหน้าจอจริง: โหนด `Button Run -> VideoFile/Camera -> Deep Detect` และแท็บ `Payload / Output / Image`
- มี **UART Console** เลียนต้นแบบ Wokwi (ส่ง 1/2/3 และข้อความตอบกลับ) ติดป้าย "ยังไม่ใช่โปรโตคอลจริง"

### 6.4 Fault Injection (กดสร้าง/กดแก้ได้ ระบบต้องตอบสนองถูก)
| Fault | พฤติกรรมที่ถูกต้อง |
|---|---|
| **ตัดอินเทอร์เน็ต (Case 2)** | Edge ยังตัดสินและปัดต่อ, ไฟเหลือง, ข้อมูลเข้าคิว, pending เพิ่ม, เน็ตกลับแล้วส่งครบตามลำดับ ไม่ซ้ำ |
| **Vision Fault** | บังคับภาพมืด -> ตรวจ brightness ต่ำกว่าเกณฑ์ -> แจ้ง `CAMERA_FAULT`, ไฟเหลือง, confidence ตก |
| **Belt Jam** | IR ค้างเกิน timeout -> หยุดสายพาน, ไฟแดง+บัซเซอร์, แจ้งเตือนขึ้น Dashboard |
| **False Positive (Case 1)** | กล่องพิมพ์ลายคล้ายรอยฉีก: โมเดลที่ปรับดีต้อง PASS; มีตัวเลือก "โมเดลอ่อน" ให้ตัดสินผิดเพื่อวัด False positive rate |
| คิวเต็ม 500 | ทิ้งรายการเก่าสุด แจ้งเตือน |
| กล้องหลุด 1 ตัว | ตรวจด้วยกล้องเหลือ 1 ตัว ความมั่นใจลดลง |
| ตัวปัดขัดข้อง | REJECT แต่ปัดไม่ได้ -> `ACTUATOR_FAULT` นับเป็น "ต้องเก็บด้วยมือ" |
| API key ผิด (401) | bridge **ไม่ลบคิว** เก็บไว้ลองใหม่ |
| Payload ผิด (422/400) | ทิ้งเฉพาะรายการนั้น บันทึกเหตุการณ์ ส่วนที่เหลือไปต่อ |
| Server ล่ม (5xx/429) | เก็บคิว ลองใหม่แบบหน่วงเพิ่มขึ้น |
| อ่านบาร์โค้ดไม่ได้ | ใช้เลขชั่วคราว `UNKNOWN-xxxx` ตัดสินต่อได้ พร้อม flag |

### 6.5 ตัวสร้างพัสดุและชุดทดสอบ
- โหมดสุ่ม: สัดส่วนปรับได้ (ค่าเริ่มต้นปกติ 80 %, dent 8 %, tear 7 %, water stain 5 %) + อัตราพัสดุ/นาที + **seed** ให้รันซ้ำได้ผลเหมือนเดิม
- โหมดกดทีละกล่อง: ปกติ / บุบ / ฉีก / เปียก / น้ำหนักผิด / กล่องลายคล้ายรอยฉีก
- **Test Suite** กดครั้งเดียวรันตามสไลด์ 12: Vision Fault, Belt Jam, False Positive, Offline Fail-safe, Delay Time Tuning + (ส่ง REJECT 20 กล่องวัดอัตราปัดถูก) แล้วสรุปผ่าน/ไม่ผ่านพร้อมตาราง และดาวน์โหลด CSV เกณฑ์ผ่านเริ่มต้น >= 90 % (**เป็นข้อเสนอ ปรับตามอาจารย์ ติดป้ายให้ชัด**) ตัวเลขทั้งหมดมาจากการจำลอง ห้ามแต่งเป็นความแม่นยำของ AI จริง

### 6.6 Adapter Layer (จุดสลับไปของจริง)
```ts
interface InspectionSource { start(cb: (e: InspectionEvent) => void): void; stop(): void; }   // ตอนนี้ Simulated, อนาคต CiRA CORE (Serial/MQTT/TCP/ไฟล์ ยังไม่รู้ช่องทาง)
interface InspectionStore  { save(e): Promise<void>; list(limit): Promise<InspectionEvent[]>; subscribe(cb): () => void; }  // อนาคต SupabaseStore ผ่าน useInspections
interface CloudSink        { send(p: BridgePayload): Promise<{ status: number }>; }           // ตัวจำลองคืน 201/401/422/429/500 ตาม fault
interface EdgeController   { send(cmd: '1'|'2'|'3'): Promise<string>; }                        // UART/ESP32 จำลอง
```
- รวม type สองชุดเป็นชุดเดียว (PASS|REJECT, NORMAL|DENT|TEAR|WATER_STAIN|WEIGHT_ANOMALY) และแก้ทุกหน้าที่ใช้ชุดเก่า
- เขียน **mapper** `InspectionEvent` <-> `BridgePayload` (`{tracking_no, station_id, result, damage_type, confidence, weight_g, inspected_at}`)
- `SimulatedCloudSink` ตรวจ payload ด้วยกฎเดียวกับ `api/inspections.ts` (result ∈ PASS/REJECT, confidence 0-100, damage_type ในชุดที่อนุญาต, tracking_no ไม่ว่าง) เพื่อให้พฤติกรรมตรงกับของจริง
- เตรียมที่ว่างสำหรับ `SupabaseStore` แต่ **ยังไม่เปิดใช้** ในงานนี้

---

## 7. หน้าเว็บ (ผูกกับผู้ใช้ 3 กลุ่ม ใช้หน้าเดิมให้มากที่สุด)

| หน้า | ผู้ใช้หลัก | สิ่งที่ต้องเห็น |
|---|---|---|
| LiveInspection | Hub Operator | สายพานเคลื่อนไหว พัสดุผ่านจุดตามแผนภาพ ภาพกล้อง+bounding box ตัวปัด tower light Timeline สด ปุ่ม play/pause/ความเร็ว/สร้างพัสดุ CiRA CORE Panel และ UART Console |
| **Reject Queue (เพิ่มใหม่)** | Hub Operator | รายการกล่อง REJECT รอจัดการ ปุ่ม "จัดการแล้ว" ระบุเหตุผล (บุบ/ฉีก/น้ำหนัก) |
| Evidence / ParcelDetail / InspectionHistory | Claim & QA | ค้นหาด้วย Tracking Number ดูภาพบน/ข้าง เหตุผลการคัดแยก ประวัติเหตุการณ์ สถานะ synced/pending ต่อแถว |
| Dashboard / Analytics / Overview | Hub Manager | อัตรา REJECT แยกตามชนิดความเสียหาย ปริมาณต่อนาที แนวโน้ม pending sync เวลา AI เฉลี่ย False positive rate |
| Architecture | ทุกคน/อาจารย์ | diagram ในข้อ 3 แบบ interactive: กล่อง/ลูกศรเปลี่ยนสีตามสถานะจริงจากตัวจำลอง กดดู log จุดนั้น แยกป้าย "เส้นทางควบคุม Edge (ออฟไลน์ได้)" กับ "เส้นทางคลาวด์" |
| FailureTests | ทีม/อาจารย์ | ปุ่ม Fault ข้อ 6.4 + Test Suite + ตารางผ่าน/ไม่ผ่าน + CSV |
| Settings | ทีม | ค่าทั้งหมดข้อ 6.2 (ค่าสมมติมีป้าย) รีเซ็ตเป็นค่าเริ่มต้น |

ทุกหน้าใช้ข้อมูลจากตัวจำลองชุดเดียวกัน (single source of truth) และมีป้าย **SIMULATION** ชัดเจนจนกว่าจะสลับเป็น LIVE

---

## 8. โครงสร้างโค้ดและคุณภาพ

```
src/lib/sim/       engine.ts, scenarios.ts (seeded random), faults.ts, rules.ts (pure), bridgeQueue.ts (pure), testSuite.ts, ciraPanel.ts, uartConsole.ts
src/lib/adapters/  interfaces.ts, simulated.ts, mappers.ts (pure)
src/types/         index.ts (ชุดเดียว)
```
- `rules.ts`, `bridgeQueue.ts`, `mappers.ts` เป็น pure function และ **มี unit test** (Vitest ถ้าเพิ่มได้ ให้บอกคำสั่งติดตั้ง) ครอบคลุม: ขอบเขต threshold (84.9 / 85.0), น้ำหนัก +-5 %, สูตรระยะตัวปัด, คิวเต็มทิ้งเก่าสุด, retry ตามรหัส 401/422/429/500, `tracking_no` ไม่ซ้ำ, mapper สองทาง
- รันที่ x4 ต้องลื่น จำกัดขนาด Timeline/ประวัติ (เช่น 500 รายการ)
- เข้าถึงได้: ปุ่มมี label, ไม่ใช้สีเป็นตัวสื่อความหมายอย่างเดียว

---

## 9. สิ่งที่ห้ามทำ

- ห้ามแตะ `api/inspections.ts`, `supabase/inspections.sql`, `bridge.py` ถ้ามีใน repo (ถ้าจะแก้ให้เสนอก่อน)
- ห้ามทำให้ตัวจำลองดูเหมือนข้อมูลจริง ต้องมีป้าย SIMULATION
- ห้ามแต่งตัวเลขผลทดสอบ/ความแม่นยำของ AI ห้ามใช้ตัวเลขในภาพสไลด์ 8 เป็นข้อมูลจริง
- ห้ามสลับความหมายสี tower light ห้าม commit `.env*` หรือ key

---

## 10. ข้อสมมติที่ยังไม่ยืนยัน (ต้องมีป้ายใน UI และสรุปให้ผมถามทีม)

1. ตัวปัดจริงเป็น Servo หรือ Pneumatic (สไลด์ขัดกันเอง)
2. ชื่อคลาสใน CiRA CORE (เห็นแค่ `box_good`) และความหมายเลขท้ายป้าย (`157`)
3. CiRA CORE ส่งผลออกทางไหน (Serial/MQTT/TCP/ไฟล์/DB) และโปรโตคอล ESP32 จริง (1/2/3 มาจาก Wokwi)
4. เวลาประมวลผล AI ต่อกล่อง (0.20 s เป็นค่าสมมติ)
5. มีสถานะ "รอคนตรวจ" หรือไม่
6. น้ำหนักที่ควรเป็น (เกณฑ์ +-5 %) มาจากไหน
7. เกณฑ์ผ่านของชุดทดสอบ (90 % เป็นข้อเสนอ)
8. สไลด์ระบุ Grafana/Node-RED แต่เว็บจริงคือ React ทีมจะนำเสนอแบบไหน

---

## 11. ลำดับการทำงาน (จบทุกขั้นให้ผม build และกดทดสอบได้)

ผมใช้ git ยังไม่คล่อง **ทุกขั้นให้ส่งคำสั่ง git แบบคัดลอกวางได้ พร้อมวิธีย้อนกลับถ้าพัง**

- ขั้น 0: `git checkout -b feat/simulation` อ่านไฟล์ตามข้อ 5 และสรุป
- ขั้น 1: รวม types + `rules.ts` + unit test (ยังไม่แตะ UI) -> commit
- ขั้น 2: `engine.ts`, `scenarios.ts`, `bridgeQueue.ts`, adapters/mappers -> commit
- ขั้น 3: ต่อ engine เข้า `SimulationContext` + LiveInspection + Virtual Hardware Panel + CiRA Panel + UART Console -> commit
- ขั้น 4: หน้า Architecture interactive ตามข้อ 3 -> commit
- ขั้น 5: Fault injection + FailureTests + Test Suite + CSV -> commit
- ขั้น 6: Settings (ค่าสมมติมีป้าย) + Reject Queue + History/Detail/Evidence/Analytics ใช้ store เดียว -> commit
- ขั้น 7: ป้าย SIMULATION, responsive, `npm run build` + `npm run lint` + test ผ่าน, อัปเดต README หัวข้อ "วิธีใช้ตัวจำลอง" -> commit แล้วอธิบายวิธีเปิด Pull Request/merge เข้า main และ deploy

ระหว่างทาง ถ้าเจอ error ให้อธิบายสั้นๆ ว่าพังเพราะอะไรแล้วแก้เลย ถ้าเจอจุดอันตราย (security, ข้อมูลหาย) ให้บอกและแก้ทันที ไม่ต้องรอถาม

---

## 12. เกณฑ์ว่า "เสร็จ"

- [ ] กด Play แล้วพัสดุวิ่งผ่านทุกขั้นข้อ 6.1 และ Timeline ตรงกับที่เห็น
- [ ] tower light ตรงสไลด์: เขียว=PASS, แดง+เสียง=REJECT, เหลือง=ออฟไลน์/ขัดข้อง
- [ ] เปลี่ยน threshold / ความเร็ว / เวลา AI / หน่วงตัวปัด / ระยะติดตั้ง แล้วผลและระยะที่ต้องการเปลี่ยนตามโดยไม่แก้โค้ด และตั้งระยะสั้นเกินไปแล้วเกิด `MISSED_REJECT`
- [ ] ตัดเน็ตระหว่างวิ่ง: ตัวปัด/ไฟยังทำงาน pending เพิ่ม ต่อกลับแล้วข้อมูลครบเรียงลำดับไม่ซ้ำ
- [ ] Vision Fault (ภาพมืด) และ Belt Jam (IR timeout) ทำงานและแจ้งเตือนตามสไลด์
- [ ] จำลอง 401 แล้วคิวไม่ถูกลบ, 422 ทิ้งเฉพาะรายการนั้น
- [ ] CiRA Panel แสดงป้าย `ชื่อคลาส-เลข %` และ UART Console ส่ง 1/2/3 ได้
- [ ] Test Suite รันครบ สรุปผ่าน/ไม่ผ่าน + CSV ใส่ seed เดิมได้ผลเดิม
- [ ] ทุกหน้าใช้ข้อมูลชุดเดียวกัน มีป้าย SIMULATION ครบ
- [ ] `npm run build`, `npm run lint`, unit test ผ่าน ไม่มี key/secret ในโค้ด และไม่มีไฟล์ type ซ้ำซ้อนค้าง

---

## 13. รูปแบบการตอบกลับ

- ตอบเป็นภาษาไทย อธิบายสั้นๆ เน้นโค้ดที่รันได้จริง
- ท้ายแต่ละขั้นสรุป 3 อย่าง: (1) ไฟล์ที่สร้าง/แก้ (2) วิธีทดสอบด้วยมือ 3-5 ข้อ (3) คำสั่ง git
- เรื่องที่ยังไม่ชัด (ข้อ 10) ให้เลือกค่าเริ่มต้นที่สมเหตุสมผล ทำเป็น config แล้วบอกว่าเลือกอะไรเพราะอะไร อย่าหยุดรอ
