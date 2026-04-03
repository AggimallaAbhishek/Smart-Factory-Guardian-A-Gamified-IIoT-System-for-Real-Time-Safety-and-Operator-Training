# 🔧 **Arduino Hardware Integration Guide**

## **Complete Step-by-Step Setup**

### **Step 1: Hardware Wiring** 🔌
```
Arduino Pin Layout:
┌─────────────────┐
│     Pin 2 ──────┼── 220Ω ──── Red LED ──── GND    (Gas Alert)
│     Pin 3 ──────┼── 220Ω ──── Orange LED ── GND   (Temperature Alert)  
│     Pin 4 ──────┼── 220Ω ──── Blue LED ─── GND    (Maintenance Alert)
│                 │
│ Optional Bluetooth Module (HC-05):
│     5V ─────────┼── HC-05 VCC
│     GND ────────┼── HC-05 GND
│     Pin 10 ─────┼── HC-05 TX
│     Pin 11 ─────┼── HC-05 RX
└─────────────────┘
```

**Required Components:**
- Arduino Uno/Nano (or compatible)
- 3x LEDs (Red, Orange/Yellow, Blue)
- 3x 220Ω resistors
- Jumper wires & breadboard
- USB cable for connection
- HC-05 Bluetooth module (optional)

---

### **Step 2: Arduino Software Setup** 💻

1. **Install Arduino IDE**: https://www.arduino.cc/en/software

2. **Upload Firmware**:
   - Connect Arduino via USB
   - Open `firmware/arduino-guardian/arduino-guardian.ino`
   - Select correct board and port in Tools menu
   - Click Upload (→) button

3. **Test Arduino**:
   - Open Serial Monitor (Tools → Serial Monitor)
   - Set baud rate to 9600
   - Should see: `"Factory Guardian Hardware Started"`
   - LEDs should blink with events like: `EVT|EVT1234|gas|1672531200`

---

### **Step 3: Find Arduino Port** 🔍

**macOS/Linux:**
```bash
ls /dev/tty.*
# Look for: /dev/tty.usbmodem* or /dev/tty.usbserial*
```

**Windows:**
- Open Device Manager → Ports (COM & LPT)
- Look for: COM3, COM4, COM5, etc.

**Example Ports:**
- macOS: `/dev/tty.usbmodem141301`
- Linux: `/dev/ttyUSB0` or `/dev/ttyACM0`
- Windows: `COM3`, `COM4`, `COM5`

---

### **Step 4: Start Arduino Bridge Service** 🌉

**Method 1: Using the Helper Script (Recommended)**
```bash
# Make script executable
chmod +x start-arduino-bridge.sh

# Start bridge with your Arduino port
./start-arduino-bridge.sh /dev/tty.usbmodem141301    # macOS example
./start-arduino-bridge.sh COM3                       # Windows example
```

**Method 2: Manual Environment Setup**
```bash
# Export environment variables
export BRIDGE_PORT=8787
export BRIDGE_TOKEN=arduino-bridge  
export BRIDGE_ALLOW_ORIGINS=http://127.0.0.1:5173
export BRIDGE_SOURCE=serial
export BRIDGE_SERIAL_PATH=/dev/tty.usbmodem141301  # Your Arduino port
export BRIDGE_SERIAL_BAUD_RATE=9600

# Start bridge service
npm --workspace @guardian/bridge run dev
```

**Success Output:**
```json
{"level":"info","message":"Bridge server started","port":8787}
{"level":"info","message":"Auto-connecting to Arduino","serialPath":"/dev/tty.usbmodem141301"}
{"level":"info","message":"Arduino auto-connection successful"}
{"level":"info","message":"Bridge boot complete","websocketUrl":"ws://127.0.0.1:8787/ws?token=arduino-bridge"}
```

---

### **Step 5: Start Game with Arduino** 🎮

1. **Start Web Application**:
   ```bash
   npm run dev:web
   ```

2. **Open Game**: http://127.0.0.1:5173

3. **Create/Join Room** as normal

4. **Switch to Arduino Mode**:
   - In the host's Hardware Panel
   - Click "Arduino" tab instead of "Mock"  
   - Click "Start Arduino" button

5. **Success Indicators**:
   - Status shows "Bridge connected"  
   - Arduino LEDs start blinking
   - Game responds to hardware events

---

### **Step 6: Arduino Protocol** 📡

**Arduino Sends (to Bridge):**
```
EVT|EVT1234|gas|1672531200          # Gas event at timestamp
EVT|EVT5678|temperature|1672531205  # Temperature event  
EVT|EVT9012|maintenance|1672531210  # Maintenance event
```

**Event Flow:**
1. Arduino detects/generates event
2. LED lights up on Arduino
3. Arduino sends EVT frame to bridge
4. Bridge forwards to web game
5. Game shows alert to players
6. Players click response buttons
7. Correct response: +10 points
8. Wrong/timeout response: -5 points

---

### **Step 7: Troubleshooting** 🚨

#### **Bridge Connection Issues:**
```bash
# Check if Arduino port exists
ls /dev/tty.usbmodem*  # macOS
ls /dev/ttyUSB*        # Linux  

# Test direct Arduino connection
screen /dev/tty.usbmodem141301 9600  # Should see EVT frames
# Press Ctrl+A then K to exit screen

# Check bridge service logs
# Look for "Arduino auto-connection successful"
```

#### **Common Issues:**

**1. Port Access Denied (Linux/macOS):**
```bash
sudo chmod 666 /dev/ttyUSB0  # Grant access
# OR add user to dialout group:
sudo usermod -a -G dialout $USER
```

**2. Arduino Not Detected:**
- Check USB cable (some are power-only)
- Try different USB port
- Press reset button on Arduino
- Check Device Manager (Windows)

**3. Bridge Connection Fails:**
- Ensure Arduino is programmed correctly
- Check Serial Monitor shows EVT frames
- Verify port path is exact
- Try different baud rate (9600 is standard)

**4. Game Doesn't Receive Events:**
- Check bridge WebSocket URL in browser dev tools
- Verify port 8787 is not blocked by firewall
- Ensure web app is running on http://127.0.0.1:5173

#### **Testing Commands:**
```bash
# Test bridge without Arduino
npm run dev:bridge:test

# List serial ports
node -e "const { SerialPort } = require('serialport'); SerialPort.list().then(console.log);"

# Manual WebSocket test
# Open browser dev console and test:
# ws = new WebSocket('ws://127.0.0.1:8787/ws?token=arduino-bridge')
```

---

### **Step 8: Hardware Behavior** ⚡

**Arduino Timing (matches game exactly):**
- **Gas**: 40% probability, Pin 2, Red LED
- **Temperature**: 40% probability, Pin 3, Orange LED  
- **Maintenance**: 20% probability, Pin 4, Blue LED
- **Alert Duration**: Until response or timeout
- **Gap Between Events**: 1.2-2.5 seconds
- **Response Timeout**: 2.5 seconds
- **Prevents consecutive same alerts**

**Scoring System:**
- ✅ **Correct Response**: +10 points
- ❌ **Wrong Response**: -5 points  
- ⏰ **Timeout (No Response)**: -5 points

**Physical Arduino Feedback:**
- LEDs light up when alerts are active
- Bluetooth messages for debugging (if HC-05 connected)
- Serial output for bridge communication

---

## **🚀 Quick Start Summary**

```bash
# 1. Wire Arduino (3 LEDs on pins 2,3,4)
# 2. Upload firmware from firmware/arduino-guardian/arduino-guardian.ino
# 3. Find Arduino port: ls /dev/tty.*
# 4. Start bridge: ./start-arduino-bridge.sh /dev/tty.usbmodem141301
# 5. Start game: npm run dev:web  
# 6. Go to http://127.0.0.1:5173
# 7. Create room, switch to "Arduino" mode, click "Start Arduino"
# 8. LEDs should blink and respond to player actions!
```

**Bridge Service URL**: `ws://127.0.0.1:8787/ws?token=arduino-bridge`  
**Game URL**: `http://127.0.0.1:5173`

---

**🎯 Success**: Arduino LEDs blink → Players respond → Scores update → Turn transitions work with real hardware!