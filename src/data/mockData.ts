import type { 
  ParcelRecord, 
  ArchitectureNode, 
  FailureTestScenario, 
  AnomalyLog,
  EngineeringSettings 
} from '../types/spdi';

export const INITIAL_PARCEL_RECORDS: ParcelRecord[] = [
  {
    id: '1',
    trackingNumber: 'THA-20260930-001248',
    timestamp: '2026-09-30 08:42:13',
    time: '08:42:13',
    status: 'PASS',
    damageType: 'NORMAL',
    aiConfidence: 97.4,
    weight: 2.41,
    expectedWeight: 2.40,
    weightDifference: 0.4,
    stationId: 'SORT-01',
    boundingBoxesTop: [],
    boundingBoxesSide: [],
    actuatorTriggered: false,
    syncedToCloud: true
  },
  {
    id: '2',
    trackingNumber: 'THA-20260930-001247',
    timestamp: '2026-09-30 08:41:05',
    time: '08:41:05',
    status: 'REJECT',
    damageType: 'TEAR',
    aiConfidence: 96.8,
    weight: 2.31,
    expectedWeight: 2.40,
    weightDifference: -3.75,
    stationId: 'SORT-01',
    rejectReason: 'Structural Tear detected (96.8% confidence)',
    boundingBoxesTop: [
      { x: 32, y: 25, width: 35, height: 30, label: 'Tear 96.8%', confidence: 96.8 }
    ],
    boundingBoxesSide: [
      { x: 40, y: 20, width: 28, height: 35, label: 'Tear Seam', confidence: 94.2 }
    ],
    actuatorTriggered: true,
    syncedToCloud: true
  },
  {
    id: '3',
    trackingNumber: 'THA-20260930-001246',
    timestamp: '2026-09-30 08:39:50',
    time: '08:39:50',
    status: 'REJECT',
    damageType: 'DENT',
    aiConfidence: 94.7,
    weight: 1.82,
    expectedWeight: 1.80,
    weightDifference: 1.1,
    stationId: 'SORT-01',
    rejectReason: 'Corner Dent & Collapse (94.7% confidence)',
    boundingBoxesTop: [
      { x: 55, y: 15, width: 30, height: 35, label: 'Dent 94.7%', confidence: 94.7 }
    ],
    boundingBoxesSide: [],
    actuatorTriggered: true,
    syncedToCloud: true
  },
  {
    id: '4',
    trackingNumber: 'THA-20260930-001245',
    timestamp: '2026-09-30 08:38:12',
    time: '08:38:12',
    status: 'REJECT',
    damageType: 'WATER_STAIN',
    aiConfidence: 91.2,
    weight: 2.55,
    expectedWeight: 2.30,
    weightDifference: 10.8,
    stationId: 'SORT-01',
    rejectReason: 'Water Stain & Significant Weight Anomaly (+10.8%)',
    boundingBoxesTop: [
      { x: 22, y: 40, width: 45, height: 40, label: 'Water Stain 91.2%', confidence: 91.2 }
    ],
    boundingBoxesSide: [
      { x: 25, y: 50, width: 40, height: 30, label: 'Moisture Stain', confidence: 88.5 }
    ],
    actuatorTriggered: true,
    syncedToCloud: true
  },
  {
    id: '5',
    trackingNumber: 'THA-20260930-001244',
    timestamp: '2026-09-30 08:36:40',
    time: '08:36:40',
    status: 'PASS',
    damageType: 'NORMAL',
    aiConfidence: 99.1,
    weight: 4.12,
    expectedWeight: 4.10,
    weightDifference: 0.48,
    stationId: 'SORT-01',
    boundingBoxesTop: [],
    boundingBoxesSide: [],
    actuatorTriggered: false,
    syncedToCloud: true
  },
  {
    id: '6',
    trackingNumber: 'THA-20260930-001243',
    timestamp: '2026-09-30 08:35:10',
    time: '08:35:10',
    status: 'REJECT',
    damageType: 'WEIGHT_ANOMALY',
    aiConfidence: 98.2,
    weight: 3.10,
    expectedWeight: 2.50,
    weightDifference: 24.0,
    stationId: 'SORT-01',
    rejectReason: 'Weight discrepancy exceeds ±5% tolerance (Actual: 3.10kg, Expected: 2.50kg)',
    boundingBoxesTop: [],
    boundingBoxesSide: [],
    actuatorTriggered: true,
    syncedToCloud: true
  },
  {
    id: '7',
    trackingNumber: 'THA-20260930-001242',
    timestamp: '2026-09-30 08:33:00',
    time: '08:33:00',
    status: 'PASS',
    damageType: 'NORMAL',
    aiConfidence: 98.7,
    weight: 1.25,
    expectedWeight: 1.24,
    weightDifference: 0.8,
    stationId: 'SORT-01',
    boundingBoxesTop: [],
    boundingBoxesSide: [],
    actuatorTriggered: false,
    syncedToCloud: true
  },
  {
    id: '8',
    trackingNumber: 'THA-20260930-001241',
    timestamp: '2026-09-30 08:31:15',
    time: '08:31:15',
    status: 'REJECT',
    damageType: 'TEAR',
    aiConfidence: 89.4,
    weight: 0.95,
    expectedWeight: 0.94,
    weightDifference: 1.06,
    stationId: 'SORT-01',
    rejectReason: 'Box Seam Tear (89.4% confidence)',
    boundingBoxesTop: [
      { x: 30, y: 15, width: 40, height: 25, label: 'Tear 89.4%', confidence: 89.4 }
    ],
    boundingBoxesSide: [],
    actuatorTriggered: true,
    syncedToCloud: true
  },
  {
    id: '9',
    trackingNumber: 'THA-20260930-001240',
    timestamp: '2026-09-30 08:29:40',
    time: '08:29:40',
    status: 'PASS',
    damageType: 'NORMAL',
    aiConfidence: 99.5,
    weight: 2.80,
    expectedWeight: 2.79,
    weightDifference: 0.35,
    stationId: 'SORT-01',
    boundingBoxesTop: [],
    boundingBoxesSide: [],
    actuatorTriggered: false,
    syncedToCloud: true
  },
  {
    id: '10',
    trackingNumber: 'THA-20260930-001239',
    timestamp: '2026-09-30 08:27:00',
    time: '08:27:00',
    status: 'PASS',
    damageType: 'NORMAL',
    aiConfidence: 98.9,
    weight: 3.50,
    expectedWeight: 3.48,
    weightDifference: 0.57,
    stationId: 'SORT-01',
    boundingBoxesTop: [],
    boundingBoxesSide: [],
    actuatorTriggered: false,
    syncedToCloud: true
  }
];

export const ARCHITECTURE_NODES: ArchitectureNode[] = [
  {
    id: 'node-parcel',
    title: 'PARCEL ON BELT',
    category: 'SENSOR',
    role: 'Physical object entering sorting lane',
    input: 'Conveyor drive motor @ 0.75 m/s',
    output: 'Physical positioning in inspection tunnel',
    spec: 'Standard cardboard packaging up to 40x40x40cm',
    protocol: 'Mechanical Conveyor',
    latency: '0 ms',
    status: 'ONLINE'
  },
  {
    id: 'node-ir',
    title: 'PHOTOELECTRIC IR SENSOR',
    category: 'SENSOR',
    role: 'Breakbeam detection to trigger camera capture & weighing',
    input: 'Infrared light beam interruption',
    output: 'Digital HIGH signal to ESP32 / Industrial IO',
    spec: 'E3F-DS30C4 NPN Photoelectric Sensor (Response < 2ms)',
    protocol: 'Digital GPIO (5V)',
    latency: '1.2 ms',
    status: 'ONLINE'
  },
  {
    id: 'node-cam-top',
    title: 'TOP CAMERA',
    category: 'VISION',
    role: 'Top-down machine vision capture for surface defect detection',
    input: 'IR Sensor trigger signal',
    output: '1080p MJPEG frame stream @ 30 FPS',
    spec: 'Industrial HD USB3.0 Camera with 8mm Fixed Focal Lens',
    protocol: 'USB 3.0 UVC',
    latency: '15 ms',
    status: 'ONLINE'
  },
  {
    id: 'node-cam-side',
    title: 'SIDE CAMERA',
    category: 'VISION',
    role: 'Angled side view capture for corner denting & flap tearing',
    input: 'IR Sensor trigger signal',
    output: '1080p MJPEG frame stream @ 30 FPS',
    spec: 'Industrial HD USB3.0 Camera with Diffused LED Ring Light',
    protocol: 'USB 3.0 UVC',
    latency: '15 ms',
    status: 'ONLINE'
  },
  {
    id: 'node-edge-ai',
    title: 'EDGE AI INFERENCE ENGINE',
    category: 'COMPUTE',
    role: 'YOLOv8 deep learning model inferencing for Dent, Tear, Water Stain',
    input: 'Dual 1080p camera frames',
    output: 'Bounding Box coordinates, Class IDs, Confidence scores',
    spec: 'NVIDIA Jetson Orin Nano / TensorRT INT8 acceleration',
    protocol: 'Shared Memory / IPC',
    latency: '35 ms',
    status: 'ONLINE'
  },
  {
    id: 'node-ocr',
    title: 'OCR / BARCODE ENGINE',
    category: 'COMPUTE',
    role: 'Reads tracking number & queries expected weight from database',
    input: 'Top camera ROI crop',
    output: 'Tracking ID string (e.g. THA-20260930-001248)',
    spec: 'ZBar / Tesseract OCR engine optimized for logistics barcodes',
    protocol: 'API internal call',
    latency: '22 ms',
    status: 'ONLINE'
  },
  {
    id: 'node-loadcell',
    title: 'LOAD CELL + HX711',
    category: 'SENSOR',
    role: 'Measures parcel weight on in-line scale section',
    input: 'Mechanical mass deflection',
    output: 'Calibrated weight in kilograms (±0.01kg precision)',
    spec: '20kg Strain Gauge Load Cell + HX711 24-bit ADC module',
    protocol: '2-Wire Serial (DT/SCK)',
    latency: '80 ms',
    status: 'ONLINE'
  },
  {
    id: 'node-decision',
    title: 'DECISION LOGIC ENGINE',
    category: 'COMPUTE',
    role: 'Evaluates AI Confidence (>85%) and Weight Anomaly (±5%) for PASS/REJECT',
    input: 'AI Inference result + Weight reading + Database manifest',
    output: 'PASS / REJECT decision boolean + Reject reason tag',
    spec: 'Python Fast-Logic Rule Engine with Fail-Safe Fallback',
    protocol: 'Internal Bus',
    latency: '2 ms',
    status: 'ONLINE'
  },
  {
    id: 'node-esp32',
    title: 'ESP32 / PLC CONTROLLER',
    category: 'COMPUTE',
    role: 'Controls physical hardware, pneumatic valve timing, tower lights',
    input: 'Decision payload over USB Serial / Modbus',
    output: 'Solenoid pulse, Tower Light outputs, Buzzer PWM',
    spec: 'ESP32 Dual-Core 240MHz / Optocoupled Relay Interface',
    protocol: 'UART Serial @ 115200 baud',
    latency: '5 ms',
    status: 'ONLINE'
  },
  {
    id: 'node-actuator',
    title: 'PNEUMATIC REJECT CYLINDER',
    category: 'ACTUATOR',
    role: 'Pushes REJECTED parcels off conveyor belt into quarantine bin',
    input: '5/2-Way Solenoid Valve air pulse',
    output: 'Physical stroke deflection (180ms delay calibration)',
    spec: 'SMC Double-Acting Pneumatic Cylinder @ 6.0 Bar Air Pressure',
    protocol: 'Pneumatic Pressure Pulse',
    latency: '180 ms',
    status: 'ONLINE'
  },
  {
    id: 'node-local-db',
    title: 'LOCAL DATABASE (SQLite/PostgreSQL)',
    category: 'STORAGE',
    role: 'Stores inspection logs & evidence images locally for Store-and-Forward',
    input: 'Inspection telemetry + Cropped evidence image blobs',
    output: 'Persistent local storage record with queue index',
    spec: 'Local SSD Storage (SQLite WAL mode for high write speed)',
    protocol: 'Local SQL Query',
    latency: '8 ms',
    status: 'ONLINE'
  },
  {
    id: 'node-mqtt',
    title: 'MQTT BROKER',
    category: 'NETWORK',
    role: 'Publishes real-time telemetry events to Cloud & Dashboard',
    input: 'Local DB triggers',
    output: 'JSON MQTT topic messages (spdi/sort-01/telemetry)',
    spec: 'Mosquitto MQTT Broker (TLS Secured)',
    protocol: 'MQTT over WebSockets',
    latency: '12 ms',
    status: 'ONLINE'
  },
  {
    id: 'node-cloud',
    title: 'CLOUD DASHBOARD',
    category: 'NETWORK',
    role: 'Centralized multi-station logistics analytics & remote management',
    input: 'MQTT stream + REST API sync payloads',
    output: 'Aggregated analytics, defect reports, claim evidence lookup',
    spec: 'Industry 4.0 Cloud Hub (AWS / GCP IoT Core)',
    protocol: 'HTTPS / WSS',
    latency: '45 ms',
    status: 'ONLINE'
  }
];

export const FAILURE_TEST_SCENARIOS: FailureTestScenario[] = [
  {
    id: 'test-false-positive',
    title: 'False Positive Test (Bubble Wrap Reflection)',
    subtitle: 'Reflective packaging material misclassification validation',
    description: 'Tests if reflective plastic bubble wrap or shiny stretch film causes the AI model to falsely trigger a Water Stain or Dent defect.',
    expectedResult: 'SYSTEM SHOULD CLASSIFY AS PASS (Reflection ignored, Confidence < 50%)',
    simulatedDamage: 'NORMAL',
    testSteps: [
      'Position parcel wrapped in high-gloss bubble wrap under Top Camera.',
      'Trigger IR Sensor and activate intense LED glare ring.',
      'Evaluate Edge AI inference raw heatmaps for glare false-positives.',
      'Verify Decision Engine applies specular reflection filter.'
    ]
  },
  {
    id: 'test-ai-confusion',
    title: 'AI Confusion Test (Graphic Pattern Printed on Box)',
    subtitle: 'High-contrast graphic print vs actual box tear seam',
    description: 'Tests if dark printed barcode patterns or diagonal brand stripes confuse the AI into detecting a box tear defect.',
    expectedResult: 'SYSTEM SHOULD SEPARATE PRINT PATTERN FROM PHYSICAL TEAR SEAM',
    simulatedDamage: 'TEAR',
    testSteps: [
      'Feed box with black diagonal warning stripes under Side Camera.',
      'Run YOLOv8 feature extractor to differentiate surface color from depth seam.',
      'Check confidence score threshold (Must exceed 85% to trigger REJECT).'
    ]
  },
  {
    id: 'test-hardware-limit',
    title: 'Hardware Limit Test (Parcels Too Close / Conveyor Jam)',
    subtitle: 'Photoelectric IR sensor overlap & back-to-back parcel handling',
    description: 'Simulates two parcels entering the inspection tunnel separated by less than 5cm, causing continuous IR trigger.',
    expectedResult: 'SYSTEM TRIGGERS OVERLAP WARNING & HALTS CONVEYOR SAFELY',
    simulatedDamage: 'WEIGHT_ANOMALY',
    testSteps: [
      'Simulate IR Sensor stay HIGH for > 3.0 seconds.',
      'Load Cell detects combined weight anomaly (> +50% expected).',
      'ESP32 issues conveyor pause and triggers Yellow Tower Light warning.'
    ]
  },
  {
    id: 'test-offline-resiliency',
    title: 'Offline Resiliency Test (Store-and-Forward Engine)',
    subtitle: 'Network disconnection & local SQLite queuing resilience',
    description: 'Disconnects internet/MQTT link mid-operation to verify Edge AI and pneumatic sorting continue working autonomously.',
    expectedResult: 'EDGE SORTING CONTINUES 100% OPERATIONAL. RECORDS QUEUED IN LOCAL DB.',
    simulatedDamage: 'DENT',
    testSteps: [
      'Cut WAN network interface.',
      'Pass 10 parcels (Normal and Damaged) through station.',
      'Verify pneumatic reject cylinder fires on rejected parcels.',
      'Restore network link and verify automatic background sync of queued records.'
    ]
  }
];

export const SYSTEM_ANOMALIES_LOG: AnomalyLog[] = [
  {
    id: 'a1',
    timestamp: '08:40:12',
    severity: 'WARNING',
    title: 'Camera Vision Lighting Brightness Drop',
    description: 'Top Camera ambient brightness fell below 120 lux threshold. Auto-compensated by boosting Ring LED power to 100%.',
    resolved: true
  },
  {
    id: 'a2',
    timestamp: '08:35:10',
    severity: 'CRITICAL',
    title: 'Weight Discrepancy Anomaly Detected',
    description: 'Parcel THA-20260930-001243 measured 3.10kg vs manifest 2.50kg (+24.0% difference). Routed to REJECT bin.',
    resolved: true
  },
  {
    id: 'a3',
    timestamp: '08:22:45',
    severity: 'INFO',
    title: 'Store-and-Forward Sync Completed',
    description: 'Network restored. 14 pending local database records synchronized with Cloud Hub successfully.',
    resolved: true
  },
  {
    id: 'a4',
    timestamp: '08:15:30',
    severity: 'WARNING',
    title: 'Pneumatic Air Pressure Drop Warning',
    description: 'Compressor line pressure dipped to 5.4 bar (Normal: 6.0 bar). Solenoid actuation timing auto-adjusted by +15ms.',
    resolved: true
  }
];

export const DEFAULT_ENGINEERING_SETTINGS: EngineeringSettings = {
  aiConfidenceThreshold: 85,
  actuatorDelayMs: 180,
  weightTolerancePct: 5,
  conveyorSpeedMs: 0.75,
  cameraExposure: 450,
  brightnessThreshold: 120,
  offlineQueueLimit: 500
};

export const HOURLY_REJECT_RATE = [
  { time: '08:00', total: 140, pass: 132, reject: 8, rate: 5.7 },
  { time: '09:00', total: 185, pass: 173, reject: 12, rate: 6.5 },
  { time: '10:00', total: 210, pass: 198, reject: 12, rate: 5.7 },
  { time: '11:00', total: 195, pass: 185, reject: 10, rate: 5.1 },
  { time: '12:00', total: 120, pass: 114, reject: 6, rate: 5.0 },
  { time: '13:00', total: 205, pass: 191, reject: 14, rate: 6.8 },
  { time: '14:00', total: 193, pass: 181, reject: 12, rate: 6.2 },
  { time: '15:00', total: 160, pass: 151, reject: 9, rate: 5.6 },
];

export const DAMAGE_CATEGORY_PARETO = [
  { category: 'Dent / Crush', count: 32, cumulativePct: 44.4 },
  { category: 'Tear / Seam Open', count: 24, cumulativePct: 77.8 },
  { category: 'Water Stain / Moisture', count: 11, cumulativePct: 93.1 },
  { category: 'Weight Anomaly', count: 5, cumulativePct: 100.0 },
];

export const AI_CONFIDENCE_HISTOGRAM = [
  { range: '50-60%', count: 2 },
  { range: '60-70%', count: 4 },
  { range: '70-80%', count: 9 },
  { range: '80-85%', count: 15 },
  { range: '85-90%', count: 112 },
  { range: '90-95%', count: 420 },
  { range: '95-100%', count: 686 },
];

export const WEIGHT_ANOMALY_SCATTER = [
  { parcel: 'P1', expected: 1.5, actual: 1.51, diff: 0.6, status: 'PASS' },
  { parcel: 'P2', expected: 2.4, actual: 2.39, diff: -0.4, status: 'PASS' },
  { parcel: 'P3', expected: 3.0, actual: 3.02, diff: 0.6, status: 'PASS' },
  { parcel: 'P4', expected: 2.3, actual: 2.55, diff: 10.8, status: 'REJECT' },
  { parcel: 'P5', expected: 2.5, actual: 3.10, diff: 24.0, status: 'REJECT' },
  { parcel: 'P6', expected: 4.1, actual: 4.12, diff: 0.48, status: 'PASS' },
  { parcel: 'P7', expected: 1.8, actual: 1.82, diff: 1.1, status: 'PASS' },
  { parcel: 'P8', expected: 0.94, actual: 0.95, diff: 1.06, status: 'PASS' },
];
