import io
import unittest
from unittest.mock import MagicMock, patch
from PIL import Image

from app.services.vision_service import VisionService


class TestVisionRejection(unittest.TestCase):
    def setUp(self):
        self.service = VisionService()
        
        # Create a simple in-memory 100x100 dummy image
        img = Image.new("RGB", (100, 100), color=(120, 80, 50))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        self.dummy_bytes = buf.getvalue()

    def _mock_coco_result(self, class_names):
        mock_result = MagicMock()
        mock_boxes = []
        names_dict = {}
        for idx, name in enumerate(class_names):
            names_dict[idx] = name
            box = MagicMock()
            box.cls = [idx]
            mock_boxes.append(box)
        
        mock_result.boxes = mock_boxes
        mock_result.names = names_dict
        return [mock_result]

    @patch.object(VisionService, "coco_model", new_callable=MagicMock)
    def test_reject_person(self, mock_coco):
        mock_coco.return_value = self._mock_coco_result(["person"])
        res = self.service.predict(self.dummy_bytes, animal_type="cow")

        self.assertTrue(res.get("success"))
        self.assertEqual(res.get("primary_prediction"), "Rejected: Person")
        self.assertIn("Person detected", res.get("message", ""))
        self.assertFalse(res.get("visual_anomaly_detected"))

    @patch.object(VisionService, "coco_model", new_callable=MagicMock)
    def test_reject_non_animal_objects(self, mock_coco):
        objects = ["cup", "bottle", "car", "cell phone", "chair", "laptop", "book", "backpack"]
        for obj in objects:
            mock_coco.return_value = self._mock_coco_result([obj])
            res = self.service.predict(self.dummy_bytes, animal_type="cow")

            self.assertTrue(res.get("success"))
            expected_name = obj.replace("_", " ").title()
            self.assertEqual(res.get("primary_prediction"), f"Rejected: {expected_name}")
            self.assertIn(f"{expected_name} detected", res.get("message", ""))
            self.assertFalse(res.get("visual_anomaly_detected"))

    @patch.object(VisionService, "coco_model", new_callable=MagicMock)
    def test_reject_mismatched_animal_category(self, mock_coco):
        # Pet on livestock report
        mock_coco.return_value = self._mock_coco_result(["dog"])
        res = self.service.predict(self.dummy_bytes, animal_type="cow")
        self.assertTrue(res.get("success"))
        self.assertEqual(res.get("primary_prediction"), "Rejected: Dog")
        self.assertIn("expected livestock", res.get("message", ""))

        # Livestock on pet report
        mock_coco.return_value = self._mock_coco_result(["cow"])
        res_pet = self.service.predict(self.dummy_bytes, animal_type="pet")
        self.assertTrue(res_pet.get("success"))
        self.assertEqual(res_pet.get("primary_prediction"), "Rejected: Cow")
        self.assertIn("expected pet", res_pet.get("message", ""))


if __name__ == "__main__":
    unittest.main()
