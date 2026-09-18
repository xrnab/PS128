import unittest
from app.services.iot_thresholds import (
    resolve_species_threshold,
    evaluate_temperature_vitals,
    SPECIES_TEMP_THRESHOLDS,
)

class TestIoTThresholds(unittest.TestCase):
    def test_species_resolution(self):
        self.assertEqual(resolve_species_threshold("Cow")["species_name"], "Cow")
        self.assertEqual(resolve_species_threshold("BUFFALO")["species_name"], "Buffalo")
        self.assertEqual(resolve_species_threshold("Goat")["species_name"], "Goat")
        self.assertEqual(resolve_species_threshold("Sheep")["species_name"], "Sheep")
        self.assertEqual(resolve_species_threshold("Dog")["species_name"], "Dog")
        self.assertEqual(resolve_species_threshold("Cat")["species_name"], "Cat")

    def test_goat_threshold_divergence(self):
        # 39.8°C is normal/monitoring for Goat (< 40.0°C), but fever for Cow (> 39.5°C)
        is_fever_goat, is_hypo_goat, desc_goat = evaluate_temperature_vitals(39.8, species="Goat")
        self.assertFalse(is_fever_goat)
        self.assertFalse(is_hypo_goat)
        self.assertEqual(desc_goat, "")

        is_fever_cow, is_hypo_cow, desc_cow = evaluate_temperature_vitals(39.8, species="Cow")
        self.assertTrue(is_fever_cow)
        self.assertIn("Hyperthermia", desc_cow)
        self.assertIn("Threshold for Cow > 39.5", desc_cow)

    def test_goat_fever(self):
        is_fever, is_hypo, desc = evaluate_temperature_vitals(40.2, species="Goat")
        self.assertTrue(is_fever)
        self.assertFalse(is_hypo)
        self.assertIn("Threshold for Goat > 40.0", desc)

    def test_buffalo_fever(self):
        # Buffalo fever starts earlier at 39.2°C
        is_fever, is_hypo, desc = evaluate_temperature_vitals(39.3, species="Buffalo")
        self.assertTrue(is_fever)
        self.assertIn("Threshold for Buffalo > 39.2", desc)

    def test_hypothermia(self):
        is_fever, is_hypo, desc = evaluate_temperature_vitals(36.5, species="Cow")
        self.assertFalse(is_fever)
        self.assertTrue(is_hypo)
        self.assertIn("Hypothermia", desc)


if __name__ == "__main__":
    unittest.main()
