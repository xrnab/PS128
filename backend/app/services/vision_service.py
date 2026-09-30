import io
import gc
import logging
import base64
from pathlib import Path
from PIL import Image
import torch
from ultralytics import YOLO

logger = logging.getLogger(__name__)

# Force single-threaded PyTorch execution across the process
torch.set_num_threads(1)

LABEL_MAP = {
    "lumpy": "Lumpy Skin Disease",
    "foot-and-mouth": "Foot and Mouth Disease",
    "healthy": "Healthy",
}

CATTLE_MODEL_LABELS = {"foot-and-mouth", "healthy", "lumpy"}

PET_DISEASE_MAP = {
    "Dermatitis": {
        "severity": "MODERATE",
        "description": "Inflammation of the skin, causing redness, itchiness, and irritation.",
        "contagious": False,
    },
    "Fungal_infections": {
        "severity": "MODERATE",
        "description": "Fungal growth causing skin irritation, hair loss, and scaly patches.",
        "contagious": True,
    },
    "Healthy": {
        "severity": "LOW",
        "description": "Skin and coat appear healthy with no visible lesions or parasites.",
        "contagious": False,
    },
    "Hypersensitivity": {
        "severity": "MODERATE",
        "description": "Allergic reaction leading to localized swelling, redness, or hives.",
        "contagious": False,
    },
    "demodicosis": {
        "severity": "HIGH",
        "description": "Mite infestation causing localized or generalized hair loss and skin scaling.",
        "contagious": False,
    },
    "ringworm": {
        "severity": "HIGH",
        "description": "Highly contagious fungal skin infection causing circular lesions and hair loss.",
        "contagious": True,
    },
}

COW_DISEASE_MAP = {
    "foot-and-mouth": {
        "severity": "CRITICAL",
        "description": "Highly contagious viral disease causing fever, blisters, and lesions on the feet and mouth.",
        "contagious": True,
    },
    "healthy": {
        "severity": "LOW",
        "description": "Skin and coat appear healthy with no visible lesions or systemic anomalies.",
        "contagious": False,
    },
    "lumpy": {
        "severity": "HIGH",
        "description": "Lumpy Skin Disease (LSD) characterized by fever and prominent cutaneous nodules across the body.",
        "contagious": True,
    },
}


def format_label(label: str) -> str:
    return LABEL_MAP.get(label.lower(), label)


def pet_metadata(label: str) -> dict:
    normalized_label = str(label).strip().lower()
    return next(
        (metadata for name, metadata in PET_DISEASE_MAP.items() if name.lower() == normalized_label),
        {},
    )


def disease_metadata(label: str, animal_lower: str) -> dict:
    if animal_lower in ["pet", "dog", "cat"]:
        return pet_metadata(label)
    if animal_lower in ["cow", "cattle", "livestock"]:
        return COW_DISEASE_MAP.get(str(label).strip().lower(), {})
    return {}


class VisionService:
    def __init__(self, models_dir: str | Path | None = None):
        if models_dir is None:
            self.models_dir = Path(__file__).resolve().parents[1] / "ml_artifacts"
        else:
            self.models_dir = Path(models_dir)

        self._active_disease_model = None
        self._active_model_type = None
        self._coco_model = None

    @property
    def coco_model(self) -> YOLO:
        if self._coco_model is None:
            coco_path = self.models_dir / "yolov8n.pt"
            if not coco_path.exists():
                coco_path = Path(__file__).resolve().parents[2] / "yolov8n.pt"
            if coco_path.exists():
                self._coco_model = YOLO(str(coco_path))
            else:
                self._coco_model = YOLO("yolov8n.pt")
        return self._coco_model

    def get_disease_model(self, animal_lower: str) -> YOLO:
        target_type = "pet" if animal_lower in ["pet", "dog", "cat"] else "cow"
        
        # Avoid holding multiple heavy models in RAM at once on 512MB RAM free tier
        if self._active_model_type != target_type:
            self._active_disease_model = None
            gc.collect()
            
            if target_type == "pet":
                model_path = self.models_dir / "model_pet.pt"
            else:
                model_path = self.models_dir / "model_cow.pt"
                
            if not model_path.exists():
                raise FileNotFoundError(f"YOLO model file not found at: {model_path}")
                
            self._active_disease_model = YOLO(str(model_path))
            self._active_model_type = target_type
            
        return self._active_disease_model

    def predict_image_lesions(
        self,
        image_input: str | bytes | None,
        animal_type: str = "cow",
    ) -> dict | None:
        if not image_input:
            return None

        if isinstance(image_input, bytes):
            image_bytes = image_input
        elif isinstance(image_input, str):
            encoded_image = image_input.split(",", 1)[-1]
            try:
                image_bytes = base64.b64decode(encoded_image)
            except (ValueError, base64.binascii.Error) as exc:
                raise ValueError("image_data must be valid base64 image data") from exc
        else:
            raise ValueError("image_data must be base64 image data or bytes")

        prediction = self.predict(image_bytes, animal_type=animal_type)
        
        prediction["visual_anomaly_detected"] = (
            prediction.get("primary_prediction") != "Healthy"
            and prediction.get("primary_prediction") != "No disease detected"
            and not str(prediction.get("primary_prediction", "")).startswith("Rejected")
        )
            
        return prediction

    def predict(self, image_bytes: bytes, animal_type: str = "cow") -> dict:
        torch.set_num_threads(1)

        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        # Resize to max 640x640 to keep inference memory under 200MB
        if image.width > 640 or image.height > 640:
            image.thumbnail((640, 640), Image.Resampling.LANCZOS)

        try:
            with torch.inference_mode():
                # Tier 1 COCO pre-filter
                detected_coco_classes = []
                try:
                    coco_results = self.coco_model(image, imgsz=224, verbose=False)[0]
                    if coco_results.boxes:
                        detected_coco_classes = [
                            coco_results.names[int(box.cls[0])] for box in coco_results.boxes
                        ]
                except Exception as coco_err:
                    logger.warning(f"Tier 1 COCO pre-filter warning: {coco_err}")

                animal_lower = str(animal_type).strip().lower()
                is_pet_request = animal_lower in ["pet", "dog", "cat"]
                
                coco_animal_classes = {
                    "bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe"
                }
                livestock_allowed_classes = {"cow", "sheep", "horse"}
                pet_allowed_classes = {"dog", "cat"}

                if "person" in detected_coco_classes:
                    return {
                        "success": True,
                        "primary_prediction": "Rejected: Person",
                        "confidence": 0.0,
                        "visual_anomaly_detected": False,
                        "message": "Invalid photo. Person detected."
                    }

                detected_non_animals = [cls for cls in detected_coco_classes if cls not in coco_animal_classes]
                if detected_non_animals:
                    reason = detected_non_animals[0].replace("_", " ").title()
                    return {
                        "success": True,
                        "primary_prediction": f"Rejected: {reason}",
                        "confidence": 0.0,
                        "visual_anomaly_detected": False,
                        "message": f"Invalid photo. {reason} detected."
                    }

                # Tier 2 Custom Disease Classification
                model = self.get_disease_model(animal_lower)
                results = model(image, imgsz=224, verbose=False)
                result = results[0]

                if hasattr(result, "probs") and result.probs is not None:
                    top_idx = int(result.probs.top1)
                    top_conf = float(result.probs.top1conf)
                    class_name = format_label(result.names[top_idx])

                    if top_conf < 0.50:
                        return {
                            "success": True,
                            "primary_prediction": "Rejected: Unrecognized Image",
                            "confidence": round(top_conf * 100, 2),
                            "visual_anomaly_detected": False,
                            "message": "No clear animal lesion patterns recognized. Please try again."
                        }

                    top_predictions = []
                    if hasattr(result.probs, "top5") and hasattr(result.probs, "top5conf"):
                        for idx, conf in zip(result.probs.top5, result.probs.top5conf):
                            top_predictions.append({
                                "condition": format_label(result.names[int(idx)]),
                                "confidence": round(float(conf) * 100, 2)
                            })

                    return {
                        "success": True,
                        "primary_prediction": class_name,
                        "confidence": round(top_conf * 100, 2),
                        **disease_metadata(result.names[top_idx], animal_lower),
                        "top_predictions": top_predictions
                    }

                # Fallback Detection Model
                detections = []
                highest_conf = 0.0
                if hasattr(result, "boxes") and result.boxes is not None:
                    for box in result.boxes:
                        cls_id = int(box.cls[0].item() if hasattr(box.cls[0], "item") else box.cls[0])
                        conf = float(box.conf[0].item() if hasattr(box.conf[0], "item") else box.conf[0])
                        if conf > highest_conf:
                            highest_conf = conf
                        detections.append({
                            "condition": format_label(result.names[cls_id]),
                            "confidence": round(conf * 100, 2)
                        })

                primary_prediction = detections[0]["condition"] if detections else "No disease detected"
                response = {
                    "success": True,
                    "primary_prediction": primary_prediction,
                    "confidence": detections[0]["confidence"] if detections else 0.0,
                    "all_detections": detections,
                }
                if is_pet_request:
                    response.update(disease_metadata(primary_prediction, animal_lower))
                
                return response
        finally:
            # Force garbage collection to free RAM instantly
            gc.collect()


vision_engine = VisionService()