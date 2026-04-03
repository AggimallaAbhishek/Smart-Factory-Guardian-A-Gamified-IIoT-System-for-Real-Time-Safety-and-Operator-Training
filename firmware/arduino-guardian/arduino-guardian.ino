#include <SoftwareSerial.h>

SoftwareSerial BT(10, 11); // RX, TX

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

  Serial.println("Factory Game Started");
  BT.println("Factory Game Started");
}

void loop() {

  // Clear old input
  while (BT.available()) {
    BT.read();
  }

  digitalWrite(gasLED, LOW);
  digitalWrite(tempLED, LOW);
  digitalWrite(maintLED, LOW);

  // -------- EVENT SELECTION --------
  int event;

  do {
    event = random(10);
  } while (
    (event < 4 && lastEvent == 0) ||
    (event >= 4 && event < 8 && lastEvent == 1) ||
    (event >= 8 && lastEvent == 2)
  );

  if (event < 4) {
    eventLED = gasLED;
    correctKey = 'G';
    lastEvent = 0;
    BT.println("Gas Leak! Press G");
  }
  else if (event < 8) {
    eventLED = tempLED;
    correctKey = 'T';
    lastEvent = 1;
    BT.println("High Temperature! Press T");
  }
  else {
    eventLED = maintLED;
    correctKey = 'M';
    lastEvent = 2;
    BT.println("Maintenance Required! Press M");
  }

  digitalWrite(eventLED, HIGH);

  unsigned long startTime = millis();
  bool answered = false;

  // 🔥 UPDATED DYNAMIC REACTION TIME
  unsigned long reactionLimit;

  if (score < 30) {
    reactionLimit = 2500; // Easy
  }
  else if (score < 60) {
    reactionLimit = 1500; // Medium (your change ✅)
  }
  else {
    reactionLimit = 500;  // Extreme
  }

  while (millis() - startTime < reactionLimit) {

    if (BT.available()) {
      char input = BT.read();

      if (input == '\n' || input == '\r' || input == ' ') continue;

      input = toupper(input);

      reactionTime = millis() - startTime;

      if (input == correctKey) {
        score += 10;
        BT.println("Correct +10");
      } else {
        score -= 5;
        BT.println("Wrong -5");
      }

      answered = true;
      break;
    }
  }

  if (!answered) {
    score -= 5;
    reactionTime = reactionLimit;
    BT.println("Timeout -5");
  }

  BT.print("Score: ");
  BT.println(score);

  Serial.print("GAME,");
  Serial.print(correctKey);
  Serial.print(",");
  Serial.print(answered);
  Serial.print(",");
  Serial.print(reactionTime);
  Serial.print(",");
  Serial.println(score);

  // 🔥 DYNAMIC GAP
  int gap;

  if (score < 30) {
    gap = random(1200, 1600);
  }
  else if (score < 60) {
    gap = random(900, 1300);
  }
  else {
    gap = random(600, 900);
  }

  delay(gap);
}