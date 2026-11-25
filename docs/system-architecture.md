# SPDI System Architecture

AI Parcel Box Damage Detection System: Edge AI (CiRA CORE) → MQTT → Node Bridge → MongoDB Atlas → Next.js Dashboard, with an ESP32 sorter driven over MQTT.

High-resolution images: [system-architecture.png](architecture/system-architecture.png) · [decision-flow.png](architecture/decision-flow.png)

```mermaid
flowchart LR
    CAM(["Camera / VideoFile<br/>parcel boxes on the belt"])

    subgraph EDGE["Edge PC (on site)"]
        direction LR
        CIRA["CiRA CORE<br/>project.npj<br/>DeepDetect: box_good / dent / tear"]
        SIM["simulator.js<br/>fake CiRA frames<br/>(demo mode)"]
        BROKER["MQTT broker<br/>Mosquitto / aedes :1883"]
        BRIDGE["Node Bridge<br/>bridge/index.js<br/>track + virtual line + vote<br/>PASS / FAIL once per box"]
        QUEUE[("In-memory queue<br/>max 2,000 events<br/>store-and-forward")]
        RELAY["Relay<br/>bridge/relay.js<br/>status online every 10 s"]
        CC["Control Center :3100<br/>runall.bat<br/>start / stop, health, auto-restart"]
    end

    subgraph CLOUD["Cloud"]
        direction LR
        ATLAS[("MongoDB Atlas<br/>db spdi<br/>collection inspections")]
        DASH["Next.js Dashboard :3000<br/>/live KPI + charts<br/>/ digital twin<br/>Vercel / Cloudflare"]
        HIVE["HiveMQ public broker<br/>broker.hivemq.com:1883"]
    end

    subgraph IOT["IoT sorter (Wokwi, web or VS Code)"]
        direction TB
        ESP["ESP32<br/>sketch.ino"]
        OUT["Servo x2 → DENT / TEAR bins<br/>Tower light G / Y / R + buzzer<br/>LCD 16x2 + OLED belt view"]
    end

    USER(["Browser<br/>QA / Hub manager"])

    CAM -->|"frames"| CIRA
    CIRA -->|"MqttPub<br/>spdi/line1/detections"| BROKER
    SIM -.->|"same JSON format"| BROKER
    BROKER -->|"subscribe detections"| BRIDGE
    BRIDGE -->|"insert result"| ATLAS
    BRIDGE <-->|"DB down: queue,<br/>flush when back"| QUEUE
    BRIDGE -->|"publish<br/>spdi/line1/counted"| BROKER
    BROKER -->|"counted"| RELAY
    RELAY -->|"topic/cmd {r,c,n}<br/>topic/status retained"| HIVE
    HIVE -->|"subscribe"| ESP
    ESP -->|"topic/ack + heartbeat<br/>last will offline"| HIVE
    HIVE -.->|"ack"| RELAY
    ESP --> OUT
    DASH -->|"API routes<br/>/api/stats /api/events"| ATLAS
    USER -->|"HTTPS"| DASH
    CC -.->|"spawn + watch"| BROKER
    CC -.-> BRIDGE
    CC -.-> SIM
    CC -.-> RELAY
    CC -.->|"opens with project.npj"| CIRA

    classDef edge fill:#10233f,stroke:#4c8dff,color:#e6edf7
    classDef cloud fill:#0f2a1c,stroke:#22c55e,color:#e6edf7
    classDef iot fill:#2a1730,stroke:#a78bfa,color:#e6edf7
    classDef ext fill:#1b1f2a,stroke:#8b98ad,color:#e6edf7
    class CIRA,SIM,BROKER,BRIDGE,QUEUE,RELAY,CC edge
    class ATLAS,DASH,HIVE cloud
    class ESP,OUT iot
    class CAM,USER ext
```

## Decision flow per box

```mermaid
flowchart TD
    A["CiRA frame:<br/>objects name, conf, x, y, w, h"] --> B{"conf ≥ 0.5?"}
    B -- no --> X["ignore detection"]
    B -- yes --> C["match to a track<br/>(nearest centre)"]
    C --> D{"crossed the<br/>virtual line?"}
    D -- no --> C
    D -- yes --> E{"seen ≥ 5 frames?"}
    E -- no --> X
    E -- yes --> F{"damaged votes<br/>≥ 30%?"}
    F -- yes --> G["FAIL<br/>class = dent or tear"]
    F -- no --> H["PASS<br/>box_good"]
    G --> I["save to MongoDB<br/>+ publish counted"]
    H --> I
    I --> J["ESP32: red + buzzer,<br/>servo pushes to bin"]
    I --> K["ESP32: green blink,<br/>box ships"]
```

## Components

| Part | Tech | Port / Topic | Role |
|---|---|---|---|
| CiRA CORE | DeepDetect | publishes `spdi/line1/detections` | Edge AI, 3 classes |
| MQTT broker | Mosquitto / aedes | `:1883` | local messaging, no internet needed |
| Bridge | Node.js | subscribes detections, publishes `spdi/line1/counted` | tracking, counting, PASS / FAIL, store-and-forward |
| MongoDB Atlas | MongoDB | collection `inspections` | stores every inspected box |
| Dashboard | Next.js | `:3000`, Vercel / Cloudflare | KPI, charts, hourly summary, digital twin |
| Relay | Node.js | `RELAY_TOPIC/cmd`, `/status`, `/ack` | forwards results to the ESP32 |
| ESP32 | Arduino on Wokwi | HiveMQ `:1883` | servos, tower light, buzzer, LCD, OLED |
| Control Center | Node.js + SSE | `:3100` | one-click start, health of all 7 stages |
