from fastapi import APIRouter, HTTPException, Status
from pydantic import BaseModel
from typing import Optional
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

# In-memory database cache to hold the latest reading for each animal
telemetry_cache = {}
@router.post("/telemetry", status_code=Status.HTTP_200_OK)
async def receive_telemetry(payload: TelemetryPayload):
    """
    Receives live IoT telemetry payload from ESP32 hardware node,
    evaluates hyperthermia and lethargy thresholds, and caches the result.
    """
    try:
        # Evaluate physiological thresholds for livestock
        is_fever = payload.temperature > 39.5
        is_lethargic = payload.activity < 30

        record = {
            "animal_id": payload.animal_id,
            "temperature": payload.temperature,
            "activity": payload.activity,
            "fever_flag": is_fever,
            "lethargy_flag": is_lethargic,
            "has_anomaly": is_fever or is_lethargic,
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
            status_code=Status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error processing IoT telemetry."
        )


@router.get("/telemetry/{animal_id}", status_code=Status.HTTP_200_OK)
async def get_latest_telemetry(animal_id: str):
    """
    Retrieves the latest live IoT telemetry reading for a specific animal ID.
    Used by the Next.js frontend (IoTAnalysisCard) to show real-time sensor signals.
    """
    if animal_id in telemetry_cache:
        return {"success": True, "telemetry": telemetry_cache[animal_id]}
    
    # Return default normal baseline if ESP32 hasn't transmitted yet
    return {
        "success": True,
        "telemetry": {
            "animal_id": animal_id,
            "temperature": 38.5,
            "activity": 45,
            "fever_flag": False,
            "lethargy_flag": False,
            "has_anomaly": False,
            "received_at": datetime.datetime.utcnow().isoformat() + "Z"
        }
    }