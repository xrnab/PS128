from typing import Dict, Any, Tuple

SPECIES_TEMP_THRESHOLDS: Dict[str, Dict[str, Any]] = {
    "COW": {
        "species_name": "Cow",
        "normal_low": 38.0,
        "normal_high": 39.3,
        "fever_at": 39.5,
        "hypothermia_at": 37.0,
    },
    "BUFFALO": {
        "species_name": "Buffalo",
        "normal_low": 37.5,
        "normal_high": 39.0,
        "fever_at": 39.2,
        "hypothermia_at": 37.0,
    },
    "GOAT": {
        "species_name": "Goat",
        "normal_low": 38.5,
        "normal_high": 39.7,
        "fever_at": 40.0,
        "hypothermia_at": 37.5,
    },
    "SHEEP": {
        "species_name": "Sheep",
        "normal_low": 38.5,
        "normal_high": 39.9,
        "fever_at": 40.0,
        "hypothermia_at": 37.5,
    },
    "DOG": {
        "species_name": "Dog",
        "normal_low": 38.3,
        "normal_high": 39.2,
        "fever_at": 39.5,
        "hypothermia_at": 37.2,
    },
    "CAT": {
        "species_name": "Cat",
        "normal_low": 38.1,
        "normal_high": 39.2,
        "fever_at": 39.5,
        "hypothermia_at": 37.2,
    },
    "PET": {
        "species_name": "Pet",
        "normal_low": 38.2,
        "normal_high": 39.2,
        "fever_at": 39.5,
        "hypothermia_at": 37.2,
    },
    "OTHER": {
        "species_name": "Livestock",
        "normal_low": 38.0,
        "normal_high": 39.3,
        "fever_at": 39.5,
        "hypothermia_at": 37.0,
    },
}


def resolve_species_threshold(species: str = "Cow") -> Dict[str, Any]:
    if not species:
        return SPECIES_TEMP_THRESHOLDS["COW"]
    norm = str(species).strip().upper()
    if norm in SPECIES_TEMP_THRESHOLDS:
        return SPECIES_TEMP_THRESHOLDS[norm]
    if "COW" in norm or "CATTLE" in norm:
        return SPECIES_TEMP_THRESHOLDS["COW"]
    if "BUFFALO" in norm:
        return SPECIES_TEMP_THRESHOLDS["BUFFALO"]
    if "GOAT" in norm or "CAPRINE" in norm:
        return SPECIES_TEMP_THRESHOLDS["GOAT"]
    if "SHEEP" in norm or "OVINE" in norm:
        return SPECIES_TEMP_THRESHOLDS["SHEEP"]
    if "DOG" in norm or "CANINE" in norm:
        return SPECIES_TEMP_THRESHOLDS["DOG"]
    if "CAT" in norm or "FELINE" in norm:
        return SPECIES_TEMP_THRESHOLDS["CAT"]
    if "PET" in norm:
        return SPECIES_TEMP_THRESHOLDS["PET"]
    return SPECIES_TEMP_THRESHOLDS["OTHER"]


def evaluate_temperature_vitals(temperature: float, species: str = "Cow") -> Tuple[bool, bool, str]:
    """
    Evaluates temperature against species-specific reference ranges.
    Returns (is_fever, is_hypothermic, anomaly_description)
    """
    cfg = resolve_species_threshold(species)
    temp = round(float(temperature), 2)

    if temp >= cfg["fever_at"]:
        desc = f"Hyperthermia: {temp:.2f}°C (Threshold for {cfg['species_name']} > {cfg['fever_at']}°C)"
        return True, False, desc
    elif temp <= cfg["hypothermia_at"]:
        desc = f"Hypothermia: {temp:.2f}°C (Threshold for {cfg['species_name']} < {cfg['hypothermia_at']}°C)"
        return False, True, desc
    else:
        return False, False, ""
