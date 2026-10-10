// #include <WiFi.h>
// #include <HTTPClient.h>
//add this new line that dont have any impact in the code 
// const char* ssid = "Chirabrata";
// const char* password = "chirabrata";
// const char* serverUrl = "https://ps128-livestock-api.onrender.com/api/analyze";

// void setup() {
//   Serial.begin(115200);
//   delay(500);

//   WiFi.begin(ssid, password);
//   Serial.print("Connecting to Wi-Fi");

//   while (WiFi.status() != WL_CONNECTED) {
//     delay(500);
//     Serial.print(".");
//   }

//   Serial.println();
//   Serial.println("Wi-Fi connected");
//   Serial.print("ESP32 IP: ");
//   Serial.println(WiFi.localIP());

//   randomSeed(micros());
// }

// void loop() {
//   if (WiFi.status() != WL_CONNECTED) {
//     Serial.println("Wi-Fi disconnected. Reconnecting...");
//     WiFi.reconnect();
//     delay(5000);
//     return;
//   }

//   float temperature = 38.5 + (random(0, 20) / 10.0);
//   int activity = random(20, 80);

//   String payload = "{";
//   payload += "\"health_report\":{";
//   payload += "\"animal\":\"Cow\",\"symptoms\":[\"Fever\"]";
//   payload += "},";
//   payload += "\"iot_telemetry\":{";
//   payload += "\"animal_id\":\"ESP32-01\",";
//   payload += "\"temperature\":" + String(temperature, 1) + ",";
//   payload += "\"activity\":" + String(activity);
//   payload += "}";
//   payload += "}";

//   HTTPClient http;
//   http.begin(serverUrl);
//   http.addHeader("Content-Type", "application/json");

//   Serial.println("Sending payload:");
//   Serial.println(payload);

//   int httpCode = http.POST(payload);
//   Serial.print("Response code: ");
//   Serial.println(httpCode);

//   if (httpCode > 0) {
//     Serial.println("Response body:");
//     Serial.println(http.getString());
//   } else {
//     Serial.print("Request failed: ");
//     Serial.println(http.errorToString(httpCode));
//   }

//   http.end();
//   delay(15000);
// }
