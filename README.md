# 🏠 Smart TTG Dashboard: IoT Gas Leak Detection & Control System

Real-time monitoring and control dashboard for Carbon Monoxide (CO) leak detection, designed for enclosed environments (TTG). This project integrates environmental data acquisition, cloud telemetry, and remote actuator control.

## ⚙️ System Architecture

The system is built on a standard IoT/Process Control architecture:
1. **Data Acquisition (Edge):** ESP32 reading analog/digital signals from MQ-7 (CO gas) and DHT22 (Temperature/Humidity).
2. **Telemetry (Transport):** Lightweight messaging via EMQX Cloud Broker using MQTT over WebSocket.
3. **Supervisory Control (Interface):** Vanilla JS web dashboard for real-time visualization, dynamic alarm setpoint configuration, and manual actuator override.

## ✨ Core Engineering Features
* **Real-time DAQ & Visualization:** Live telemetry data plotted dynamically using Chart.js.
* **Dynamic Setpoint Control:** Users can adjust the CO ppm alarm threshold directly from the dashboard, which publishes the new parameter back to the ESP32.
* **Remote Actuation:** Bi-directional MQTT communication allows manual ON/OFF overrides for the exhaust fan and safety buzzer.
* **Resilient Connection:** Implemented exponential backoff auto-reconnect for MQTT to handle intermittent network drops.

## 📡 MQTT Topic Structure

| Topic | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `ttg_dapur/sensor/mq7` | Device → Web | `number` | CO gas level (ppm) |
| `ttg_dapur/sensor/temp` | Device → Web | `number` | Temperature (°C) |
| `ttg_dapur/status/fan` | Device → Web | `ON/OFF` | Actuator feedback status |
| `ttg_dapur/control/fan` | Web → Device | `ON/OFF` | Remote control command |
| `ttg_dapur/setpoint/mq7`| Web → Device | `number` | Dynamic alarm threshold |

## 🔧 System Workflow

```text
┌───────────┐    Telemetry (Publish)     ┌──────────────┐
│   ESP32   │ ─────────────────────────► │ EMQX Broker  │
│ (Sensors) │                            │   (Cloud)    │
└───────────┘                            └──────┬───────┘
                                                │ WebSocket
                                         ┌──────▼───────┐
                                         │  Dashboard   │
                                         │ (Monitoring  │
                                         │  & Control)  │
                                         └──────┬───────┘
                                                │ Command (Publish)
┌───────────┐                            ┌──────▼───────┐
│   ESP32   │ ◄───────────────────────── │ EMQX Broker  │
│(Actuators)│                            │   (Cloud)    │
└───────────┘                            └──────────────┘
