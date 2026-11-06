/*
 * SPDI - ESP32 reject station (runs on real ESP32 or in the Wokwi simulator)
 *
 * Listens for PASS/FAIL decisions from the bridge relay over MQTT:
 *   <TOPIC_BASE>/cmd     {"r":"FAIL","c":"dent","n":12}
 *   <TOPIC_BASE>/status  "online" | "offline"   (retained, from the relay)
 * Reports back what it did:
 *   <TOPIC_BASE>/ack     {"n":12,"act":"dent_bin","pass":10,"dent":1,"tear":1}
 *
 * Line (top view, drawn live on the OLED):
 *
 *   CAM ->  [box] ==== belt ====[P1]======[P2]=====> OUT (shipped)
 *                               |         |
 *                           DENT bin   TEAR bin
 *
 *   P1 / P2  : pushers (servos). A box rides the belt to its pusher, gets pushed
 *              off sideways and drops into its bin. Good boxes ride to OUT.
 *   Bin LEDs : light up when a box lands in that bin
 *   Tower    : GREEN running / blinks on PASS, YELLOW connecting or bridge offline,
 *              RED damaged box detected
 *   LCD 16x2 : last decision + counters, Buzzer: beep on FAIL
 *   Button   : local test, sends a dent / tear box alternately (no network needed)
 */
#include <WiFi.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ---- settings -------------------------------------------------------------
// Copy RELAY_TOPIC from bridge/.env (printed by `npm run relay`)
#define TOPIC_BASE   "spdi-xxxxxxxx/line1"

#define WIFI_SSID    "Wokwi-GUEST"   // Wokwi's built-in WiFi; change for a real board
#define WIFI_PASS    ""
#define MQTT_HOST    "broker.hivemq.com"
#define MQTT_PORT    1883

const int PIN_GREEN    = 25;
const int PIN_YELLOW   = 26;
const int PIN_RED      = 27;
const int PIN_BIN_DENT = 32;
const int PIN_BIN_TEAR = 33;
const int PIN_SERVO_DENT = 18;
const int PIN_SERVO_TEAR = 13;
const int PIN_BUZZER = 19;
const int PIN_BUTTON = 4;

const int SERVO_HOME = 0;
const int SERVO_PUSH = 90;
const float BELT_PX_PER_MS = 0.035;   // OLED belt speed (128 px in ~3.6 s)
const float PUSH_PX_PER_MS = 0.06;    // how fast a pushed box slides into the bin
const unsigned long BIN_LED_MS  = 900;
const unsigned long RED_HOLD_MS = 1500;
const unsigned long GREEN_BLINK_MS = 250;

// ---- OLED geometry (top view) ----------------------------------------------
const int BELT_TOP = 20, BELT_BOT = 40;      // belt band
const int BOX = 12;                          // box size in px
const int BOX_Y = 24;                        // box y while riding the belt
const int BIN_Y = 44;                        // bins below the belt
const int STATION_X[2] = {57, 97};           // pusher centres: 0 = dent, 1 = tear
const int BIN_W = 28;

// ---- state ----------------------------------------------------------------
WiFiClient net;
PubSubClient mqtt(net);
Servo pusher[2];
LiquidCrystal_I2C lcd(0x27, 16, 2);
Adafruit_SSD1306 oled(128, 64, &Wire, -1);
bool oledOk = false;
bool oledDirty = true;            // redraw only when something changed (keeps the simulator fast)

const String T_CMD    = String(TOPIC_BASE) + "/cmd";
const String T_STATUS = String(TOPIC_BASE) + "/status";
const String T_ACK    = String(TOPIC_BASE) + "/ack";

bool bridgeOnline = false;
unsigned long passCount = 0, failCount = 0, shipped = 0;
unsigned long binCount[2] = {0, 0};

enum Kind { GOOD, DENT, TEAR };
enum Stage { RIDING, PUSHING, LANDED };
struct Box {
  bool used;
  Kind kind;
  long no;
  float x, y;
  Stage stage;
  unsigned long landedAt;
};
const int MAX_BOXES = 8;
Box boxes[MAX_BOXES];

bool pusherBusy[2] = {false, false};
unsigned long binLedUntil[2] = {0, 0};
unsigned long redUntil = 0, greenBlinkUntil = 0;
unsigned long lastConnTry = 0, lastFrame = 0, lastStep = 0;
bool lastButton = HIGH;
int testToggle = 0;

// ---- helpers --------------------------------------------------------------
void lcdLine(int row, const String &text) {
  String t = text;
  while (t.length() < 16) t += ' ';
  lcd.setCursor(0, row);
  lcd.print(t.substring(0, 16));
}

void showCounters() {
  oledDirty = true;
  lcdLine(1, "P" + String(passCount) + " D" + String(binCount[0]) + " T" + String(binCount[1]) +
             " OUT" + String(shipped));
}

// tiny JSON readers, enough for {"r":"FAIL","c":"dent","n":12}
String jsonStr(const String &s, const char *key) {
  String k = String("\"") + key + "\":\"";
  int i = s.indexOf(k);
  if (i < 0) return "";
  i += k.length();
  int j = s.indexOf('"', i);
  return j < 0 ? "" : s.substring(i, j);
}

long jsonNum(const String &s, const char *key) {
  String k = String("\"") + key + "\":";
  int i = s.indexOf(k);
  return i < 0 ? -1 : s.substring(i + k.length()).toInt();
}

void ack(long n, const char *act) {
  if (!mqtt.connected()) return;
  String msg = "{\"n\":" + String(n) + ",\"act\":\"" + act + "\",\"pass\":" + String(passCount) +
               ",\"dent\":" + String(binCount[0]) + ",\"tear\":" + String(binCount[1]) +
               ",\"out\":" + String(shipped) + "}";
  mqtt.publish(T_ACK.c_str(), msg.c_str());
}

void spawnBox(Kind kind, long n) {
  for (int i = 0; i < MAX_BOXES; i++) {
    if (boxes[i].used) continue;
    boxes[i] = {true, kind, n, 2, (float)BOX_Y, RIDING, 0};
    return;
  }
  Serial.println("belt full, box dropped from animation");
}

void handleDecision(bool fail, const String &cls, long n) {
  String no = n >= 0 ? "#" + String(n) + " " : "";
  if (fail) {
    String c = cls;
    c.toLowerCase();
    Kind kind = (c.indexOf("tear") >= 0 || c.indexOf("torn") >= 0) ? TEAR : DENT;
    failCount++;
    redUntil = millis() + RED_HOLD_MS;
    tone(PIN_BUZZER, 1800, 150);
    spawnBox(kind, n);
    lcdLine(0, no + "REJECT " + cls);
    Serial.println("FAIL " + no + cls + (kind == TEAR ? " -> TEAR bin" : " -> DENT bin"));
  } else {
    passCount++;
    greenBlinkUntil = millis() + GREEN_BLINK_MS;
    spawnBox(GOOD, n);
    lcdLine(0, no + "PASS " + cls);
    Serial.println("PASS " + no + cls);
  }
  showCounters();
}

void onMessage(char *topic, byte *payload, unsigned int len) {
  String t(topic);
  String body;
  body.reserve(len);
  for (unsigned int i = 0; i < len; i++) body += (char)payload[i];

  if (t == T_STATUS) {
    bridgeOnline = (body == "online");
    Serial.println("bridge " + body);
    if (!bridgeOnline) lcdLine(0, "Bridge offline");
    return;
  }
  if (t == T_CMD) {
    String r = jsonStr(body, "r");
    if (r != "PASS" && r != "FAIL") return;
    handleDecision(r == "FAIL", jsonStr(body, "c"), jsonNum(body, "n"));
  }
}

void ensureConnected() {
  if (mqtt.connected()) return;
  if (millis() - lastConnTry < 3000) return;   // non-blocking retry
  lastConnTry = millis();

  if (WiFi.status() != WL_CONNECTED) {
    lcdLine(0, "WiFi...");
    return;                                     // WiFi.begin() keeps trying by itself
  }
  lcdLine(0, "MQTT...");
  String id = "spdi-esp32-" + String(esp_random() & 0xffffff, HEX);   // random: two sims never kick each other
  if (mqtt.connect(id.c_str())) {
    mqtt.subscribe(T_CMD.c_str());
    mqtt.subscribe(T_STATUS.c_str());
    Serial.println("MQTT connected, topic " + String(TOPIC_BASE));
    lcdLine(0, "Waiting bridge");
  } else {
    Serial.println("MQTT failed, rc=" + String(mqtt.state()));
  }
}

// ---- belt physics -----------------------------------------------------------
void stepBelt() {
  unsigned long now = millis();
  float dt = (float)(now - lastStep);
  lastStep = now;
  if (dt > 100) dt = 100;

  for (int i = 0; i < MAX_BOXES; i++) {
    Box &b = boxes[i];
    if (!b.used) continue;
    int s = b.kind == DENT ? 0 : 1;

    if (b.stage == RIDING) {
      float target = b.kind == GOOD ? 200 : STATION_X[s] - BOX / 2;
      if (b.kind != GOOD && b.x >= target) {
        b.x = target;
        if (!pusherBusy[s]) {                 // wait at the station if the pusher is busy
          pusherBusy[s] = true;
          pusher[s].write(SERVO_PUSH);
          b.stage = PUSHING;
        }
      } else {
        b.x += BELT_PX_PER_MS * dt;
      }
      if (b.kind == GOOD && b.x > 128) {      // reached the end of the line
        shipped++;
        b.used = false;
        showCounters();
        ack(b.no, "shipped");
      }
    } else if (b.stage == PUSHING) {
      b.y += PUSH_PX_PER_MS * dt;
      if (b.y >= BIN_Y + 2) {
        b.y = BIN_Y + 2;
        b.stage = LANDED;
        b.landedAt = now;
        binCount[s]++;
        binLedUntil[s] = now + BIN_LED_MS;
        pusher[s].write(SERVO_HOME);
        pusherBusy[s] = false;
        showCounters();
        Serial.println(String("box #") + b.no + (s ? " landed in TEAR bin" : " landed in DENT bin"));
        ack(b.no, s ? "tear_bin" : "dent_bin");
      }
    } else if (now - b.landedAt > 400) {
      b.used = false;                          // fell to the bottom of the bin
    }
  }
}

// ---- OLED drawing -----------------------------------------------------------
void drawBox(const Box &b) {
  int x = (int)b.x, y = (int)b.y;
  if (b.kind == GOOD) {
    oled.fillRect(x, y, BOX, BOX, SSD1306_WHITE);
    oled.drawLine(x + BOX / 2, y, x + BOX / 2, y + BOX - 1, SSD1306_BLACK);   // tape
  } else {
    oled.fillRect(x, y, BOX, BOX, SSD1306_BLACK);
    oled.drawRect(x, y, BOX, BOX, SSD1306_WHITE);
    if (b.kind == DENT) {
      oled.fillTriangle(x + BOX - 1, y, x + BOX - 6, y, x + BOX - 1, y + 5, SSD1306_BLACK);  // crushed corner
      oled.drawLine(x + BOX - 6, y, x + BOX - 1, y + 5, SSD1306_WHITE);
    } else {
      oled.drawLine(x + 2, y + 2, x + BOX - 3, y + BOX - 3, SSD1306_WHITE);   // tear
      oled.drawLine(x + 3, y + 2, x + BOX - 2, y + BOX - 3, SSD1306_WHITE);
    }
  }
}

void drawScene() {
  unsigned long now = millis();
  oled.clearDisplay();
  oled.setTextSize(1);
  oled.setTextColor(SSD1306_WHITE);

  // header
  oled.setCursor(0, 0);
  oled.print("IN ");
  oled.print(passCount + failCount);
  oled.setCursor(76, 0);
  oled.print("OUT ");
  oled.print(shipped);

  // belt with moving rollers
  oled.drawFastHLine(0, BELT_TOP, 128, SSD1306_WHITE);
  oled.drawFastHLine(0, BELT_BOT, 128, SSD1306_WHITE);
  int off = (now / 40) % 8;
  for (int x = off; x < 128; x += 8) oled.drawPixel(x, BELT_BOT - 2, SSD1306_WHITE);

  // camera at the start
  oled.fillTriangle(2, 10, 10, 10, 6, 17, SSD1306_WHITE);

  // bins
  const char *binName[2] = {"DENT", "TEAR"};
  for (int s = 0; s < 2; s++) {
    int bx = STATION_X[s] - BIN_W / 2;
    oled.drawFastVLine(bx, BIN_Y, 64 - BIN_Y, SSD1306_WHITE);
    oled.drawFastVLine(bx + BIN_W - 1, BIN_Y, 64 - BIN_Y, SSD1306_WHITE);
    oled.drawFastHLine(bx, 63, BIN_W, SSD1306_WHITE);
    if (now < binLedUntil[s]) oled.fillRect(bx + 2, 58, BIN_W - 4, 4, SSD1306_WHITE);  // flash
  }

  // boxes (drawn before pushers so the rod is on top)
  for (int i = 0; i < MAX_BOXES; i++) if (boxes[i].used) drawBox(boxes[i]);

  // pushers: cylinder above the belt, rod reaches down to the box being pushed
  for (int s = 0; s < 2; s++) {
    int cx = STATION_X[s];
    oled.fillRect(cx - 4, 10, 9, 5, SSD1306_WHITE);          // cylinder
    int rodEnd = BELT_TOP - 1;
    for (int i = 0; i < MAX_BOXES; i++) {
      const Box &b = boxes[i];
      if (b.used && b.stage == PUSHING && (b.kind == DENT ? 0 : 1) == s) rodEnd = (int)b.y - 1;
    }
    oled.drawFastVLine(cx, 15, rodEnd - 14, SSD1306_WHITE);   // rod
    oled.drawFastHLine(cx - 5, rodEnd, 11, SSD1306_WHITE);    // push plate
  }

  // bin labels with counts
  for (int s = 0; s < 2; s++) {
    int bx = STATION_X[s] - BIN_W / 2;
    oled.setCursor(bx + 3, 49);
    oled.print(binName[s][0]);
    oled.print(binCount[s]);
  }
  oled.setCursor(0, 49);
  oled.print("BIN");

  oled.display();
  oledDirty = false;
}

bool sceneMoving() {
  unsigned long now = millis();
  if (now < binLedUntil[0] + 100 || now < binLedUntil[1] + 100) return true;
  for (int i = 0; i < MAX_BOXES; i++) if (boxes[i].used) return true;
  return false;
}

void updateLights() {
  unsigned long now = millis();
  bool online = mqtt.connected() && bridgeOnline;
  bool red = now < redUntil;
  bool blinkOff = now < greenBlinkUntil && (now / 60) % 2;   // quick flicker on PASS
  bool connecting = !mqtt.connected();

  digitalWrite(PIN_RED, red);
  digitalWrite(PIN_GREEN, online && !red && !blinkOff);
  digitalWrite(PIN_YELLOW, connecting ? (now / 400) % 2 : !bridgeOnline);
  digitalWrite(PIN_BIN_DENT, now < binLedUntil[0]);
  digitalWrite(PIN_BIN_TEAR, now < binLedUntil[1]);
}

// ---- main -----------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  int outs[] = {PIN_GREEN, PIN_YELLOW, PIN_RED, PIN_BIN_DENT, PIN_BIN_TEAR};
  for (int p : outs) pinMode(p, OUTPUT);
  pinMode(PIN_BUTTON, INPUT_PULLUP);

  pusher[0].attach(PIN_SERVO_DENT);
  pusher[1].attach(PIN_SERVO_TEAR);
  pusher[0].write(SERVO_HOME);
  pusher[1].write(SERVO_HOME);

  Wire.begin();
  Wire.setClock(400000);
  lcd.init();
  lcd.backlight();
  lcdLine(0, "SPDI reject stn");
  showCounters();
  oledOk = oled.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  if (!oledOk) Serial.println("OLED not found (0x3C) - animation off");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMessage);
  lastStep = millis();
  Serial.println("SPDI ESP32 starting, topic " + String(TOPIC_BASE));
}

void loop() {
  ensureConnected();
  mqtt.loop();

  bool b = digitalRead(PIN_BUTTON);
  if (lastButton == HIGH && b == LOW) handleDecision(true, (testToggle++ % 2) ? "tear" : "dent", -1);
  lastButton = b;

  stepBelt();
  updateLights();
  if (oledOk && (oledDirty || sceneMoving()) && millis() - lastFrame >= 80) {
    lastFrame = millis();
    drawScene();
  }
  delay(10);
}
