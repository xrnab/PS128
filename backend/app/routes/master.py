from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from app.services.master_service import master_engine

router = APIRouter()

class MasterAnalysisRequest(BaseModel):
    latitude: Optional[float] = Field(default=28.6139, example=28.6139)
    longitude: Optional[float] = Field(default=77.2090, example=77.2090)
    language: str = Field(default="English", description="Language requested for the farmer advisory")
    health_report: Dict[str, Any] = Field(
        default={
            "animal": "Cow",
            "symptoms": ["Fever", "Nasal Discharge", "Labored Breathing", "Coughing"],
            "duration_days": 3,
            "affected_count": 2,
            "herd_size": 10,
            "mortality_count": 0
        }
    )
    iot_telemetry: Optional[Dict[str, Any]] = Field(
        default={
            "animal_id": "ESP32-COW-01",
            "temperature": 40.1,
            "activity": 22
        }
    )
    yolo_vision_analysis: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional YOLO result from POST /api/predict"
    )
    historical_weekly_cases: Optional[List[int]] = Field(
        default=[12, 14, 11, 15, 13, 48]
    )

@router.post("/analyze", tags=["Master Analysis Engine"])
def analyze_livestock_health_endpoint(payload: MasterAnalysisRequest):
    try:
        data_dict = payload.model_dump()
        result = master_engine.analyze_livestock_health(data_dict)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
