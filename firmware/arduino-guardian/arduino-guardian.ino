#include <SoftwareSerial.h>

SoftwareSerial BT(10, 11); // RX, TX for Bluetooth (optional)

int gasLED = 2;
int tempLED = 3;
int maintLED = 4;

int score = 0;
String currentAlert = "";
int currentLED = -1;
unsigned long alertStartTime = 0;
unsigned long alertDuration = 6000; // 6 seconds alert duration

void setup() {
  Serial.begin(9600);
  BT.begin(9600);

  pinMode(gasLED, OUTPUT);
  pinMode(tempLED, OUTPUT);
  pinMode(maintLED, OUTPUT);

  // Turn off all LEDs initially
  digitalWrite(gasLED, LOW);
  digitalWrite(tempLED, LOW);
  digitalWrite(maintLED, LOW);

  Serial.println("Factory Guardian Hardware Ready - Waiting for commands");
  BT.println("Factory Guardian Hardware Ready - Waiting for commands");
}

void loop() {
  // Check for incoming commands from Serial or Bluetooth
  String command = "";
  
  if (Serial.available()) {
    command = Serial.readStringUntil('\n');
    command.trim();
  } else if (BT.available()) {
    command = BT.readStringUntil('\n'); 
    command.trim();
  }
  
  // Process commands
  if (command.length() > 0) {
    processCommand(command);
  }
  
  // Handle current alert timeout
  if (currentAlert != "" && (millis() - alertStartTime > alertDuration)) {
    // Alert timed out - turn off LED
    clearAlert();
    Serial.println("ALERT_TIMEOUT:" + currentAlert);
  }
  
  delay(50); // Small delay to prevent excessive CPU usage
}

void processCommand(String command) {
  command.toUpperCase();
  
  if (command.startsWith("ALERT:")) {
    // Command format: ALERT:gas or ALERT:temperature or ALERT:maintenance
    String alertType = command.substring(6);
    startAlert(alertType);
  }
  else if (command == "CLEAR" || command == "STOP") {
    // Clear current alert
    clearAlert();
  }
  else if (command == "STATUS") {
    // Report current status
    Serial.println("STATUS:ready,alert=" + currentAlert);
  }
  else if (command.startsWith("PING")) {
    // Respond to ping
    Serial.println("PONG:ready");
  }
}

void startAlert(String alertType) {
  // Clear previous alert first
  clearAlert();
  
  currentAlert = alertType;
  alertStartTime = millis();
  
  if (alertType == "GAS") {
    currentLED = gasLED;
    digitalWrite(gasLED, HIGH);
    BT.println("🚨 GAS LEAK DETECTED! 🚨");
  }
  else if (alertType == "TEMPERATURE") {
    currentLED = tempLED;
    digitalWrite(tempLED, HIGH);
    BT.println("🌡️ HIGH TEMPERATURE! 🌡️");
  }
  else if (alertType == "MAINTENANCE") {
    currentLED = maintLED;
    digitalWrite(maintLED, HIGH);
    BT.println("🔧 MAINTENANCE REQUIRED! 🔧");
  }
  
  // Confirm alert started
  String eventId = "EVT" + String(random(1000, 9999));
  String frameData = "EVT|" + eventId + "|" + alertType.toLowerCase() + "|" + String(millis());
  Serial.println(frameData);
  
  Serial.println("ALERT_STARTED:" + alertType + ":" + eventId);
}

void clearAlert() {
  if (currentAlert != "") {
    // Turn off current LED
    if (currentLED != -1) {
      digitalWrite(currentLED, LOW);
    }
    
    Serial.println("ALERT_CLEARED:" + currentAlert);
    currentAlert = "";
    currentLED = -1;
  }
  
  // Make sure all LEDs are off
  digitalWrite(gasLED, LOW);
  digitalWrite(tempLED, LOW);
  digitalWrite(maintLED, LOW);
}