from fastapi import APIRouter, HTTPException, Status
from pydantic import BaseModel
from typing import Optional
import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/telemetry", tags=["IoT Telemetry"])

# 1. Pydantic schema matching the ESP32 JSON payload exactly
class TelemetryPayload(BaseModel):
    animal_id: str
    temperature: float
    activity: int
    ambient_temp: Optional[float] = None

# In-memory storage cache for real-time telemetry updates
telemetry_cache = {}

@router.post("", status_code=Status.HTTP_200_OK)
async def receive_telemetry(payload: TelemetryPayload):
    try:
        # Calculate flags based on physiological thresholds
        is_fever = payload.temperature > 39.5
        is_lethargic = payload.activity < 30

        record = {
            "animal_id": payload.animal_id,
            "temperature": payload.temperature,
            "activity": payload.activity,
            "fever_flag": is_fever,
            "lethargy_flag": is_lethargic,
            "received_at": datetime.datetime.utcnow().isoformat() + "Z"
        }

        # Cache the latest telemetry record for this animal
        telemetry_cache[payload.animal_id] = record

        logger.info(f"✅ Telemetry received for {payload.animal_id}: Temp={payload.temperature}°C, Activity={payload.activity}")

        return {
            "status": "success",
            "message": "Telemetry processed successfully",
            "data": record
        }
    except Exception as e:
        logger.error(f"❌ Error processing IoT telemetry: {e}")
        raise HTTPException(status_code=500, detail="Internal server telemetry processing error.")

@router.get("/{animal_id}")
async def get_latest_telemetry(animal_id: str):
    """Retrieves the latest live IoT telemetry reading for a specific animal."""
    if animal_id in telemetry_cache:
        return {"success": True, "telemetry": telemetry_cache[animal_id]}
    
    # Default fallback data if ESP32 has not transmitted yet
    return {
        "success": True,
        "telemetry": {
            "animal_id": animal_id,
            "temperature": 38.5,
            "activity": 45,
            "fever_flag": False,
            "lethargy_flag": False,
            "received_at": datetime.datetime.utcnow().isoformat() + "Z"
        }
    }