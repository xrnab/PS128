import unittest
from app.services.advisory_service import generate_farmer_advisory


class TestAdvisorySynthesis(unittest.TestCase):
    def test_low_risk_no_strong_disease_signal_fixes_interpolation_bug(self):
        """
        Confirms that when disease_prediction is 'No strong disease signal' and risk is LOW,
        it does NOT produce 'CRITICAL WARNING (LOW)' or 'Suspected No strong disease signal'.
        """
        payload = {
            "overall_risk_score": 25,
            "overall_risk_level": "LOW",
            "health_report": {
                "animal": "Cow",
                "symptoms": ["Mild Cough"],
                "duration_days": 1,
            },
            "disease_prediction": {
                "suspected_condition": "No strong disease signal",
                "confidence": 0.18,
            },
            "yolo_vision_analysis": None,
            "iot_telemetry_analysis": {
                "temperature": 38.6,
                "activity_index": 55,
                "has_anomaly": False,
                "anomalies": [],
            },
            "weather_analysis": {"vector_breeding_risk": "NORMAL"},
            "outbreak_surge_analysis": {"is_outbreak_spike": False, "z_score": 0.2},
        }
        res = generate_farmer_advisory(payload, language="English")
        advisory = res["advisory"]

        # MUST NOT contain the broken interpolation strings
        self.assertNotIn("CRITICAL WARNING", advisory)
        self.assertNotIn("Suspected No strong disease signal", advisory)
        self.assertIn("LOW RISK", advisory)
        self.assertIn("Preliminary screening indicates no strong", advisory)

    def test_mismatched_case_reconciles_fever_yolo_skin_lesion_and_iot_temp(self):
        """
        Confirms Requirement 6:
        Farmer reports 'Fever', YOLO classifies skin lesions ('Lumpy Skin Disease'),
        and IoT confirms elevated temperature (40.2°C).
        Advisory must explicitly acknowledge and connect all three signals.
        """
        payload = {
            "overall_risk_score": 85,
            "overall_risk_level": "CRITICAL",
            "health_report": {
                "animal": "Cow",
                "symptoms": ["Fever"],
                "duration_days": 2,
                "affected_count": 1,
                "herd_size": 10,
            },
            "yolo_vision_analysis": {
                "visual_anomaly_detected": True,
                "primary_prediction": "Lumpy Skin Disease",
                "confidence": 84.0,
                "description": "Prominent cutaneous nodules across the body.",
            },
            "iot_telemetry_analysis": {
                "temperature": 40.2,
                "activity_index": 18,
                "has_anomaly": True,
                "anomalies": ["Hyperthermia: 40.2°C", "Lethargy: Activity index 18"],
            },
            "disease_prediction": {
                "suspected_condition": "Lumpy Skin Disease",
                "confidence": 0.88,
            },
            "weather_analysis": {"vector_breeding_risk": "HIGH"},
            "outbreak_surge_analysis": {"is_outbreak_spike": True, "z_score": 3.12},
        }
        res = generate_farmer_advisory(payload, language="English")
        advisory = res["advisory"]

        # 1. Acknowledges reported fever
        self.assertTrue("fever" in advisory.lower() or "Fever" in advisory)
        # 2. Acknowledges IoT temperature confirmation
        self.assertTrue("40.2" in advisory)
        # 3. Acknowledges YOLO visual lesion finding
        self.assertTrue("Lumpy Skin Disease" in advisory)
        self.assertTrue("84%" in advisory)
        # 4. Clinical safety guardrail: no medication prescription
        self.assertNotIn("antibiotic", advisory.lower())
        self.assertNotIn("paracetamol", advisory.lower())
        self.assertNotIn("ivermectin", advisory.lower())

    def test_disagreement_case_reported_fever_vs_normal_iot_temp(self):
        """
        Confirms Requirement 4:
        Farmer reports 'Fever', but IoT shows normal temperature (38.5°C),
        while YOLO detects a skin condition.
        Advisory must explicitly note the discrepancy between reported fever and normal sensor temp.
        """
        payload = {
            "overall_risk_score": 65,
            "overall_risk_level": "ELEVATED",
            "health_report": {
                "animal": "Cow",
                "symptoms": ["Fever"],
                "duration_days": 2,
            },
            "yolo_vision_analysis": {
                "visual_anomaly_detected": True,
                "primary_prediction": "Lumpy Skin Disease",
                "confidence": 82.0,
            },
            "iot_telemetry_analysis": {
                "temperature": 38.5,
                "activity_index": 55,
                "has_anomaly": False,
                "anomalies": [],
            },
            "disease_prediction": {
                "suspected_condition": "No strong disease signal",
                "confidence": 0.22,
            },
            "weather_analysis": {"vector_breeding_risk": "NORMAL"},
            "outbreak_surge_analysis": {"is_outbreak_spike": False, "z_score": 0.4},
        }
        res = generate_farmer_advisory(payload, language="English")
        advisory = res["advisory"]

        self.assertIn("Discrepancy", advisory)
        self.assertIn("38.5", advisory)
        self.assertIn("Lumpy Skin Disease", advisory)

    def test_marathi_language_generation(self):
        """
        Confirms Marathi localized generation without crashing or English-only fallback.
        """
        payload = {
            "overall_risk_score": 85,
            "overall_risk_level": "CRITICAL",
            "health_report": {
                "animal": "Cow",
                "symptoms": ["Fever"],
                "duration_days": 2,
            },
            "disease_prediction": {
                "suspected_condition": "Lumpy Skin Disease",
                "confidence": 0.88,
            },
        }
        res = generate_farmer_advisory(payload, language="Marathi")
        advisory = res["advisory"]
        self.assertTrue("आरोग्य" in advisory or "पशुवैद्यकीय" in advisory)


if __name__ == "__main__":
    unittest.main()
