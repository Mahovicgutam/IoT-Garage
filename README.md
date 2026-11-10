# Environmental Sensor Characterization & Telemetry (ESP32 & MQTT)

## Project Overview
This project focuses on the characterization, error analysis, and data transmission of MQ-7 (Gas) and DHT22 (Temperature/Humidity) sensors. Instead of merely logging data, the objective is to evaluate sensor drift, apply noise reduction, and ensure reliable telemetry via Mosquitto MQTT broker.

## Metrology & Calibration Focus
* **Sensor Drift Analysis:** Evaluated the baseline drift of the MQ-7 sensor across different temperature profiles.
* **Noise Filtering:** Implemented basic data smoothing in the ESP32 firmware to filter out transient measurement spikes before MQTT transmission.
* **Error Margin Evaluation:** Compared DHT22 temperature readings against a reliable baseline to determine measurement deviation.

## Tech Stack
* **Hardware:** ESP32, DHT22, MQ-7, HC-SR04
* **Telemetry:** Mosquitto MQTT
* **Interface:** React/JSX Dashboard
