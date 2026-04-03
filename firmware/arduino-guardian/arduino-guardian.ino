#include <SoftwareSerial.h>

SoftwareSerial BT(10, 11); // RX, TX for Bluetooth (optional)

int gasLED = 2;
int tempLED = 3;
int maintLED = 4;

String currentAlert = "";
int currentLED = -1;
unsigned long alertStartTime = 0;
unsigned long alertDuration = 2000; // 2 seconds alert duration
unsigned long lastAlertTime = 0; // Track when last alert was generated
unsigned long alertInterval = 2000; // Generate new alert every 2 seconds
int lastAlertIndex = -1; // Prevent same alert twice in a row

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
  
  // Initialize random seed
  randomSeed(analogRead(0));

  Serial.println("Factory Guardian Hardware Ready - Lights blinking!");
  BT.println("Factory Guardian Hardware Ready - Lights blinking!");
  
  // Start blinking immediately
  lastAlertTime = millis();
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
  
  // Auto-generate random alerts every 2 seconds
  if (millis() - lastAlertTime >= alertInterval) {
    generateRandomAlert();
    lastAlertTime = millis();
  }
  
  // Handle current alert timeout (turn off LED after duration)
  if (currentAlert != "" && (millis() - alertStartTime > alertDuration)) {
    clearAlert();
  }
  
  delay(50); // Small delay to prevent excessive CPU usage
}

void generateRandomAlert() {
  // Weighted random: Gas 40%, Temperature 40%, Maintenance 20%
  int roll;
  int alertIndex;
  
  // Prevent same alert twice in a row
  do {
    roll = random(10);
    if (roll < 4) {
      alertIndex = 0; // GAS
    } else if (roll < 8) {
      alertIndex = 1; // TEMPERATURE
    } else {
      alertIndex = 2; // MAINTENANCE
    }
  } while (alertIndex == lastAlertIndex);
  
  lastAlertIndex = alertIndex;
  
  switch (alertIndex) {
    case 0:
      startAlert("GAS");
      break;
    case 1:
      startAlert("TEMPERATURE");
      break;
    case 2:
      startAlert("MAINTENANCE");
      break;
  }
}

void processCommand(String command) {
  command.toUpperCase();
  
  if (command.startsWith("ALERT:")) {
    // Manual alert from web game
    String alertType = command.substring(6);
    startAlert(alertType);
    lastAlertTime = millis(); // Reset auto-generate timer
  }
  else if (command == "CLEAR" || command == "STOP") {
    clearAlert();
  }
  else if (command == "STATUS") {
    Serial.println("STATUS:running,alert=" + currentAlert);
    BT.println("STATUS:running,alert=" + currentAlert);
  }
  else if (command.startsWith("PING")) {
    Serial.println("PONG:running");
    BT.println("PONG:running");
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
    BT.println("GAS LEAK!");
  }
  else if (alertType == "TEMPERATURE") {
    currentLED = tempLED;
    digitalWrite(tempLED, HIGH);
    BT.println("HIGH TEMP!");
  }
  else if (alertType == "MAINTENANCE") {
    currentLED = maintLED;
    digitalWrite(maintLED, HIGH);
    BT.println("MAINTENANCE!");
  }
  
  // Confirm alert started
  String eventId = "EVT" + String(random(1000, 9999));
  String alertTypeLower = alertType;
  alertTypeLower.toLowerCase();
  String frameData = "EVT|" + eventId + "|" + alertTypeLower + "|" + String(millis());
  Serial.println(frameData);
}

void clearAlert() {
  currentAlert = "";
  currentLED = -1;
  
  // Turn off all LEDs
  digitalWrite(gasLED, LOW);
  digitalWrite(tempLED, LOW);
  digitalWrite(maintLED, LOW);
}