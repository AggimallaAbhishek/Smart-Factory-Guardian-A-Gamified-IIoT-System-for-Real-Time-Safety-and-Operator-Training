#include <SoftwareSerial.h>

SoftwareSerial BT(10, 11); // RX, TX for Bluetooth (optional)

int gasLED = 2;
int tempLED = 3;
int maintLED = 4;

int score = 0;
char correctKey;
int eventLED;
unsigned long reactionTime;

int lastEvent = -1;

void setup() {
  Serial.begin(9600);
  BT.begin(9600);

  pinMode(gasLED, OUTPUT);
  pinMode(tempLED, OUTPUT);
  pinMode(maintLED, OUTPUT);

  randomSeed(analogRead(0));

  Serial.println("Factory Guardian Hardware Started");
  BT.println("Factory Guardian Hardware Started");
}

void loop() {
  // Clear old input
  while (BT.available()) {
    BT.read();
  }
  while (Serial.available()) {
    Serial.read();
  }

  digitalWrite(gasLED, LOW);
  digitalWrite(tempLED, LOW);
  digitalWrite(maintLED, LOW);

  // -------- EVENT SELECTION --------
  int event;

  // Prevent consecutive same alerts (like Arduino timing)
  do {
    event = random(10);
  } while (
    (event < 4 && lastEvent == 0) ||
    (event >= 4 && event < 8 && lastEvent == 1) ||
    (event >= 8 && lastEvent == 2)
  );

  String alertType;
  String eventId = String("EVT") + String(random(1000, 9999));

  if (event < 4) {
    eventLED = gasLED;
    correctKey = 'G';
    alertType = "gas";
    lastEvent = 0;
    BT.println("Gas Leak! Press G");
  }
  else if (event < 8) {
    eventLED = tempLED;
    correctKey = 'T';
    alertType = "temperature";
    lastEvent = 1;
    BT.println("High Temperature! Press T");
  }
  else {
    eventLED = maintLED;
    correctKey = 'M';
    alertType = "maintenance";
    lastEvent = 2;
    BT.println("Maintenance Required! Press M");
  }

  digitalWrite(eventLED, HIGH);

  unsigned long startTime = millis();
  
  // Send event to bridge in correct format: EVT|eventId|alertType|deviceTsMs
  String frameData = "EVT|" + eventId + "|" + alertType + "|" + String(startTime);
  Serial.println(frameData);
  BT.println("FRAME: " + frameData);

  bool answered = false;

  // Dynamic reaction time based on score (Arduino timing)
  unsigned long reactionLimit;
  if (score < 30) {
    reactionLimit = 2500; // Easy
  }
  else if (score < 60) {
    reactionLimit = 1500; // Medium
  }
  else {
    reactionLimit = 500;  // Extreme
  }

  while (millis() - startTime < reactionLimit) {
    // Check for input from both Serial and Bluetooth
    char input = '\0';
    
    if (BT.available()) {
      input = BT.read();
    } else if (Serial.available()) {
      input = Serial.read();
    }

    if (input != '\0' && input != '\n' && input != '\r' && input != ' ') {
      input = toupper(input);
      reactionTime = millis() - startTime;

      if (input == correctKey) {
        score += 10;
        BT.println("Correct +10");
        Serial.println("RESPONSE: Correct +10");
      } else {
        score -= 5;
        BT.println("Wrong -5");
        Serial.println("RESPONSE: Wrong -5");
      }

      answered = true;
      break;
    }
  }

  if (!answered) {
    score -= 5;
    reactionTime = reactionLimit;
    BT.println("Timeout -5");
    Serial.println("RESPONSE: Timeout -5");
  }

  digitalWrite(eventLED, LOW);

  BT.print("Score: ");
  BT.println(score);
  Serial.print("SCORE: ");
  Serial.println(score);

  // Dynamic gap between events (Arduino timing)
  int gap;
  if (score < 30) {
    gap = random(1200, 2500); // Easy mode gap
  }
  else if (score < 60) {
    gap = random(900, 1800);  // Medium mode gap
  }
  else {
    gap = random(600, 1200);  // Extreme mode gap
  }

  delay(gap);
}