# ESP32 Integration Guide

This document outlines how to integrate ESP32 + GNSS hardware modules with the BUS TRACK application.

## Overview

The ESP32 is responsible for reading GPS coordinates (latitude, longitude, speed, heading) from the GNSS module and pushing this data to the Firebase Realtime Database every second while the bus is in operation.

## Firebase Realtime Database Endpoint

The ESP32 must make an HTTP POST or PUT request to the Firebase REST API.

**Base URL:**
`https://<YOUR_FIREBASE_PROJECT_ID>-default-rtdb.firebaseio.com`

**Endpoint Path:**
`/buses/<VEHICLE_ID>/location.json`

*(Replace `<VEHICLE_ID>` with the actual document ID of the vehicle from Firestore)*

## Authentication

The Firebase Realtime Database requires authentication. The ESP32 should use a Service Account JWT or a Database Secret (if using legacy authentication, though JWT via OAuth2 is recommended).

Alternatively, you can append `?auth=<TOKEN>` to the REST URL.

`https://<YOUR_FIREBASE_PROJECT_ID>-default-rtdb.firebaseio.com/buses/<VEHICLE_ID>/location.json?auth=<YOUR_AUTH_TOKEN>`

## JSON Payload Format

The ESP32 must send a JSON payload with exactly the following structure. Do not use arrays, use a JSON object.

```json
{
  "lat": 12.971598,
  "lng": 77.594562,
  "speed": 45.2,
  "heading": 120,
  "timestamp": 1716382912000
}
```

### Field Definitions

- `lat` (number): Latitude in decimal degrees
- `lng` (number): Longitude in decimal degrees
- `speed` (number): Current speed in km/h
- `heading` (number): Direction of travel in degrees (0-359, where 0 is North)
- `timestamp` (number): Unix epoch timestamp in milliseconds

## Example HTTP Request (C++)

Using the standard `HTTPClient.h` library in Arduino IDE / ESP-IDF:

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* firebaseURL = "https://your-project.firebaseio.com/buses/VEHICLE_123/location.json?auth=YOUR_TOKEN";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(firebaseURL);
    http.addHeader("Content-Type", "application/json");

    // Construct JSON payload
    StaticJsonDocument<200> doc;
    doc["lat"] = 12.971598; // Replace with actual GNSS data
    doc["lng"] = 77.594562;
    doc["speed"] = 45.2;
    doc["heading"] = 120;
    doc["timestamp"] = millis(); // Ideally use NTP time

    String requestBody;
    serializeJson(doc, requestBody);

    int httpResponseCode = http.PUT(requestBody); // Use PUT to overwrite the 'location' node
    Serial.print("HTTP Response code: ");
    Serial.println(httpResponseCode);
    
    http.end();
  }
  
  delay(1000); // Send every 1 second
}
```

## Important Notes

1. **Use PUT, not POST:** Use the HTTP `PUT` method to completely replace the data at `/buses/<VEHICLE_ID>/location`. If you use `POST`, Firebase will generate a new unique ID under `location`, which will break the web app's real-time listener.
2. **Frequency:** Sending data every 1 second provides smooth tracking but consumes more data. You can optimize by sending every 2-3 seconds if bandwidth or power is constrained.
3. **Data Types:** Ensure `lat` and `lng` are floating-point numbers (doubles), not strings.
