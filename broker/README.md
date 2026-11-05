# MQTT Broker (Mosquitto)

## ทางเลือก A — ติดตั้ง Mosquitto บน Windows (แนะนำ)
1. ดาวน์โหลด `mosquitto-2.x.x-install-windows-x64.exe` จาก https://mosquitto.org/download/
2. ติดตั้ง (ค่า default: `C:\Program Files\mosquitto`)
3. เพิ่ม `C:\Program Files\mosquitto` เข้า PATH (Settings → System → About → Advanced system settings → Environment Variables → Path → New) แล้วเปิด terminal ใหม่
4. ตัวติดตั้งจะสร้าง **Windows Service "Mosquitto Broker"** ซึ่งจองพอร์ต 1883 อยู่แล้ว (แต่รับเฉพาะ localhost)
   ให้หยุดก่อน (PowerShell แบบ Administrator):
   ```powershell
   Stop-Service mosquitto
   ```
5. รันจากโฟลเดอร์ `spdi/`:
   ```bash
   mosquitto -c broker/mosquitto.conf -v
   ```
   หรือ `npm run broker`

macOS: `brew install mosquitto` · Ubuntu: `sudo apt install mosquitto`

## ทางเลือก B — Docker
```bash
cd broker
docker compose up
```

## ทางเลือก C — Broker สำรองแบบ Node.js (ไม่ต้องติดตั้งอะไร)
```bash
npm run broker:node
```
ใช้ได้กับ simulator และ CiRA เหมือนกัน (พอร์ต 1883) เหมาะเป็นแผนสำรองวัน demo

## ⚠️ ความปลอดภัย
`allow_anonymous true` + `0.0.0.0` = ใครอยู่ Wi-Fi เดียวกันก็ส่งข้อมูลปลอมเข้ามาได้
ใช้แค่ตอน demo เท่านั้น ถ้า CiRA อยู่เครื่องเดียวกัน เปลี่ยนเป็น `listener 1883 127.0.0.1`
