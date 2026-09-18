import numpy as np
import logging
from app.services.ml_service import predictor
from app.services.weather_service import fetch_weather_risk
from app.services.iot_simulator import generate_simulated_telemetry
from app.services.vision_service import vision_engine
from app.services.advisory_service import generate_farmer_advisory

logger = logging.getLogger(__name__)

class MasterAnalysisEngine:
    def analyze_livestock_health(self, payload: dict) -> dict:
        health_report = payload.get("health_report", {})
        species = health_report.get("animal", "Cow")

        # STEP 1: Use the uploaded-image result when the frontend already ran YOLO.
        vision_res = payload.get("yolo_vision_analysis")
        if vision_res is None:
            image_input = payload.get("image_data") or payload.get("image_url")
            vision_res = vision_engine.predict_image_lesions(
                image_input,
                animal_type=species if isinstance(species, str) else "Cow",
            )

        # STEP 2: Weather Service (Open-Meteo)
        lat = payload.get("latitude", 28.6139)
        lon = payload.get("longitude", 77.2090)
        weather_res = fetch_weather_risk(latitude=lat, longitude=lon)

        # STEP 3: IoT Sensor Telemetry
        iot_input = payload.get("iot_telemetry", {})
        animal_id = iot_input.get("animal_id", "ESP32-SIM-01") if iot_input else "ESP32-SIM-01"
        
        try:
            if iot_input and "temperature" in iot_input and iot_input["temperature"] is not None:
                iot_temp = float(iot_input["temperature"])
                raw_act = iot_input.get("activity")
                iot_act = int(raw_act) if raw_act is not None else 50
            else:
                simulated = generate_simulated_telemetry(
                    animal_id=animal_id, 
                    simulate_fever=iot_input.get("simulate_fever", False) if iot_input else False
                )
                iot_temp = simulated["temperature"]
                iot_act = simulated["activity_index"]
        except (ValueError, TypeError):
            simulated = generate_simulated_telemetry(animal_id=animal_id)
            iot_temp = simulated["temperature"]
            iot_act = simulated["activity_index"]

        iot_anomalies = []
        if iot_temp > 39.5:
            iot_anomalies.append(f"Hyperthermia: {iot_temp}°C")
        if iot_act < 30:
            iot_anomalies.append(f"Lethargy: Activity index {iot_act}")

        # STEP 4: Machine Learning Model Inference
        symptoms = health_report.get("symptoms", ["Fever"])
        raw_heart_rate = health_report.get("heart_rate")
        raw_affected = health_report.get("affected_count")
        raw_herd = health_report.get("herd_size")
        raw_mortality = health_report.get("mortality_count")
        
        try:
            heart_rate_val = float(raw_heart_rate) if raw_heart_rate is not None else 85.0
            affected_val = int(raw_affected) if raw_affected is not None else 1
            herd_val = int(raw_herd) if raw_herd is not None else 10
            mortality_val = int(raw_mortality) if raw_mortality is not None else 0
        except (ValueError, TypeError):
            heart_rate_val = 85.0
            affected_val = 1
            herd_val = 10
            mortality_val = 0

        ml_res = predictor.predict(
            symptoms=symptoms,
            animal_type=species if isinstance(species, str) else "Cow",
            body_temp=iot_temp,
            heart_rate=heart_rate_val,
            affected_count=affected_val,
            herd_size=herd_val,
            mortality_count=mortality_val
        )

        ml_confidence = float(ml_res.get("confidence", 0) or 0)
        if ml_confidence < 0.30:
            ml_res["suspected_condition"] = "No strong disease signal"

        # STEP 5: Outbreak Surge & Historical Analytics
        history = payload.get("historical_weekly_cases")
        if not history or not isinstance(history, list) or len(history) == 0:
            history = [10, 12, 11, 13, 12, 14]
            
        mean_val = float(np.mean(history[:-1])) if len(history) > 1 else float(history[0])
        std_val = float(np.std(history[:-1])) if len(history) > 1 and np.std(history[:-1]) > 0 else 1.0
        latest_cases = history[-1]
        z_score = round((latest_cases - mean_val) / std_val, 2)
        is_spike = z_score > 2.5

        # STEP 6: Multi-Stream Risk Aggregation
        risk_score = 15
        if ml_confidence > 0.20:
            risk_score += 20
        has_vision_anomaly = False
        if vision_res:
            if vision_res.get("visual_anomaly_detected"):
                has_vision_anomaly = True
            else:
                pred = vision_res.get("primary_prediction") or vision_res.get("condition") or vision_res.get("disease")
                if not pred and vision_res.get("detected_classes"):
                    classes = vision_res.get("detected_classes")
                    if isinstance(classes, list) and len(classes) > 0:
                        pred = classes[0]
                if pred and str(pred).strip().lower() not in ["healthy", "none", "rejected: unrecognized image", "no disease detected"]:
                    has_vision_anomaly = True
        if has_vision_anomaly:
            risk_score += 25  # Increased risk for confirmed visual lesions
        if len(iot_anomalies) > 0:
            risk_score += 25
        if weather_res.get("vector_breeding_risk") == "HIGH":
            risk_score += 10
        if is_spike:
            risk_score += 10

        risk_score = min(risk_score, 100)
        risk_level = "CRITICAL" if risk_score >= 75 else "ELEVATED" if risk_score >= 45 else "LOW"

        # Combine all streams into a unified object
        analysis_summary = {
            "health_report": health_report,
            "overall_risk_score": risk_score,
            "overall_risk_level": risk_level,
            "disease_prediction": ml_res,
            "yolo_vision_analysis": vision_res,  # Will be null/None if skipped
            "iot_telemetry_analysis": {
                "animal_id": animal_id,
                "temperature": iot_temp,
                "activity_index": iot_act,
                "has_anomaly": len(iot_anomalies) > 0,
                "anomalies": iot_anomalies
            },
            "weather_analysis": weather_res,
            "outbreak_surge_analysis": {
                "latest_cases": latest_cases,
                "historical_mean": round(mean_val, 2),
                "z_score": z_score,
                "is_outbreak_spike": is_spike
            }
        }

        # STEP 7: Automatic GenAI Ingestion
        requested_language = payload.get("language", "English")
        preferred_lang = {
            "en": "English",
            "bn": "Bengali",
            "hi": "Hindi",
            "mr": "Marathi",
        }.get(str(requested_language).lower(), requested_language)
        advisory_res = generate_farmer_advisory(analysis_summary, language=preferred_lang)
        analysis_summary["farmer_advisory"] = advisory_res

        return analysis_summary

master_engine = MasterAnalysisEngine()
