from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
import datetime
import logging

logger = logging.getLogger(__name__)

# Define the router matching the path sent by ESP32 (/api/iot/telemetry)
router = APIRouter(prefix="/api/iot", tags=["IoT Telemetry"])

# 1. Pydantic schema matching the ESP32 JSON payload exactly
class TelemetryPayload(BaseModel):
    animal_id: str
    temperature: float
    activity: int
    ambient_temp: Optional[float] = None

class IoTDataRequestPayload(BaseModel):
    animal_id: Optional[str] = "ESP32-COW-01"
    temperature: Optional[float] = None
    activity: Optional[int] = None
    use_simulation: Optional[bool] = False
    simulate_fever: Optional[bool] = False

# In-memory database cache to hold the latest reading for each animal
telemetry_cache = {}

@router.post("/telemetry", status_code=status.HTTP_200_OK)
async def receive_telemetry(payload: TelemetryPayload):
    """
    Receives live IoT telemetry payload from ESP32 hardware node,
    evaluates hyperthermia and lethargy thresholds, and caches the result.
    Compatible with:
      - Sensor 1: Adafruit MLX90614 Contactless IR Body Temperature
      - Sensor 2: Adafruit MPU6050 IMU Accelerometer Activity Index
    """
    try:
        # Evaluate physiological thresholds for livestock
        is_fever = payload.temperature > 39.5
        is_lethargic = payload.activity < 30

        anomalies: List[str] = []
        if is_fever:
            anomalies.append(f"Hyperthermia: {payload.temperature:.2f}°C (Threshold > 39.5°C)")
        if is_lethargic:
            anomalies.append(f"Lethargy: Activity Index {payload.activity}/100 (Threshold < 30)")

        record = {
            "animal_id": payload.animal_id,
            "temperature": round(payload.temperature, 2),
            "activity": payload.activity,
            "activity_index": payload.activity,
            "fever_flag": is_fever,
            "lethargy_flag": is_lethargic,
            "has_anomaly": is_fever or is_lethargic,
            "anomalies": anomalies,
            "hardware": "ESP32 + MLX90614 + MPU6050",
            "ambient_temp": payload.ambient_temp,
            "received_at": datetime.datetime.utcnow().isoformat() + "Z"
        }

        # Cache the latest telemetry record in memory by animal_id
        telemetry_cache[payload.animal_id] = record

        logger.info(
            f"✅ Ingested IoT Telemetry for {payload.animal_id}: "
            f"Temp={payload.temperature}°C, Activity={payload.activity}"
        )

        return {
            "status": "success",
            "message": "Telemetry received and processed successfully",
            "data": record
        }
    except Exception as e:
        logger.error(f"❌ Telemetry processing failure: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error processing IoT telemetry."
        )


@router.get("/telemetry/{animal_id}", status_code=status.HTTP_200_OK)
async def get_latest_telemetry(animal_id: str):
    """
    Retrieves the latest live IoT telemetry reading for a specific animal ID.
    Used by the Next.js frontend (IoTInput & IoTMonitoringView) to stream real-time sensor signals.
    """
    # 1. Exact match in cache
    if animal_id in telemetry_cache:
        return {"success": True, "telemetry": telemetry_cache[animal_id]}

    # 2. Check alternate prefix or suffix matches
    alt_ids = [
        f"ESP32-{animal_id}",
        animal_id.replace("ESP32-", ""),
        "ESP32-COW-01",  # Default hardware node ID from ESP32 C++ firmware
    ]
    for alt in alt_ids:
        if alt in telemetry_cache:
            matched = dict(telemetry_cache[alt])
            matched["queried_id"] = animal_id
            return {"success": True, "telemetry": matched}

    # 3. Return default normal baseline if ESP32 hasn't transmitted yet
    return {
        "success": True,
        "telemetry": {
            "animal_id": animal_id,
            "temperature": 38.5,
            "activity": 45,
            "activity_index": 45,
            "fever_flag": False,
            "lethargy_flag": False,
            "has_anomaly": False,
            "anomalies": [],
            "hardware": "ESP32 + MLX90614 + MPU6050 (Awaiting First Transmit)",
            "received_at": datetime.datetime.utcnow().isoformat() + "Z"
        }
    }


@router.post("/data", status_code=status.HTTP_200_OK)
async def ingest_iot_data_endpoint(payload: IoTDataRequestPayload):
    """
    Authoritative ingestion endpoint used by Next.js backend-client.
    Evaluates temperature & activity, calculates anomalies, updates cache,
    and returns standardized response schema for both real and simulated hardware.
    """
    try:
        from app.services.iot_simulator import generate_simulated_telemetry
        animal_id = payload.animal_id or "ESP32-COW-01"

        if payload.use_simulation or (payload.temperature is None and payload.activity is None):
            sim = generate_simulated_telemetry(animal_id=animal_id, simulate_fever=bool(payload.simulate_fever))
            temp = float(sim["temperature"])
            act = int(sim["activity_index"])
            source_desc = "Virtual ESP32 Simulator"
        else:
            temp = float(payload.temperature) if payload.temperature is not None else 38.5
            act = int(payload.activity) if payload.activity is not None else 50
            source_desc = "ESP32 + MLX90614 + MPU6050"

        is_fever = temp > 39.5
        is_lethargic = act < 30
        anomalies: List[str] = []
        if is_fever:
            anomalies.append(f"Hyperthermia: {temp:.2f}°C (>39.5°C)")
        if is_lethargic:
            anomalies.append(f"Lethargy: Activity {act}/100 (<30)")

        record = {
            "animal_id": animal_id,
            "temperature": round(temp, 2),
            "activity": act,
            "activity_index": act,
            "fever_flag": is_fever,
            "lethargy_flag": is_lethargic,
            "has_anomaly": is_fever or is_lethargic,
            "anomalies": anomalies,
            "hardware": source_desc,
            "received_at": datetime.datetime.utcnow().isoformat() + "Z"
        }
        telemetry_cache[animal_id] = record

        return {
            "animal_id": animal_id,
            "temperature": round(temp, 2),
            "activity_index": act,
            "has_anomaly": record["has_anomaly"],
            "anomalies": anomalies,
            "received_at": record["received_at"],
        }
    except Exception as e:
        logger.error(f"❌ Error in /api/iot/data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process IoT data: {str(e)}"
        )