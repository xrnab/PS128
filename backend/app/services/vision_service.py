import io
import base64
import logging
from pathlib import Path
from PIL import Image
import numpy as np
import onnxruntime as ort

logger = logging.getLogger(__name__)

LABEL_MAP = {
    "lumpy": "Lumpy Skin Disease",
    "foot-and-mouth": "Foot and Mouth Disease",
    "healthy": "Healthy",
    "dermatitis": "Dermatitis",
    "fungal_infections": "Fungal Infections",
    "hypersensitivity": "Hypersensitivity",
    "demodicosis": "Demodicosis",
    "ringworm": "Ringworm",
}

COW_CLASSES = ["foot-and-mouth", "healthy", "lumpy"]
PET_CLASSES = ["Dermatitis", "Fungal_infections", "Healthy", "Hypersensitivity", "demodicosis", "ringworm"]

COCO_CLASSES = {
    0: "person", 1: "bicycle", 2: "car", 3: "motorcycle", 4: "airplane", 5: "bus", 6: "train", 7: "truck",
    8: "boat", 9: "traffic light", 10: "fire hydrant", 11: "stop sign", 12: "parking meter", 13: "bench",
    14: "bird", 15: "cat", 16: "dog", 17: "horse", 18: "sheep", 19: "cow", 20: "elephant", 21: "bear",
    22: "zebra", 23: "giraffe", 24: "backpack", 25: "umbrella", 26: "handbag", 27: "tie", 28: "suitcase",
    29: "frisbee", 30: "skis", 31: "snowboard", 32: "sports ball", 33: "kite", 34: "baseball bat",
    35: "baseball glove", 36: "skateboard", 37: "surfboard", 38: "tennis racket", 39: "bottle", 40: "wine glass",
    41: "cup", 42: "fork", 43: "knife", 44: "spoon", 45: "bowl", 46: "banana", 47: "apple", 48: "sandwich",
    49: "orange", 50: "broccoli", 51: "carrot", 52: "hot dog", 53: "pizza", 54: "donut", 55: "cake",
    56: "chair", 57: "couch", 58: "potted plant", 59: "bed", 60: "dining table", 61: "toilet", 62: "tv",
    63: "laptop", 64: "mouse", 65: "remote", 66: "keyboard", 67: "cell phone", 68: "microwave", 69: "oven",
    70: "toaster", 71: "sink", 72: "refrigerator", 73: "book", 74: "clock", 75: "vase", 76: "scissors",
    77: "teddy bear", 78: "hair drier", 79: "toothbrush",
}

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
    return LABEL_MAP.get(str(label).strip().lower(), label)


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


def preprocess_image(image: Image.Image, target_size=(224, 224)) -> np.ndarray:
    """Resize and normalize image for ONNX model inference."""
    img = image.resize(target_size, Image.Resampling.LANCZOS).convert("RGB")
    img_data = np.array(img).astype(np.float32) / 255.0
    img_data = np.transpose(img_data, (2, 0, 1))
    img_data = np.expand_dims(img_data, axis=0)
    return img_data


def softmax(x: np.ndarray) -> np.ndarray:
    e_x = np.exp(x - np.max(x, axis=-1, keepdims=True))
    return e_x / np.sum(e_x, axis=-1, keepdims=True)


class CocoDetectionWrapper:
    """Provides a compatible interface for COCO detection results matching Ultralytics format."""
    def __init__(self, detected_classes: list[str]):
        self.boxes = [type("Box", (), {"cls": [i]})() for i in range(len(detected_classes))]
        self.names = {i: name for i, name in enumerate(detected_classes)}


class VisionService:
    def __init__(self, models_dir: str | Path | None = None):
        if models_dir is None:
            self.models_dir = Path(__file__).resolve().parents[1] / "ml_artifacts"
        else:
            self.models_dir = Path(models_dir)

        self._cow_session: ort.InferenceSession | None = None
        self._pet_session: ort.InferenceSession | None = None
        self._coco_session: ort.InferenceSession | None = None
        self._coco_callable = None

    @property
    def cow_session(self) -> ort.InferenceSession:
        if self._cow_session is None:
            model_path = self.models_dir / "model_cow.onnx"
            if not model_path.exists():
                model_path = Path(__file__).resolve().parents[2] / "model_cow.onnx"
            logger.info(f"Loading lightweight ONNX cow model from: {model_path}")
            self._cow_session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
        return self._cow_session

    @property
    def pet_session(self) -> ort.InferenceSession:
        if self._pet_session is None:
            model_path = self.models_dir / "model_pet.onnx"
            if not model_path.exists():
                model_path = Path(__file__).resolve().parents[2] / "model_pet.onnx"
            logger.info(f"Loading lightweight ONNX pet model from: {model_path}")
            self._pet_session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
        return self._pet_session

    @property
    def coco_session(self) -> ort.InferenceSession | None:
        if self._coco_session is None:
            model_path = self.models_dir / "yolov8n.onnx"
            if not model_path.exists():
                model_path = Path(__file__).resolve().parents[2] / "yolov8n.onnx"
            if model_path.exists():
                logger.info(f"Loading lightweight ONNX COCO model from: {model_path}")
                self._coco_session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
        return self._coco_session

    @property
    def coco_model(self):
        """Tier 1 Pre-filter Model callable, compatible with mock patching in unit tests."""
        if self._coco_callable is None:
            def _run_coco(image, **kwargs):
                if self.coco_session is None:
                    return [CocoDetectionWrapper([])]
                tensor = preprocess_image(image, target_size=(224, 224))
                input_name = self.coco_session.get_inputs()[0].name
                outputs = self.coco_session.run(None, {input_name: tensor})[0]
                preds = np.transpose(outputs[0], (1, 0))
                scores = preds[:, 4:]
                max_scores = np.max(scores, axis=1)
                max_cls = np.argmax(scores, axis=1)
                detected = []
                for score, cls_id in zip(max_scores, max_cls):
                    if score > 0.40 and cls_id in COCO_CLASSES:
                        detected.append(COCO_CLASSES[cls_id])
                unique_detected = list(dict.fromkeys(detected))
                return [CocoDetectionWrapper(unique_detected)]

            self._coco_callable = _run_coco
        return self._coco_callable

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
        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

            # =======================================================
            # TIER 1: STRICT REJECTION FILTER (Humans, Objects & Mismatched Animals)
            # =======================================================
            detected_coco_classes = []
            try:
                coco_results = self.coco_model(image)[0]
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

            if is_pet_request:
                mismatched = [cls for cls in detected_coco_classes if cls in coco_animal_classes and cls not in pet_allowed_classes]
                if mismatched:
                    reason = mismatched[0].replace("_", " ").title()
                    return {
                        "success": True,
                        "primary_prediction": f"Rejected: {reason}",
                        "confidence": 0.0,
                        "visual_anomaly_detected": False,
                        "message": f"Invalid photo. {reason} detected (expected pet)."
                    }
            else:
                mismatched = [cls for cls in detected_coco_classes if cls in coco_animal_classes and cls not in livestock_allowed_classes]
                if mismatched:
                    reason = mismatched[0].replace("_", " ").title()
                    return {
                        "success": True,
                        "primary_prediction": f"Rejected: {reason}",
                        "confidence": 0.0,
                        "visual_anomaly_detected": False,
                        "message": f"Invalid photo. {reason} detected (expected livestock)."
                    }

            # =======================================================
            # TIER 2: ULTRA-LIGHTWEIGHT ONNX INFERENCE (< 10ms, ~60MB RAM)
            # =======================================================
            input_tensor = preprocess_image(image, target_size=(224, 224))

            if is_pet_request:
                session = self.pet_session
                class_names = PET_CLASSES
            else:
                session = self.cow_session
                class_names = COW_CLASSES

            input_name = session.get_inputs()[0].name
            output_name = session.get_outputs()[0].name

            raw_outputs = session.run([output_name], {input_name: input_tensor})[0]
            probs = softmax(raw_outputs[0])

            top_idx = int(np.argmax(probs))
            top_conf = float(probs[top_idx])

            label = class_names[top_idx] if top_idx < len(class_names) else "healthy"
            class_name = format_label(label)

            if top_conf < 0.45:
                return {
                    "success": True,
                    "primary_prediction": "Rejected: Unrecognized Image",
                    "confidence": round(top_conf * 100, 2),
                    "visual_anomaly_detected": False,
                    "message": "No clear disease patterns recognized. Please re-take photo."
                }

            top_predictions = []
            sorted_indices = np.argsort(probs)[::-1]
            for idx in sorted_indices[:5]:
                top_predictions.append({
                    "condition": format_label(class_names[idx]),
                    "confidence": round(float(probs[idx]) * 100, 2)
                })

            meta = disease_metadata(label, animal_lower)

            return {
                "success": True,
                "primary_prediction": class_name,
                "confidence": round(top_conf * 100, 2),
                "severity": meta.get("severity", "LOW"),
                "description": meta.get("description", ""),
                "contagious": meta.get("contagious", False),
                "visual_anomaly_detected": class_name not in ["Healthy", "No disease detected"],
                "top_predictions": top_predictions
            }

        except Exception as e:
            logger.error(f"❌ ONNX Vision Inference Error: {e}")
            return {
                "success": False,
                "primary_prediction": "Error",
                "confidence": 0.0,
                "visual_anomaly_detected": False,
                "message": f"Inference failed: {str(e)}"
            }


ONNXVisionService = VisionService
vision_engine = VisionService()