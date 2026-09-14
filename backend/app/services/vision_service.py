import io
import base64
from pathlib import Path
from PIL import Image
from ultralytics import YOLO

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

        self._pet_model = None
        self._cow_model = None
        self._coco_model = None

    @property
    def coco_model(self) -> YOLO:
        # Tier 1 Pre-filter Model (loads automatically from Ultralytics)
        if self._coco_model is None:
            self._coco_model = YOLO("yolov8n.pt")
        return self._coco_model

    @property
    def pet_model(self) -> YOLO:
        if self._pet_model is None:
            pet_path = self.models_dir / "model_pet.pt"
            if not pet_path.exists():
                raise FileNotFoundError(f"Pet YOLO model file not found at: {pet_path}")
            self._pet_model = YOLO(str(pet_path))
        return self._pet_model

    @property
    def cow_model(self) -> YOLO:
        if self._cow_model is None:
            cow_path = self.models_dir / "model_cow.pt"
            if not cow_path.exists():
                raise FileNotFoundError(f"Cow YOLO model file not found at: {cow_path}")
            self._cow_model = YOLO(str(cow_path))
        return self._cow_model

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
        
        # Ensure visual anomaly is False if rejected
        prediction["visual_anomaly_detected"] = (
            prediction.get("primary_prediction") != "Healthy"
            and prediction.get("primary_prediction") != "No disease detected"
            and not str(prediction.get("primary_prediction", "")).startswith("Rejected")
        )
            
        return prediction

    def predict(self, image_bytes: bytes, animal_type: str = "cow") -> dict:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # =======================================================
        # TIER 1: STRICT REJECTION FILTER (Humans, Objects & Mismatched Animals)
        # =======================================================
        coco_results = self.coco_model(image, verbose=False)[0]
        detected_coco_classes = [
            coco_results.names[int(box.cls[0])] for box in coco_results.boxes
        ] if coco_results.boxes else []

        animal_lower = str(animal_type).strip().lower()
        is_pet_request = animal_lower in ["pet", "dog", "cat"]
        
        coco_animal_classes = {
            "bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe"
        }
        livestock_allowed_classes = {"cow", "sheep", "horse"}
        pet_allowed_classes = {"dog", "cat"}

        # 1. Any person detected -> Always reject immediately
        if "person" in detected_coco_classes:
            return {
                "success": True,
                "primary_prediction": "Rejected: Person",
                "confidence": 0.0,
                "visual_anomaly_detected": False,
                "message": "Invalid photo. Person detected."
            }

        # 2. Any non-animal object detected -> Reject immediately
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

        # 3. Mismatched animal category detected
        if is_pet_request:
            mismatched_animals = [cls for cls in detected_coco_classes if cls in coco_animal_classes and cls not in pet_allowed_classes]
            if mismatched_animals:
                reason = mismatched_animals[0].replace("_", " ").title()
                return {
                    "success": True,
                    "primary_prediction": f"Rejected: {reason}",
                    "confidence": 0.0,
                    "visual_anomaly_detected": False,
                    "message": f"Invalid photo. {reason} detected (expected pet)."
                }
        else:
            mismatched_animals = [cls for cls in detected_coco_classes if cls in coco_animal_classes and cls not in livestock_allowed_classes]
            if mismatched_animals:
                reason = mismatched_animals[0].replace("_", " ").title()
                return {
                    "success": True,
                    "primary_prediction": f"Rejected: {reason}",
                    "confidence": 0.0,
                    "visual_anomaly_detected": False,
                    "message": f"Invalid photo. {reason} detected (expected livestock)."
                }

        # =======================================================
        # TIER 2: CUSTOM DISEASE CLASSIFICATION
        # =======================================================
        animal_lower = str(animal_type).strip().lower()

        # Select the requested model on-demand
        if animal_lower in ["pet", "dog", "cat"]:
            model = self.pet_model
            pet_labels = {str(label).strip().lower() for label in model.names.values()}
            if pet_labels == CATTLE_MODEL_LABELS:
                raise ValueError(
                    "The pet model contains cattle disease classes. "
                    "Replace app/ml_artifacts/model_pet.pt with a pet-trained model."
                )
        elif animal_lower in ["cow", "cattle", "livestock", "buffalo", "sheep", "goat"]:
            model = self.cow_model
        else:
            model = self.cow_model

        # Perform inference
        results = model(image, verbose=False)
        result = results[0]

        # For Classification Models (YOLOv8-cls)
        if hasattr(result, "probs") and result.probs is not None:
            top_idx = int(result.probs.top1)
            top_conf = float(result.probs.top1conf)
            class_name = format_label(result.names[top_idx])

            # Apply Confidence Threshold (Reject blurry/unrecognized images)
            if top_conf < 0.60:
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

        # For Object Detection Models (YOLOv8-det fallback)
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

        # Apply Confidence Threshold for Detection Models
        if not detections or highest_conf < 0.60:
             return {
                "success": True,
                "primary_prediction": "Rejected: Unrecognized Image",
                "confidence": round(highest_conf * 100, 2),
                "visual_anomaly_detected": False,
                "message": "No clear animal lesion patterns recognized."
            }

        primary_prediction = detections[0]["condition"] if detections else "No disease detected"
        response = {
            "success": True,
            "primary_prediction": primary_prediction,
            "confidence": detections[0]["confidence"] if detections else 0.0,
            "all_detections": detections,
        }
        if animal_lower in ["pet", "dog", "cat"]:
            response.update(disease_metadata(primary_prediction, animal_lower))
        return response


vision_engine = VisionService()