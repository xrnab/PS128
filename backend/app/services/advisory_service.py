import os
import logging
import requests
from typing import Dict, Any, List
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)

GEMINI_KEY_1 = os.getenv("GEMINI_API_KEY_1", os.getenv("GEMINI_API_KEY", "")).strip()
GEMINI_KEY_2 = os.getenv("GEMINI_API_KEY_2", "").strip()
GROQ_KEY = os.getenv("GROQ_API_KEY", "").strip()
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash").strip()


def _call_gemini(api_key: str, prompt: str) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 300
        }
    }
    response = requests.post(url, json=payload, headers=headers, timeout=12)
    response.raise_for_status()
    data = response.json()
    return data["candidates"][0]["content"]["parts"][0]["text"].strip()


def _call_groq(api_key: str, model_name: str, prompt: str) -> str:
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model_name,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are an expert veterinary triage decision-support assistant. "
                    "You synthesize multiple diagnostic streams (farmer symptoms, photographic lesion scans, "
                    "IoT biometric collars, vector breeding climate, and local outbreak data) into a coherent, "
                    "reasoned, plain-language guidance note for rural livestock farmers. You strictly observe non-prescriptive "
                    "safety rules: never state a definitive diagnosis, never prescribe medications or dosages, and always "
                    "recommend veterinary physical review."
                )
            },
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.2,
        "max_tokens": 300
    }
    response = requests.post(url, json=payload, headers=headers, timeout=12)
    response.raise_for_status()
    data = response.json()
    return data["choices"][0]["message"]["content"].strip()


def _extract_stream_context(analysis_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extracts and standardizes all master_service diagnostic streams.
    """
    # 1. Farmer Health Report
    health_report = analysis_data.get("health_report") or {}
    species = health_report.get("animal") or "Livestock"
    symptoms = health_report.get("symptoms") or []
    if isinstance(symptoms, str):
        symptoms = [symptoms]
    duration_days = health_report.get("duration_days")
    affected_count = health_report.get("affected_count", 1)
    herd_size = health_report.get("herd_size", 10)

    # 2. YOLO Computer Vision
    yolo_res = analysis_data.get("yolo_vision_analysis") or {}
    raw_yolo_pred = (
        yolo_res.get("primary_prediction")
        or yolo_res.get("condition")
        or yolo_res.get("disease")
    )
    detected_classes = yolo_res.get("detected_classes") or []
    if isinstance(detected_classes, str):
        detected_classes = [detected_classes]
    if not raw_yolo_pred and detected_classes:
        raw_yolo_pred = detected_classes[0]

    yolo_conf = float(yolo_res.get("confidence", 0) or 0)
    # Convert decimal (e.g. 0.88) to percentage (88.0) if applicable
    if 0.0 < yolo_conf <= 1.0:
        yolo_conf = round(yolo_conf * 100, 1)

    yolo_desc = yolo_res.get("description", "")
    yolo_severity = yolo_res.get("severity", "")
    yolo_region = (
        yolo_res.get("body_region")
        or yolo_res.get("region")
        or yolo_res.get("lesion_type")
        or yolo_res.get("body_part")
        or ""
    )

    # Clean out non-anomaly YOLO outputs
    if not raw_yolo_pred or str(raw_yolo_pred).strip().lower() in [
        "rejected: unrecognized image", "healthy", "none", "no disease detected", ""
    ]:
        visual_detected = False
        yolo_condition = None
    else:
        visual_detected = True
        yolo_condition = str(raw_yolo_pred).strip()

    # 3. Tabular ML Disease Prediction
    ml_pred = analysis_data.get("disease_prediction") or {}
    raw_ml_condition = ml_pred.get("suspected_condition")
    ml_conf = float(ml_pred.get("confidence", 0) or 0)
    has_ml_signal = bool(
        raw_ml_condition
        and raw_ml_condition != "No strong disease signal"
        and raw_ml_condition != "Unknown Condition"
        and ml_conf >= 0.30
    )
    ml_condition = raw_ml_condition if has_ml_signal else None

    # 4. IoT Telemetry
    iot_data = analysis_data.get("iot_telemetry_analysis") or {}
    iot_temp = iot_data.get("temperature")
    if iot_temp is not None:
        try:
            iot_temp = round(float(iot_temp), 1)
        except (ValueError, TypeError):
            iot_temp = None
    iot_act = iot_data.get("activity_index")
    iot_anomalies = iot_data.get("anomalies") or []
    has_iot_anomaly = bool(iot_data.get("has_anomaly") or len(iot_anomalies) > 0)

    # 5. Weather & Vector Risk
    weather_data = analysis_data.get("weather_analysis") or {}
    vector_risk = weather_data.get("vector_breeding_risk") or "NORMAL"

    # 6. Outbreak Surge (Z-Score)
    surge_data = analysis_data.get("outbreak_surge_analysis") or {}
    is_outbreak_spike = bool(surge_data.get("is_outbreak_spike"))
    z_score = float(surge_data.get("z_score", 0.0) or 0.0)

    # 7. Overall Calibrated Risk
    risk_level = analysis_data.get("overall_risk_level") or "ELEVATED"
    risk_score = analysis_data.get("overall_risk_score", 50)

    return {
        "species": species,
        "symptoms": symptoms,
        "duration_days": duration_days,
        "affected_count": affected_count,
        "herd_size": herd_size,
        "visual_detected": visual_detected,
        "yolo_condition": yolo_condition,
        "yolo_conf": yolo_conf,
        "yolo_desc": yolo_desc,
        "yolo_severity": yolo_severity,
        "yolo_region": yolo_region,
        "detected_classes": detected_classes,
        "has_ml_signal": has_ml_signal,
        "ml_condition": ml_condition,
        "ml_conf": ml_conf,
        "iot_temp": iot_temp,
        "iot_act": iot_act,
        "iot_anomalies": iot_anomalies,
        "has_iot_anomaly": has_iot_anomaly,
        "vector_risk": vector_risk,
        "is_outbreak_spike": is_outbreak_spike,
        "z_score": z_score,
        "risk_level": risk_level,
        "risk_score": risk_score,
    }


def _analyze_stream_agreements(ctx: Dict[str, Any]) -> List[str]:
    """
    Evaluates cross-stream agreements and disagreements across symptoms, photo, IoT, and epidemiology.
    """
    points = []
    symptoms_lower = [s.lower() for s in ctx["symptoms"]]
    has_fever_reported = any("fever" in s or "high temp" in s for s in symptoms_lower)
    has_skin_reported = any("skin" in s or "nodule" in s or "lesion" in s or "blister" in s or "lump" in s for s in symptoms_lower)
    region_str = f" on {ctx['yolo_region']}" if ctx.get("yolo_region") else ""

    # 1. Temperature Check: Farmer vs IoT
    if ctx["iot_temp"] is not None:
        if ctx["iot_temp"] > 39.5:
            if has_fever_reported:
                points.append(
                    f"Corroboration: The farmer-reported fever is independently confirmed by collar telemetry recording an elevated body temperature of {ctx['iot_temp']}°C (hyperthermia)."
                )
            else:
                points.append(
                    f"Discrepancy: The farmer did not report fever, but collar telemetry detected an objective hyperthermia spike of {ctx['iot_temp']}°C."
                )
        elif ctx["iot_temp"] <= 39.3:
            if has_fever_reported:
                points.append(
                    f"Discrepancy: The farmer noted fever, but collar telemetry recorded a normal body temperature of {ctx['iot_temp']}°C (indicating an intermittent fever spike or afebrile stage)."
                )
            else:
                points.append(f"Normal Vitals: Collar telemetry confirms body temperature ({ctx['iot_temp']}°C) is currently within the normal physiological range.")

    if ctx["iot_act"] is not None and ctx["iot_act"] < 30:
        points.append(f"Sensor Warning: Motion sensor registers low activity ({ctx['iot_act']}), indicating lethargy or prolonged recumbency.")

    # 2. Lesion Check: Farmer Symptoms vs YOLO Vision
    if ctx["visual_detected"] and ctx["yolo_condition"]:
        if has_skin_reported:
            points.append(
                f"Corroboration: The reported skin lesions are visually confirmed by photographic analysis detecting signs of {ctx['yolo_condition']}{region_str} ({ctx['yolo_conf']:.0f}% confidence)."
            )
        else:
            reported_summary = ", ".join(ctx["symptoms"]) if ctx["symptoms"] else "general malaise"
            points.append(
                f"Cross-Stream Discrepancy & Visual Finding: The farmer reported {reported_summary} without noting skin lesions, but the uploaded photograph independently reveals signs of {ctx['yolo_condition']}{region_str} ({ctx['yolo_conf']:.0f}% confidence). Both the reported systemic signs and photographic lesions must be evaluated together."
            )
    elif has_skin_reported and not ctx["visual_detected"]:
        points.append(
            "Discrepancy: The farmer noted skin lesions, but automated photographic inspection did not detect prominent cutaneous lesions in the uploaded image. Direct tactile veterinary palpation is needed."
        )
    elif not ctx["visual_detected"] and not has_skin_reported:
        points.append(
            "Photo Analysis: No significant visual abnormality was detected in the uploaded photograph. The computer vision model found no lesion signatures."
        )

    # 3. ML Prediction Alignment
    if ctx["has_ml_signal"] and ctx["visual_detected"] and ctx["yolo_condition"]:
        if ctx["yolo_condition"].lower() in ctx["ml_condition"].lower() or ctx["ml_condition"].lower() in ctx["yolo_condition"].lower():
            points.append(f"Convergence: Both symptom modeling and visual lesion analysis independently align on suspected {ctx['yolo_condition']}.")
        else:
            points.append(
                f"Differential Presentation: Symptom pattern suggests possible {ctx['ml_condition']} ({ctx['ml_conf']*100:.0f}% confidence), whereas photographic scan indicates {ctx['yolo_condition']}{region_str} ({ctx['yolo_conf']:.0f}% confidence). The attending veterinarian should evaluate both possibilities."
            )

    # 4. Outbreak & Climate Context
    if ctx["is_outbreak_spike"]:
        points.append(f"Epidemiological Surge: Local village cluster is experiencing a statistically significant case surge (Z-score: {ctx['z_score']:.2f}).")
    if ctx["vector_risk"] == "HIGH":
        points.append("Environmental Factor: High microclimate vector breeding risk creates elevated potential for insect-borne disease transmission.")

    return points


def _build_llm_prompt(ctx: Dict[str, Any], agreements: List[str], language: str) -> str:
    symptoms_str = ", ".join(ctx["symptoms"]) if ctx["symptoms"] else "None reported"
    duration_str = f"{ctx['duration_days']} days" if ctx["duration_days"] else "Not specified"
    iot_temp_str = f"{ctx['iot_temp']}°C" if ctx["iot_temp"] is not None else "Not available"
    iot_act_str = f"{ctx['iot_act']}/100" if ctx["iot_act"] is not None else "Not available"

    classes_list = ctx.get("detected_classes") or ([ctx["yolo_condition"]] if ctx.get("yolo_condition") else [])
    classes_str = ", ".join(classes_list) if classes_list else "None"
    region_str = f" on {ctx['yolo_region']}" if ctx.get("yolo_region") else ""
    yolo_str = (
        f"Detected class(es): [{classes_str}], Confidence: {ctx['yolo_conf']:.0f}%, Lesion/Region: {ctx['yolo_region'] or 'Cutaneous lesions'}"
        if ctx["visual_detected"] and ctx["yolo_condition"]
        else "No visual lesions detected (or healthy scan)"
    )
    ml_str = f"{ctx['ml_condition']} ({ctx['ml_conf']*100:.0f}% confidence)" if ctx["has_ml_signal"] else "No strong symptom pattern"
    agreements_block = "\n   - ".join(agreements) if agreements else "All signals within baseline parameters."

    header_label = (
        "CRITICAL HEALTH ALERT (HIGH RISK)" if ctx["risk_level"] == "CRITICAL"
        else "ELEVATED HEALTH ADVISORY" if ctx["risk_level"] == "ELEVATED"
        else "PRELIMINARY HEALTH OBSERVATION (LOW RISK)"
    )
    header_emoji = "🚨" if ctx["risk_level"] == "CRITICAL" else "⚠️" if ctx["risk_level"] == "ELEVATED" else "ℹ️"

    return f"""You are an expert veterinary triage decision-support assistant preparing an informative guidance note for a rural livestock farmer.
Language requested: {language}. Maximum length: 180 words.

DIAGNOSTIC DATA STREAMS:
1. Farmer Health Report:
   - Species: {ctx['species']}
   - Symptoms Reported: {symptoms_str}
   - Duration: {duration_str}
   - Affected Animals: {ctx['affected_count']} of {ctx['herd_size']} in herd

2. Computer Vision (YOLO Lesion Scan):
   - Finding: {yolo_str}
   - Description: {ctx['yolo_desc'] if ctx['yolo_desc'] else 'N/A'}
   - Severity: {ctx['yolo_severity'] if ctx['yolo_severity'] else 'N/A'}

3. IoT Telemetry (Collar Biometrics):
   - Body Temperature: {iot_temp_str}
   - Activity Index: {iot_act_str}
   - Flagged Anomalies: {', '.join(ctx['iot_anomalies']) if ctx['iot_anomalies'] else 'None (normal vitals)'}

4. Symptom ML Model Prediction:
   - Suspected Condition: {ml_str}

5. Environmental & Epidemiological Context:
   - Vector Breeding Risk: {ctx['vector_risk']}
   - Regional Outbreak Surge: {'Active Spike (Z-Score: ' + str(ctx['z_score']) + ')' if ctx['is_outbreak_spike'] else 'Baseline (Z-Score: ' + str(ctx['z_score']) + ')'}
   - Overall Calibrated Risk: {ctx['risk_level']} ({ctx['risk_score']}/100)

CROSS-STREAM RECONCILIATION SIGNALS:
   - {agreements_block}

CRITICAL INSTRUCTIONS FOR MULTI-STREAM SYNTHESIS:
1. CONNECT ALL STREAMS IN ONE COHERENT EXPLANATION:
   Do NOT just list the data points one by one. Reason like a veterinary triage assistant cross-checking independent signals against each other. Connect the farmer-reported symptoms and duration, YOLO visual lesion findings (detected class, confidence, and lesion region), IoT telemetry readings (temperature and activity), weather/vector risk, and outbreak surge into a unified clinical narrative.
   Example reasoning structure: "The farmer reported fever. The uploaded photo shows signs of [lesion type] on [body region] with [X]% confidence. The IoT collar independently confirms elevated body temperature of [X]°C, consistent with the reported fever. Combined with [weather/outbreak context], this pattern is consistent with suspected [disease_prediction]."

2. EXPLICITLY ADDRESS DISAGREEMENTS BETWEEN STREAMS:
   When streams disagree (e.g. farmer reports fever but photo shows skin lesions, or farmer reports fever but IoT collar shows normal temperature), you MUST state this discrepancy explicitly and explain what it implies (e.g. possible intermittent fever, unobserved skin lesions, or multiple co-occurring presentations) rather than picking one stream and ignoring the other. Disagreements provide vital diagnostic clues for the attending veterinarian.

3. STRICT CLINICAL SAFETY GUARDRAILS:
   - Decision-support only. NEVER declare a definitive diagnosis ("the animal has X", "this IS X disease"). Use strictly non-prescriptive framing: "suspected", "consistent with", "presents signs of".
   - ABSOLUTELY NO DRUG NAMES OR DOSAGES (no antibiotics, analgesics, or pharmaceuticals).
   - Require immediate physical examination by a licensed veterinarian for formal prescription.

4. VISION FIDELITY CONSTRAINT (MANDATORY):
   Do NOT state a specific visual finding, confidence number, or diagnosis that is not literally present in the "Computer Vision (YOLO Lesion Scan)" field provided above. If the vision data says "No visual lesions detected" or "healthy scan" or lists no detected classes, the advisory MUST state plainly that the photo showed no visible abnormality. NEVER invent, infer, or fabricate a disease name, lesion type, or confidence percentage from the photo when the vision model did not return one. Violating this rule produces dangerous clinical misinformation.

FORMAT THE ADVISORY EXACTLY AS:
{header_emoji} **{header_label}:**
[Synthesized narrative connecting symptoms, photo findings, IoT telemetry, and environmental context. Explicitly addressing corroborations and discrepancies.]

⚡ **IMMEDIATE SUPPORTIVE ACTIONS:**
1. [Isolation / Biosecurity step]
2. [Supportive care / Hydration / Comfort step - NO MEDICATIONS]
3. [Sanitation / Vector protection step]

📞 **VETERINARY ACTION:** [Specific guidance on veterinary contact and physical evaluation]
"""


def _generate_deterministic_advisory(ctx: Dict[str, Any], agreements: List[str], language: str = "English") -> str:
    """
    Robust, reasoned fallback generator that synthesizes all streams coherently
    even if external LLM APIs fail or are offline. Completely fixes the interpolation bug.
    """
    is_marathi = "marathi" in language.lower() or language.lower() == "mr"
    symptoms_lower = [s.lower() for s in ctx["symptoms"]]
    has_fever_reported = any("fever" in s or "high temp" in s for s in symptoms_lower)
    has_skin_reported = any("skin" in s or "nodule" in s or "lesion" in s or "blister" in s or "lump" in s for s in symptoms_lower)
    region_str = f" on {ctx['yolo_region']}" if ctx.get("yolo_region") else ""

    # Determine Header
    if ctx["risk_level"] == "CRITICAL":
        header = "🚨 **CRITICAL HEALTH ALERT (HIGH RISK):**" if not is_marathi else "🚨 **गंभीर आरोग्य इशारा (उच्च जोखीम):**"
    elif ctx["risk_level"] == "ELEVATED":
        header = "⚠️ **ELEVATED HEALTH ADVISORY:**" if not is_marathi else "⚠️ **दक्षता आरोग्य सल्ला (मध्यम जोखीम):**"
    else:
        header = "ℹ️ **PRELIMINARY HEALTH OBSERVATION (LOW RISK):**" if not is_marathi else "ℹ️ **प्राथमिक आरोग्य निरीक्षण (कमी जोखीम):**"

    # Build Coherent Synthesis Paragraph
    synthesis_sentences = []

    # 1. Primary Disease / Suspected Pattern
    if ctx["visual_detected"] and ctx["yolo_condition"]:
        if ctx["has_ml_signal"] and ctx["ml_condition"] and ctx["ml_condition"].lower() not in ctx["yolo_condition"].lower():
            if not is_marathi:
                synthesis_sentences.append(
                    f"Preliminary cross-stream assessment reveals a multi-faceted presentation: symptom patterns suggest potential {ctx['ml_condition']} ({ctx['ml_conf']*100:.0f}% confidence), while photographic analysis detected cutaneous signs consistent with {ctx['yolo_condition']}{region_str} ({ctx['yolo_conf']:.0f}% confidence)."
                )
            else:
                synthesis_sentences.append(
                    f"प्राथमिक बहु-स्रोत विश्लेषणात लक्षणांवरून संभाव्य {ctx['ml_condition']} आणि छायाचित्रावरून {ctx['yolo_condition']} ({ctx['yolo_conf']:.0f}% विश्वासार्हता) ची लक्षणे दिसत आहेत."
                )
        else:
            if not is_marathi:
                synthesis_sentences.append(
                    f"Preliminary clinical assessment indicates a pattern consistent with suspected {ctx['yolo_condition']}{region_str} ({ctx['yolo_conf']:.0f}% visual confidence)."
                )
            else:
                synthesis_sentences.append(
                    f"प्राथमिक तपासणीत संभाव्य {ctx['yolo_condition']} ({ctx['yolo_conf']:.0f}% विश्वासार्हता) चे संकेत दिसत आहेत."
                )
    elif ctx["has_ml_signal"] and ctx["ml_condition"]:
        if not is_marathi:
            synthesis_sentences.append(
                f"Preliminary symptom screening indicates a pattern consistent with suspected {ctx['ml_condition']} ({ctx['ml_conf']*100:.0f}% confidence)."
            )
        else:
            synthesis_sentences.append(
                f"नोंदवलेल्या लक्षणांवरून संभाव्य {ctx['ml_condition']} ({ctx['ml_conf']*100:.0f}% विश्वासार्हता) ची शक्यता आहे."
            )
    else:
        if not is_marathi:
            synthesis_sentences.append(
                "Preliminary screening indicates no strong or conclusive infectious disease pattern from the submitted observations alone."
            )
        else:
            synthesis_sentences.append(
                "प्राथमिक तपासणीत दिलेल्या नोंदींवरून कोणत्याही गंभीर संसर्गजन्य आजाराचे स्पष्ट संकेत आढळलेले नाहीत."
            )

    # 2. Add Agreements and Disagreements
    if agreements:
        synthesis_sentences.extend(agreements)

    synthesis_text = " ".join(synthesis_sentences)

    # Build Immediate Actions
    if not is_marathi:
        if ctx["risk_level"] in ["CRITICAL", "ELEVATED"]:
            actions = [
                "1. Isolate the affected animal immediately in a clean, dry, and well-ventilated enclosure away from the herd.",
                "2. Provide continuous access to fresh, clean drinking water and soft green fodder; strictly avoid unprescribed medications.",
                f"3. Implement stall vector control with neem-based repellent smoke or fly nets ({ctx['vector_risk']} vector risk environment)."
            ]
            vet_action = "📞 **VETERINARY ACTION:** Contact your local Veterinary Officer or Pashusakhi immediately for physical diagnosis and formal prescription."
        else:
            actions = [
                "1. Keep the animal under close observation for any emerging fever, appetite reduction, or abnormal behavior.",
                "2. Maintain strict cleanliness around feed and water troughs to prevent routine bacterial transmission.",
                "3. Ensure the animal has access to dry bedding and adequate hydration throughout the day."
            ]
            vet_action = "📞 **VETERINARY ACTION:** If symptoms worsen or new signs develop within 24–48 hours, request a visit from your local field veterinarian."
    else:
        if ctx["risk_level"] in ["CRITICAL", "ELEVATED"]:
            actions = [
                "१. बाधित जनावराला तात्काळ इतर जनावरांपासून वेगळे (विलगीकरणात) स्वच्छ व हवेशीर ठिकाणी ठेवा.",
                "२. जनावराला स्वच्छ पिण्याचे पाणी आणि मऊ चारा उपलब्ध करा; डॉक्टरांच्या सल्ल्याशिवाय कोणतेही औषध देऊ नका.",
                f"३. गोठ्यात डास आणि माश्यांच्या नियंत्रणासाठी कडुनिंबाचा धूर किंवा जाळीचा वापर करा (परिसरात {ctx['vector_risk']} कीटक जोखीम)."
            ]
            vet_action = "📞 **पशुवैद्यकीय संपर्क:** तात्काळ स्थानिक पशुवैद्यकीय अधिकारी किंवा पशुसखीशी संपर्क साधा."
        else:
            actions = [
                "१. जनावराचे खाणे-पिणे आणि हालचालींवर २४ तास बारकाईने लक्ष ठेवा.",
                "२. गोठ्यातील चारा आणि पाण्याच्या भांड्यांची नियमित स्वच्छता ठेवा.",
                "३. जनावराला पुरेसा आराम आणि पिण्यासाठी स्वच्छ पाणी द्या."
            ]
            vet_action = "📞 **पशुवैद्यकीय संपर्क:** लक्षणे वाढल्यास किंवा ताप आल्यास स्थानिक पशुवैद्यकीय दवाखान्याशी संपर्क साधा."

    return (
        f"{header}\n"
        f"{synthesis_text}\n\n"
        f"⚡ **{'IMMEDIATE SUPPORTIVE ACTIONS' if not is_marathi else 'तात्काळ घ्यावयाची काळजी'}:**\n"
        f"{chr(10).join(actions)}\n\n"
        f"{vet_action}"
    )


def generate_farmer_advisory(analysis_data: Dict[str, Any], language: str = "English") -> Dict[str, Any]:
    """
    Generates a synthesized, multi-stream veterinary decision-support advisory for farmers.
    Synthesizes farmer symptoms, YOLO vision lesions, IoT telemetry, microclimate vectors,
    and regional outbreak surge data into a single coherent narrative.
    """
    # 1. Standardize and extract all streams
    ctx = _extract_stream_context(analysis_data)

    # 2. Compute cross-stream agreements & discrepancies
    agreements = _analyze_stream_agreements(ctx)

    # 3. Construct rich LLM prompt
    prompt = _build_llm_prompt(ctx, agreements, language)

    # 4. Multi-provider LLM execution with graceful fallback
    providers = []
    if GEMINI_KEY_1:
        providers.append(("Gemini (Key 1)", lambda: _call_gemini(GEMINI_KEY_1, prompt)))
    if GEMINI_KEY_2:
        providers.append(("Gemini (Key 2)", lambda: _call_gemini(GEMINI_KEY_2, prompt)))
    if GROQ_KEY:
        providers.append((f"Groq ({GROQ_MODEL})", lambda: _call_groq(GROQ_KEY, GROQ_MODEL, prompt)))

    advisory_text = None
    used_provider = None

    for name, func in providers:
        try:
            logger.info(f"Attempting advisory generation using {name}...")
            advisory_text = func()
            if advisory_text and len(advisory_text.strip()) > 30:
                used_provider = name
                logger.info(f"Successfully generated advisory using {name}")
                break
        except Exception as e:
            logger.warning(f"Provider {name} failed: {e}. Trying next fallback...")

    # 5. Fallback to reasoned deterministic multi-stream synthesizer if LLM fails
    if not advisory_text:
        advisory_text = _generate_deterministic_advisory(ctx, agreements, language=language)
        used_provider = "Multi-Stream Deterministic Synthesizer"

    return {
        "language": language,
        "advisory": advisory_text,
        "provider_used": used_provider
    }
