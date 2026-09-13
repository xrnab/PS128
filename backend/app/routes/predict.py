from fastapi import APIRouter, File, Form, HTTPException, UploadFile
import logging
from app.services.vision_service import vision_engine

logger = logging.getLogger(__name__)
router = APIRouter(tags=["AI Assessment"])

@router.post("/predict")
async def predict_disease(
    file: UploadFile = File(...),
    category: str = Form(..., description="Animal category: 'pet' or 'cow'"),
):
    # Verify file is an image
    is_image = (
        (file.content_type and (file.content_type.startswith("image/") or file.content_type == "application/octet-stream"))
        or (file.filename and file.filename.lower().endswith((".jpg", ".jpeg", ".png", ".webp")))
    )
    if not is_image:
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    try:
        image_bytes = await file.read()
        if not image_bytes or len(image_bytes) == 0:
            raise HTTPException(status_code=400, detail="Uploaded image file is empty.")

        # Run Prediction (Tier 1 & Tier 2)
        prediction = vision_engine.predict(image_bytes, animal_type=category)
        
        # Pass directly to frontend so the UI badge updates to "Rejected"
        return {
            "success": True,
            "yolo_result": prediction,
            "primary_prediction": prediction.get("primary_prediction"),
            "confidence": prediction.get("confidence", 0),
            "visual_anomaly_detected": prediction.get("visual_anomaly_detected", False),
            "message": prediction.get("message"),
        }

    except Exception as e:
        logger.exception(f"Inference error during /api/predict: {e}")
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")