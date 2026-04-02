#include <SoftwareSerial.h>

// HC-05 wiring (RX, TX): adjust pins to your board wiring.
SoftwareSerial bluetoothSerial(10, 11);

const int GAS_LED_PIN = 2;
const int TEMP_LED_PIN = 3;
const int MAINT_LED_PIN = 4;

const char* ALERT_TYPES[] = {"gas", "temperature", "maintenance"};
const int ALERT_LED_PINS[] = {GAS_LED_PIN, TEMP_LED_PIN, MAINT_LED_PIN};
const int ALERT_COUNT = 3;

unsigned long nextTriggerAtMs = 0;
unsigned long eventCounter = 0;

void setup() {
  pinMode(GAS_LED_PIN, OUTPUT);
  pinMode(TEMP_LED_PIN, OUTPUT);
  pinMode(MAINT_LED_PIN, OUTPUT);

  Serial.begin(9600);
  bluetoothSerial.begin(9600);

  randomSeed(analogRead(A0));
  scheduleNextTrigger();

  Serial.println("[guardian] Firmware initialized");
}

void loop() {
  unsigned long nowMs = millis();
  if (nowMs < nextTriggerAtMs) {
    return;
  }

  triggerRandomAlert(nowMs);
  scheduleNextTrigger();
}

void triggerRandomAlert(unsigned long nowMs) {
  int alertIndex = random(0, ALERT_COUNT);
  int ledPin = ALERT_LED_PINS[alertIndex];

  digitalWrite(ledPin, HIGH);
  delay(150);
  digitalWrite(ledPin, LOW);

  eventCounter++;

  String frame = "EVT|";
  frame += String(eventCounter);
  frame += "|";
  frame += ALERT_TYPES[alertIndex];
  frame += "|";
  frame += String(nowMs);

  // Debug logs for serial monitor and Bluetooth output.
  Serial.print("[guardian] emitted frame: ");
  Serial.println(frame);

  bluetoothSerial.println(frame);
}

void scheduleNextTrigger() {
  unsigned long intervalMs = random(2000, 3001);
  nextTriggerAtMs = millis() + intervalMs;

  Serial.print("[guardian] next trigger in ms: ");
  Serial.println(intervalMs);
}
