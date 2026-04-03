#!/bin/bash

# Smart Factory Guardian - Arduino Bridge Launcher
# This script helps you connect your Arduino hardware to the game

echo "🔧 Smart Factory Guardian - Arduino Bridge Setup"
echo "=================================================="

# Check if port is provided
ARDUINO_PORT=$1
if [ -z "$ARDUINO_PORT" ]; then
    echo ""
    echo "❌ Please provide Arduino port as argument"
    echo ""
    echo "Usage: ./start-arduino-bridge.sh [PORT]"
    echo ""
    echo "📍 Find your Arduino port:"
    echo ""
    echo "  macOS/Linux:"
    echo "    ls /dev/tty.*"
    echo "    # Look for: /dev/tty.usbmodem* or /dev/tty.usbserial*"
    echo ""
    echo "  Windows:"
    echo "    # Check Device Manager → Ports (COM & LPT)"
    echo "    # Look for: COM3, COM4, COM5, etc."
    echo ""
    echo "Example:"
    echo "  ./start-arduino-bridge.sh /dev/tty.usbmodem101"
    echo "  ./start-arduino-bridge.sh COM3"
    echo ""
    
    # Try to detect ports automatically
    echo "🔍 Detected serial ports:"
    if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" == "linux"* ]]; then
        ls /dev/tty.* 2>/dev/null | grep -E "(usbmodem|usbserial|arduino)" || echo "  No Arduino-like ports found"
    fi
    echo ""
    exit 1
fi

echo "🔌 Arduino Port: $ARDUINO_PORT"
echo "🌐 WebSocket URL: ws://127.0.0.1:8787/ws?token=arduino-bridge"
echo "🎮 Game URL: http://127.0.0.1:5173"
echo ""

# Check if the port exists
if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" == "linux"* ]]; then
    if [ ! -e "$ARDUINO_PORT" ]; then
        echo "❌ Port $ARDUINO_PORT does not exist!"
        echo "Make sure your Arduino is connected and the port is correct."
        exit 1
    fi
fi

echo "🚀 Starting Arduino Bridge Service..."
echo "Press Ctrl+C to stop"
echo ""

# Set environment variables and start the bridge
export BRIDGE_PORT=8787
export BRIDGE_TOKEN=arduino-bridge
export BRIDGE_ALLOW_ORIGINS=http://127.0.0.1:5173
export BRIDGE_SOURCE=serial
export BRIDGE_SERIAL_PATH=$ARDUINO_PORT
export BRIDGE_SERIAL_BAUD_RATE=9600

npm --workspace @guardian/bridge run dev