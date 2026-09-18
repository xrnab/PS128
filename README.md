# 🐾 Maitri — AI-Powered Livestock Health Surveillance & Outbreak Intelligence Platform (PS128)

> **Maitri** (Problem Statement 128 / Smart India Hackathon) is an offline-first, multilingual livestock disease early warning, IoT collar surveillance, computer vision diagnostic, and veterinary telemedicine platform designed for rural livestock ecosystems (specifically tailored for Indian district veterinary hierarchies: **District → Block / Taluka → Village**).
>
> The system unites **Farmers**, **Field Agents (Pashumitras)**, **Veterinarians**, and **District Animal Husbandry Authorities** into a unified, fault-tolerant surveillance network powered by multi-stream risk analytics, computer vision lesion detection with automated photo rejection, live ESP32 IoT telemetry, toll-free Interactive Voice Response (IVR) simulation, and official Telegram bot alerting.

---

## 📑 Table of Contents
- [Executive Overview & Problem Statement](#-executive-overview--problem-statement)
- [System Architecture & Data Flow](#-system-architecture--data-flow)
- [Repository Structure](#-repository-structure)
- [Technology Stack](#-technology-stack)
- [Actor Roles & Portals](#-actor-roles--portals)
- [Core Engineering Subsystems](#-core-engineering-subsystems)
  - [1. Multi-Stream AI/ML Risk & Advisory Pipeline](#1-multi-stream-aiml-risk--advisory-pipeline)
  - [2. Computer Vision Lesion Detection & Rejection Pipeline](#2-computer-vision-lesion-detection--rejection-pipeline)
  - [3. End-to-End IoT Collar Telemetry & Live Monitoring](#3-end-to-end-iot-collar-telemetry--live-monitoring)
  - [4. Interactive Voice Response (IVR) Phone Line Simulator](#4-interactive-voice-response-ivr-phone-line-simulator)
  - [5. Offline-First PWA Synchronization & Account Isolation](#5-offline-first-pwa-synchronization--account-isolation)
  - [6. Veterinarian Clinical Workstation & State Machine](#6-veterinarian-clinical-workstation--state-machine)
  - [7. Real-Time Telegram Notification Engine](#7-real-time-telegram-notification-engine)
  - [8. Multilingual Architecture & Apple Liquid Glass Design System](#8-multilingual-architecture--apple-liquid-glass-design-system)
  - [9. Administrative Governance & Append-Only Audit Ledger](#9-administrative-governance--append-only-audit-ledger)
- [Relational Data Model & Integrity Rules](#-relational-data-model--integrity-rules)
- [API Reference & Endpoint Contracts](#-api-reference--endpoint-contracts)
- [Environment Configuration](#-environment-configuration)
- [Getting Started & Local Setup](#-getting-started--local-setup)
- [Testing & Triple Verification Gate](#-testing--triple-verification-gate)
- [🤖 Instructions & Invariants for AI Coding Agents](#-instructions--invariants-for-ai-coding-agents)
- [📜 License](#-license)

---

## 🚨 Executive Overview & Problem Statement

In rural agrarian ecosystems:
1. **Delayed Outbreak Detection**: Livestock epidemics (e.g., Lumpy Skin Disease, Foot & Mouth Disease, Anthrax, Black Quarter) spread rapidly across contiguous village clusters before district epidemiologists detect a surge.
2. **Intermittent Rural Connectivity**: Farmers and field agents operate in remote, low-bandwidth, or completely offline rural areas where traditional cloud applications fail.
3. **Information Silos**: Field observations, lab diagnostic samples, IoT sensor streams, and microclimate vectors are disconnected, preventing timely biosecurity quarantine and contact tracing.
4. **Digital Literacy & Accessibility Barriers**: Rural farmers often lack smartphones or stable internet, requiring alternative communication channels such as voice telephony (IVR) and native language support (Marathi, Hindi).
5. **Clinical Safety Risks**: Unguarded AI tools often hallucinate drug dosages or provide dangerous prescriptions to farmers without veterinary oversight.

### The Maitri Solution
Maitri provides an end-to-end, resilient platform featuring:
- **Offline-First Field Reporting**: Local persistence in IndexedDB with raw photo binary blob retention and automatic background synchronization via the Web Locks API when connectivity resumes.
- **Multi-Stream Risk Aggregation**: Combines species-aware symptom classification, YOLO visual lesion inference, real-time IoT temperature/activity anomalies, Open-Meteo microclimate vector breeding risk, and epidemiological Z-score surge modeling into a calibrated score (0–100).
- **Computer Vision with Image Rejection**: YOLOv8 models for bovine and pet lesion detection coupled with an automated rejection filter that rejects non-animal or low-quality photos.
- **ESP32 IoT Collar Telemetry**: Continuous biometric streaming for animal body temperature and 3-axis motion activity indexing with live monitoring dashboards and automated health report autofill.
- **Simulated Interactive Voice Response (IVR)**: A toll-free voice hotline (1800-PASHU / 1962) simulation supporting Marathi & English DTMF phone trees, speech recording, and automated case creation.
- **Clinical Safety Guardrails**: Strict separation between AI decision-support signals and licensed veterinary diagnoses. The AI assistant offers supportive guidance only and is prohibited from prescribing scheduled veterinary medicines.
- **Official Telegram Channel**: Instant biosecurity alerts delivered through `@pashu_raksha_bot` directly to mobile devices without requiring the web app to be open.
- **Full Mobile Responsiveness**: Liquid Glass UI optimized down to 375px mobile screens with touch targets $\ge 44\text{px}$, dark/light modes, and multilingual localization (`next-intl`).

---

## 📐 System Architecture & Data Flow

```mermaid
flowchart TD
    subgraph Edge ["Field Edge & Data Ingestion"]
        ESP["ESP32 Collar Hardware (Telemetry: Temp, Activity, Battery)"]
        IVR["Toll-Free Phone Line Simulator (/farmer/ivr • 1962 / 1800-PASHU)"]
        Farmer["Farmer (Web / Mobile PWA - English & Marathi)"]
        Agent["Field Agent / Pashumitra (Offline-First Mobile PWA)"]
    end

    subgraph ClientLayer ["Maitri Next.js 16 Client (web/)"]
        IDB[("IndexedDB (Offline Queue & Photo Blobs)")]
        Sync["Background Sync Worker (Web Locks API)"]
        PWA["React 19 Server & Client Components (Tailwind v4 / Liquid Glass)"]
        Locale["LocaleProvider & ThemeProvider (next-intl / Dark Mode)"]
    end

    subgraph WebServer ["Maitri Application Server (web/)"]
        AuthGuard["Clerk Auth & RBAC Metadata Sync"]
        ServerActions["Role-Guarded Server Actions"]
        Prisma["Prisma ORM 7 (@prisma/adapter-pg)"]
        Storage["Vercel Blob (Private Media Store)"]
        IoTRoutes["IoT Telemetry Ingestion (/api/iot/telemetry/[animalId])"]
    end

    subgraph BackendEngine ["FastAPI Microservice (backend/)"]
        MasterAPI["POST /api/analyze (Master Engine)"]
        IoTRoute["POST /api/iot/telemetry (Collar Telemetry Ingestion)"]
        YoloEngine["YOLO Vision Models (model_cow.pt, model_pet.pt)"]
        VisionFilter["Image Quality & Non-Animal Rejection Filter"]
        MLPredictor["Species-Aware ML Pipeline (Scikit-Learn)"]
        WeatherAPI["Open-Meteo API (Microclimate Vector Risk)"]
        TrendEngine["Surge & Z-Score Trend Engine"]
        GenAI["Dual LLM Advisory (Gemini 3.8 Flash / Groq GPT-OSS-120B)"]
        TgBot["Telegram Dispatch & Webhook Engine"]
    end

    subgraph Database ["Authoritative Datastore"]
        Postgres[("Neon PostgreSQL (16+ Relational Tables)")]
    end

    subgraph External ["External Services"]
        TgAPI["Telegram Bot API (@pashu_raksha_bot)"]
        Meteo["Open-Meteo Climate Service"]
    end

    %% Edge Connections
    ESP -->|HTTP POST JSON| IoTRoute
    ESP -->|HTTP POST JSON| IoTRoutes
    IVR --> ServerActions
    Farmer --> PWA
    Agent --> PWA
    PWA <--> IDB
    IDB --> Sync
    Sync --> ServerActions
    PWA --> ServerActions
    PWA --> Locale

    %% Web Server Connections
    ServerActions --> AuthGuard
    ServerActions --> Prisma
    IoTRoutes --> Prisma
    Prisma --> Postgres
    ServerActions --> Storage
    ServerActions -->|HTTP POST| MasterAPI

    %% Backend Engine Connections
    MasterAPI --> YoloEngine
    YoloEngine --> VisionFilter
    MasterAPI --> MLPredictor
    MasterAPI --> WeatherAPI
    WeatherAPI --> Meteo
    MasterAPI --> TrendEngine
    MasterAPI --> GenAI
    ServerActions -->|Dispatches Events| TgBot
    TgBot --> TgAPI
```

---

## 📂 Repository Structure

```
PS128/
├── backend/                       # FastAPI AI/ML microservice
│   ├── app/
│   │   ├── config.py              # Application settings (Pydantic Settings)
│   │   ├── main.py                # FastAPI initialization & route registration
│   │   ├── ml_artifacts/          # Trained models (YOLO .pt, Scikit-learn .pkl)
│   │   │   ├── model_cow.pt       # YOLO weights for bovine lesion inspection
│   │   │   ├── model_pet.pt       # YOLO weights for pet lesion inspection
│   │   │   ├── species_aware_pipeline.pkl  # Multi-species symptom diagnosis
│   │   │   └── vectorizer.pkl     # Symptom TF-IDF / count vectorizer
│   │   ├── routes/                # FastAPI endpoint routers
│   │   │   ├── advisory.py        # GenAI farmer advisory endpoint
│   │   │   ├── analytics.py       # District epidemiological analytics
│   │   │   ├── health.py          # Liveness & readiness probes
│   │   │   ├── iot.py             # IoT telemetry ingestion & anomaly checks
│   │   │   ├── master.py          # Unified POST /api/analyze endpoint
│   │   │   ├── predict.py         # Visual lesion inference endpoint
│   │   │   ├── telegram.py        # Telegram webhook handler & chat linking
│   │   │   └── weather.py         # Microclimate vector breeding risk endpoint
│   │   ├── schemas/               # Pydantic request & response schemas
│   │   ├── services/              # Business logic & external service clients
│   │   │   ├── advisory_service.py  # Dual-LLM advisory generator
│   │   │   ├── master_service.py    # Multi-stream risk aggregator
│   │   │   ├── ml_service.py        # Symptom model runner
│   │   │   ├── risk_engine.py       # Calibrated risk weight engine
│   │   │   ├── telegram_client.py   # Telegram Bot API client
│   │   │   ├── telegram_db.py       # PostgreSQL persistence for Telegram
│   │   │   ├── trend_service.py     # Z-score outbreak calculation
│   │   │   ├── vision_service.py    # Ultralytics YOLO inference & quality filter
│   │   │   └── weather_service.py   # Open-Meteo client
│   │   └── utils/                 # Logging & helper routines
│   ├── Dockerfile                 # Multi-stage production container build
│   ├── requirements.txt           # Python dependencies
│   ├── render.yaml                # Render cloud deployment blueprint
│   └── tests/                     # Pytest test cases
│       ├── test_telegram_webhook.py
│       └── test_vision_rejection.py
│
├── web/                           # Next.js 16 full-stack PWA
│   ├── app/                       # Next.js App Router
│   │   ├── (auth)/                # Clerk authentication routes (sign-in, sign-up)
│   │   ├── admin/                 # Admin cockpit, audit log, geography CRUD
│   │   ├── agent/                 # Field Agent (Pashumitra) assistance queue & report
│   │   ├── authority/             # District Authority GIS heatmap, alerts & reports
│   │   ├── dashboard/             # Role-based workspace redirector
│   │   ├── farmer/                # Farmer portal: herd registry, reports, IoT, IVR
│   │   │   ├── iot/               # Live IoT collar telemetry monitor
│   │   │   ├── ivr/               # Simulated toll-free phone line interface
│   │   │   ├── report/            # Multi-step health report wizard
│   │   │   └── talk/              # Farmer Talk AI assistant
│   │   ├── vet/                   # Veterinarian clinical triage & case dossier
│   │   │   ├── cases/             # Full case repository & dossier
│   │   │   ├── follow-ups/        # Scheduled clinical follow-up tracker
│   │   │   ├── profile/           # Practitioner credentials & profile
│   │   │   └── samples/           # Diagnostic lab sample tracker table
│   │   ├── api/                   # Server endpoints (media proxy, storage upload, IoT)
│   │   │   └── iot/telemetry/     # Animal collar telemetry ingestion routes
│   │   ├── layout.tsx             # Root layout with navigation & branding
│   │   └── page.tsx               # Public landing page (Apple Liquid Glass design)
│   ├── components/                # Reusable React UI components
│   │   ├── admin/                 # Audit tables, role review, geography forms
│   │   ├── agent/                 # Field agent assistance cards, visit flows
│   │   ├── authority/             # GIS Leaflet heatmaps, alert dispatchers, metrics
│   │   ├── farmer/                # Health report wizards, FarmerChatBox, IVR simulator
│   │   ├── layout/                # Navbar, MobileNav bottom dock, LocaleProvider
│   │   ├── motion/                # Micro-animations, Hero 3D tilt, Role ecosystem
│   │   ├── offline/               # SyncStatusBadge, offline indicators
│   │   ├── reporting/             # IoTInput, PhotoCapture, SymptomSelector, ResultFlow
│   │   ├── site/                  # HelplineModal (1962), RecordModal
│   │   ├── theme/                 # ThemeToggle, ThemeProvider (dark/light)
│   │   ├── ui/                    # Base design system components
│   │   └── vet/                   # Clinical dossiers, triage cards, SampleTrackerTable
│   ├── hooks/                     # Custom React hooks (useOfflineSync, useLocation)
│   ├── lib/                       # Core application utilities
│   │   ├── actions/               # Server Actions (cases, assistance, vet, admin, ivr)
│   │   ├── api/                   # Backend HTTP clients (backend-client.ts)
│   │   ├── auth/                  # Clerk RBAC authorization guards
│   │   ├── iot/                   # IoT telemetry thresholds & utility helpers
│   │   ├── offline/               # IndexedDB manager, sync worker, locks
│   │   └── storage/               # Vercel Blob private media storage
│   ├── messages/                  # next-intl translation dictionaries
│   │   ├── en.json                # English strings (full app localization)
│   │   └── mr.json                # Marathi strings (full app localization)
│   ├── prisma/
│   │   ├── schema.prisma          # PostgreSQL relational database schema
│   │   └── seed.ts                # Deterministic database seeder
│   ├── public/                    # Static assets, PWA manifest, service worker
│   ├── tests/                     # Vitest test suite (40 test files covering all modules)
│   └── package.json               # Node dependencies & npm scripts
│
├── esp32/                         # IoT Firmware
│   └── ps128_iot.ino              # Arduino C++ firmware for ESP32 telemetry
│
├── docs/                          # Architecture & integration guides
│   └── TELEGRAM_INTEGRATION.md    # Official Telegram bot architecture & specs
│
├── render.yaml                    # Top-level deployment manifest
└── README.md                      # Primary project documentation (this file)
```

---

## 🛠️ Technology Stack

| Component | Technology | Description |
|---|---|---|
| **Web Frontend** | Next.js 16 (App Router), React 19, TypeScript | Server & Client components, Turbopack, PWA service worker |
| **Styling & Design System** | Tailwind CSS v4 + Apple Liquid Glass | Bespoke glassmorphism, depth mesh layers, 375px+ responsive layouts |
| **Localization** | `next-intl` (English & Marathi) | Native server & client multilingual dictionaries for rural accessibility |
| **Theme System** | Tailored Dark & Light Modes | Hardware-accelerated GPU mesh gradients, zero-flash hydration scripts |
| **Authentication** | Clerk (`@clerk/nextjs`) | Custom metadata RBAC (`role`, `status`), session sync |
| **Database & ORM** | Neon Serverless PostgreSQL + Prisma ORM 7 | 16+ relational models, `@prisma/adapter-pg` pooler |
| **Media Storage** | Vercel Blob (`@vercel/blob`) | Server-authorized private access for animal lesion photos |
| **AI Backend Microservice** | FastAPI 0.115, Uvicorn, Python 3.12 | High-throughput asynchronous REST API |
| **Computer Vision** | Ultralytics YOLOv8 (`model_cow.pt`, `model_pet.pt`) | Bovine & pet lesion detection with automated photo rejection |
| **Tabular ML** | Scikit-Learn, Pandas, NumPy | Multi-species symptom-to-disease probabilistic inference |
| **Generative AI** | Google Gemini 3.8 Flash with Groq fallback | Dual-provider advisory generation (English, Marathi, Hindi) |
| **Microclimate Vectors** | Open-Meteo REST API | Temperature, humidity, and rainfall vector breeding risk |
| **GIS & Spatial Mapping** | Leaflet 1.9, React-Leaflet | Live cluster visualization, multi-layer filters & GPS pin |
| **Offline Storage** | IndexedDB + Web Locks API | Offline reports queue with raw binary photo blob retention |
| **Real-Time Alerting** | Telegram Bot API (`@pashu_raksha_bot`) | Biosecurity broadcasts and role-specific alerts |
| **IoT Hardware** | ESP32 (Arduino C++) | Telemetry client reporting temperature, activity & battery |
| **Testing** | Vitest 5, Testing Library, Pytest | 40 frontend test suites + backend webhook & vision tests |

---

## 👥 Actor Roles & Portals

Maitri enforces strict **Role-Based Access Control (RBAC)** across five distinct roles:

```
                  ┌─────────────────────────────────────┐
                  │          Super Admin (CLI)          │
                  │   System Governance & Audit Log     │
                  └──────────────────┬──────────────────┘
                                     │ Approves Authorities
                                     ▼
                  ┌─────────────────────────────────────┐
                  │    District Authority (/authority)  │
                  │ GIS Heatmap, Biosecurity & Approval │
                  └──────────┬──────────────────────────┘
                             │ Approves Agents & Vets
              ┌──────────────┴──────────────┐
              ▼                             ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│     Veterinarian (/vet)   │ │  Field Agent (/agent)     │
│ Clinical Triage & Dossier │ │ Village Assistance Queue  │
└─────────────┬─────────────┘ └─────────────┬─────────────┘
              │                             │
              └──────────────┬──────────────┘
                             ▼
              ┌───────────────────────────┐
              │      Farmer (/farmer)     │
              │  Animal Records & Report  │
              └───────────────────────────┘
```

### 1. Farmer (`/farmer`)
- **Multilingual Support**: English and Marathi (`mr`) language support via `next-intl` tailored for rural accessibility.
- **Animal Registry**: Manage individual farm animals with unique ear-tag IDs, species, breed, and vaccination gap history.
- **Health Reporting Wizard (`/farmer/report`)**: Offline-capable reporting wizard capturing symptoms, duration, affected counts, and photos. Includes **IoT Sensor Integration** (`IoTInput.tsx`) to pull live biometric sensor readings directly into the case report.
- **IoT Collar Telemetry Monitor (`/farmer/iot`)**: Real-time biometric dashboard displaying body temperature, 3-axis motion activity, battery levels, and hyperthermia/lethargy alerts.
- **Interactive Voice Response (IVR) Simulator (`/farmer/ivr`)**: Simulated toll-free voice hotline (1800-PASHU / 1962) allowing farmers to report illnesses via phone tree navigation, DTMF touchtones, and recorded voice notes.
- **Farmer Talk AI (`FarmerChatBox`)**: Context-grounded assistant that answers questions using the animal's exact medical history under strict non-prescriptive safety guardrails.

### 2. Field Agent / Pashumitra (`/agent`)
- **Territory Scoping**: Automatically scoped by assigned district, block (taluka), or village cluster.
- **Assistance Queue**: Receives physical inspection requests from farmers who need help with diagnostic photos or symptom checks.
- **Optimistic Concurrency**: Timestamp-based status updates (`expectedUpdatedAt`) prevent conflicting updates from multiple agents on shared devices.
- **Inspection Recording**: Captures GPS coordinates, temperature measurements, and photo evidence in the field.

### 3. Licensed Veterinarian (`/vet`)
- **Triage Queue (`/vet`)**: Cases ranked automatically by severity (`CRITICAL` > `HIGH` > `ELEVATED` > `MEDIUM` > `LOW`).
- **Clinical Case Dossier (`/vet/cases/[caseId]`)**: Comprehensive view of symptoms, IoT vitals, YOLO lesion detections, and microclimate risk.
- **Diagnostic Sample Tracker (`/vet/samples`)**: Full lifecycle management for lab specimens (`COLLECTED` → `SENT` → `RESULT_PENDING` → `RESULT_RECEIVED`).
- **Scheduled Follow-up Visits (`/vet/follow-ups`)**: Calendar and visit tracker for re-examining quarantined or recovering livestock.
- **Clinical Governance**: Diagnostic confirmation, prescription recording, and state machine transitions.

### 4. District Animal Husbandry Authority (`/authority`)
- **GIS Surveillance Heatmap**: Live spatial visualization of disease outbreaks using OpenStreetMap raster tiles with micro-offsetting for co-located village cases and multi-layer toggles (Farms, Cases, Alerts, Vets, Agents, Visits).
- **Village Cluster Analysis Table**: High-density 8-column analytical ledger displaying village case totals, risk indices, attack rates, and primary disease drivers with mobile horizontal scroll.
- **Credential Governance (`/authority/approvals`)**: Reviews and approves pending `FIELD_AGENT` and `VETERINARIAN` registrations within their district.
- **Official Data Exports (`/authority/reports`)**: Generates jurisdiction-scoped RFC 4180 CSVs (with UTF-8 BOM) and zero-dependency PDF 1.4 reports.
- **Biosecurity Broadcasts**: Triggers emergency alerts and biosecurity containment warnings to farmers and field agents.

### 5. System Administrator (`/admin`)
- **Bootstrap Security**: The initial administrator can only be provisioned via an out-of-band CLI command (`npx tsx scripts/bootstrap-admin.ts <clerkUserId>`). No self-service registration route exists.
- **Append-Only Audit Ledger (`/admin/audit-log`)**: Immutable record of every administrative and governance action with automatic redaction of sensitive credentials.
- **Master Geography Hierarchy (`/admin/geography`)**: Full CRUD management of Districts, Blocks, and Villages with strict parent validation to prevent orphaned records.

---

## ⚙️ Core Engineering Subsystems

### 1. Multi-Stream AI/ML Risk & Advisory Pipeline
The master analysis engine ([`backend/app/services/master_service.py`](file:///d:/PS128/backend/app/services/master_service.py)) processes multi-modal inputs via `POST /api/analyze`:

```
Input Stream                     Processing Component            Risk Output
─────────────────────────────────────────────────────────────────────────────
Species & Symptoms            → Scikit-Learn Model            → Disease & Conf (0–100%)
Lesion Photograph             → Ultralytics YOLOv8            → Visual Lesions (+25 pts)
IoT Temperature & Activity    → Threshold & Baseline Model    → Anomalies (+25 pts)
Latitude & Longitude          → Open-Meteo Climate API        → Vector Risk (+10 pts)
District Weekly History       → Z-Score Statistical Model     → Outbreak Spike (+10 pts)
─────────────────────────────────────────────────────────────────────────────
                                Master Weighted Engine        → Unified Score (0–100)
                                                                 Level: CRITICAL / ELEVATED / LOW
                                Dual LLM (Gemini 3.8 / Groq)   → Multi-Lingual Advisory
```

- **Outbreak Z-Score Formula**:
  $$\mu = \frac{1}{N-1}\sum_{i=1}^{N-1} C_i, \quad \sigma = \sqrt{\frac{1}{N-1}\sum_{i=1}^{N-1}(C_i - \mu)^2}$$
  $$Z = \frac{C_{\text{latest}} - \mu}{\sigma} \quad \implies \quad \text{Spike Triggered if } Z > 2.5$$
- **Dual LLM Failover**: Tries primary Google Gemini 3.8 Flash first. If throttled (HTTP 429) or unreachable, it falls back seamlessly to Groq `openai/gpt-oss-120b`.

### 2. Computer Vision Lesion Detection & Rejection Pipeline
- Models located at [`backend/app/ml_artifacts/`](file:///d:/PS128/backend/app/ml_artifacts/):
  - `model_cow.pt`: Detects bovine skin nodules, ocular discharge, foot lesions, and lumpy lesions.
  - `model_pet.pt`: Detects dermatological issues in small companion animals.
- **Automated Image Quality & Non-Animal Rejection Filter**:
  - Validates image dimensions, blurriness/sharpness index, and verifies animal content.
  - Rejects irrelevant photos (documents, landscapes, human faces, blank images) with descriptive error messages.
  - Verified by comprehensive test suites: `test_vision_rejection.py` and `photo_rejection_submit_blocking.test.tsx`.

### 3. End-to-End IoT Collar Telemetry & Live Monitoring
Maitri provides end-to-end telemetry from hardware edge to cloud dashboard:
- **Firmware ([`esp32/ps128_iot.ino`](file:///d:/PS128/esp32/ps128_iot.ino))**: Samples body temperature and 3-axis accelerometer data.
- **Biometric Anomaly Thresholds**:
  - **Hyperthermia**: Body temperature $> 39.5^\circ\text{C}$ (flagged for bovine fever).
  - **Hypothermia**: Body temperature $< 37.5^\circ\text{C}$.
  - **Lethargy**: Motion activity index $< 30$ (indicating recumbency or weakness).
- **Live Monitoring Dashboard (`/farmer/iot`)**: Real-time biometric streaming, battery indicators, and direct simulation controls for testing.
- **Health Wizard Auto-Fill (`IoTInput.tsx`)**: Integrates seamlessly with the farmer reporting form, allowing farmers to pull live temperature and collar data with one tap.

### 4. Interactive Voice Response (IVR) Phone Line Simulator
Designed for rural farmers without smartphones or active internet access ([`web/app/farmer/ivr/`](file:///d:/PS128/web/app/farmer/ivr/)):
- **Toll-Free Number Simulation**: Toll-Free 1800-PASHU (1962) emergency veterinary assistance.
- **Dual Language Support**: Interactive DTMF tree in **Marathi (मराठी)** and **English**.
- **Automated Workflow**:
  1. Welcome greeting and language selection.
  2. Ear tag number voice or keypad entry.
  3. Spoken symptom description recording.
  4. Instant AI triage categorization (Critical / Routine).
  5. Automatic creation of a structured `Case` record in PostgreSQL with audio playback.

### 5. Offline-First PWA Synchronization & Account Isolation
Engineered to handle intermittent rural network connectivity ([`web/lib/offline/`](file:///d:/PS128/web/lib/offline/)):
- **Account Isolation**: Every queued item is permanently tagged with the active user's `clerkUserId`. Items are never synced to another account on a shared field device.
- **Raw Binary Persistence**: When offline, animal photos are held as raw `Blob` objects in IndexedDB and uploaded to persistent storage only when network connectivity is restored.
- **Concurrency Control**: Synchronization runs inside a Web Locks API block (`navigator.locks.request("maitri_queue_sync_lock")`) across browser tabs.
- **Retry Capping**: Failed sync attempts increment a counter up to `MAX_AUTO_RETRIES = 5`. Beyond this threshold, items enter `NEEDS_MANUAL_RETRY` status to protect network resources while preventing silent data loss.

### 6. Veterinarian Clinical Workstation & State Machine
The clinical workflow at `/vet` manages health cases through an explicit state machine:

```mermaid
stateDiagram-v2
    [*] --> PENDING_REVIEW
    PENDING_REVIEW --> UNDER_EXAMINATION : Vet Opens Case Dossier
    UNDER_EXAMINATION --> LAB_REFERRAL : Diagnostic Referral Needed
    UNDER_EXAMINATION --> CONFIRMED : Diagnosis Confirmed
    UNDER_EXAMINATION --> CLOSED_HARMLESS : Non-Critical Case Resolved
    LAB_REFERRAL --> CONFIRMED : Lab Results Received
    LAB_REFERRAL --> CLOSED_HARMLESS : Lab Results Negative
    CONFIRMED --> [*]
    CLOSED_HARMLESS --> [*]
```

- **Optimistic Concurrency**: Every case update verifies `expectedUpdatedAt` against the database timestamp to prevent conflicting updates from multiple clinicians.
- **Atomic Transactions**: Referring a case to a laboratory creates a diagnostic `Sample` and updates the `Case` status in a single Prisma `$transaction`.
- **Clinical Safety Separation**: AI predictions are clearly marked as decision-support signals ("Preliminary AI Assessment") and separated from confirmed veterinary records.

### 7. Real-Time Telegram Notification Engine
Integrates the official Telegram Bot API ([`docs/TELEGRAM_INTEGRATION.md`](file:///d:/PS128/docs/TELEGRAM_INTEGRATION.md)) via `@pashu_raksha_bot`:
- **Account Linking**: Generates cryptographically secure, time-limited tokens via deep links (`https://t.me/pashu_raksha_bot?start=<token>`).
- **Webhook Security**: Webhook payloads are verified using SHA-256 HMAC signatures matching `X-Telegram-Bot-Api-Secret-Token`.
- **Fault-Tolerant Dispatch**: Dispatches run asynchronously outside of core database transactions. If Telegram encounters an outage, the database record remains intact.
- **Idempotency Guarantee**: Deliveries are tracked with a database unique constraint (`@@unique([notificationId, telegramConnectionId])`), preventing duplicate alert messages.

### 8. Multilingual Architecture & Apple Liquid Glass Design System
- **Next-Intl Localization**: Native server-side and client-side localization across English (`en`) and Marathi (`mr`). Translations cover navigation, role labels, symptom vocabularies, emergency triage, and landing page content.
- **Apple Liquid Glass Materials**: Elegant glassmorphism with high-contrast typography, multi-layered depth mesh backgrounds, and subtle micro-animations.
- **Dark / Light Theme System**: Integrated `ThemeToggle` with localStorage persistence and zero-flicker client hydration scripts.
- **Full Mobile Responsiveness**: All portals (Landing, Farmer, Field Agent, Vet, Authority, Admin) are fully responsive across **375px** (small phone), **768px** (tablet), and desktop displays with touch targets $\ge 44\text{px}$ and zero horizontal overflow.
- **Dock Navigation (`MobileNav.tsx`)**: Bottom navigation capsule with safe-area padding (`pb-safe`) for iOS and Android web apps.

### 9. Administrative Governance & Append-Only Audit Ledger
- **CLI Bootstrap**: Run `npx tsx scripts/bootstrap-admin.ts <clerkUserId>` to initialize an administrator.
- **Append-Only Ledger**: The `AuditLog` table records actor IDs, target IDs, previous state, and new state. It does not permit updates or deletions.
- **Automatic Redaction**: Sensitive keys (`password`, `token`, `secret`, `apiKey`) are replaced with `"[REDACTED]"` before write.
- **Integrity**: Deactivating or removing a user sets the audit log foreign keys to `NULL`, preserving the audit history.

---

## 🗄️ Relational Data Model & Integrity Rules

```mermaid
erDiagram
    District ||--o{ Block : contains
    Block ||--o{ Village : contains
    Village ||--o{ Farm : contains
    User ||--o{ Farm : manages
    Farm ||--o{ Herd : houses
    Herd ||--o{ Animal : groups
    Animal ||--o{ Case : generates
    Animal ||--o{ VaccinationRecord : receives
    Animal ||--o{ TreatmentRecord : receives
    Animal ||--o{ AssistanceRequest : requests
    Animal ||--o{ ChatConversation : discusses
    Case ||--o{ Sample : refers
    User ||--o{ TelegramConnection : links
    User ||--o{ InAppNotification : receives
    User ||--o{ AuditLog : records
```

### Deletion Integrity Safeguards (F-10)
An animal cannot be removed if historical health records exist. The deletion procedure in `deleteFarmerAnimal` validates six relationships before allowing deletion:
1. `cases` (Clinical and health reports)
2. `vaccinations` (Immunization history)
3. `treatments` (Prescriptions and treatments)
4. `assistanceRequests` (Field inspection visits)
5. `veterinaryReports` (Formal veterinary assessments)
6. `conversations` (Farmer chat history)

---

## 📡 API Reference & Endpoint Contracts

### 1. Backend AI Engine (FastAPI — Port 8000)

#### `POST /api/analyze` (Master Analysis Engine)
Consolidates all diagnostic streams into a single assessment:
```json
// Request Payload
{
  "latitude": 19.0760,
  "longitude": 72.8777,
  "language": "English",
  "health_report": {
    "animal": "Cow",
    "symptoms": ["Fever", "Nasal Discharge", "Skin Lesions"],
    "duration_days": 3,
    "affected_count": 2,
    "herd_size": 12,
    "mortality_count": 0
  },
  "iot_telemetry": {
    "animal_id": "ESP32-COW-01",
    "temperature": 40.2,
    "activity": 18
  },
  "yolo_vision_analysis": null,
  "historical_weekly_cases": [10, 12, 11, 14, 13, 42]
}
```
```json
// Response Payload
{
  "overall_risk_score": 85,
  "overall_risk_level": "CRITICAL",
  "disease_prediction": {
    "suspected_condition": "Lumpy Skin Disease",
    "confidence": 0.88
  },
  "yolo_vision_analysis": null,
  "iot_telemetry_analysis": {
    "animal_id": "ESP32-COW-01",
    "temperature": 40.2,
    "activity_index": 18,
    "has_anomaly": true,
    "anomalies": ["Hyperthermia: 40.2°C", "Lethargy: Activity index 18"]
  },
  "weather_analysis": {
    "temperature": 31.4,
    "relative_humidity": 78,
    "vector_breeding_risk": "HIGH"
  },
  "outbreak_surge_analysis": {
    "latest_cases": 42,
    "historical_mean": 12.0,
    "z_score": 18.97,
    "is_outbreak_spike": true
  },
  "farmer_advisory": {
    "language": "English",
    "summary": "Urgent attention required: The animal exhibits signs of high fever, lethargy, and an elevated outbreak risk in your area.",
    "isolation_recommended": true,
    "advisory_notes": "Isolate the affected cow immediately to protect the herd. Ensure continuous hydration and avoid unverified medications until the veterinary team completes its inspection."
  }
}
```

#### Additional Backend Endpoints
- `GET /api/health` — Service liveness probe. Returns `{ "status": "healthy" }`.
- `POST /api/predict` — Runs YOLO inference on uploaded animal photographs with automated non-animal image rejection.
- `POST /api/iot/telemetry` — Ingests live biometric telemetry from ESP32 collars.
- `POST /api/advisory` — Generates localized advisories from health summaries.
- `POST /api/telegram/webhook` — Receives and verifies incoming Telegram Bot updates.

### 2. Next.js Web Application Endpoints
- `GET /api/iot/telemetry/[animalId]` — Returns the latest biometric readings and sensor logs for an animal.
- `POST /api/iot/telemetry/[animalId]` — Ingests telemetry directly via web server proxy.
- `GET /api/media/photo/[caseId]` — Authenticated proxy for private animal lesion photos.

---

## 🔑 Environment Configuration

### 1. Web Application (`web/.env.local`)
```bash
# Neon PostgreSQL Database (Pooled & Direct connections)
DATABASE_URL="postgresql://user:password@ep-sample-pooler.region.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://user:password@ep-sample.region.aws.neon.tech/neondb?sslmode=require"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_sample"
CLERK_SECRET_KEY="sk_test_sample"
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL="/dashboard"
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL="/onboarding"

# Vercel Blob Private Media Storage (SERVER-ONLY)
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_sample_token"

# FastAPI AI Engine Endpoint (SERVER-ONLY)
AI_ENGINE_URL="http://localhost:8000"

# Telegram Bot Integration (SERVER-ONLY)
TELEGRAM_BOT_TOKEN="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
TELEGRAM_BOT_USERNAME="pashu_raksha_bot"
TELEGRAM_WEBHOOK_SECRET="your_webhook_secret_phrase"
TELEGRAM_API_BASE_URL="https://api.telegram.org"

# GenAI Farmer Assistant (SERVER-ONLY)
GEMINI_API_KEY_1="AIzaSy_primary_key"
GEMINI_API_KEY_2="AIzaSy_secondary_key"
GEMINI_MODEL="gemini-3.8-flash"
GROQ_API_KEY="gsk_sample_key"
GROQ_MODEL="openai/gpt-oss-120b"
```

### 2. Backend Engine (`backend/.env`)
```bash
PROJECT_NAME="PS128 Livestock Health & Outbreak Intelligence API"
VERSION="1.0.0"
ENVIRONMENT="development"
DEBUG=True
API_V1_STR="/api"
ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
HOST="0.0.0.0"
PORT=8000
FRONTEND_URL="http://localhost:3000"

# Database Connection (Same PostgreSQL database)
DATABASE_URL="postgresql://user:password@ep-sample-pooler.region.aws.neon.tech/neondb?sslmode=require"

# Telegram Bot Credentials
TELEGRAM_BOT_TOKEN="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
TELEGRAM_BOT_USERNAME="pashu_raksha_bot"
TELEGRAM_WEBHOOK_SECRET="your_webhook_secret_phrase"
TELEGRAM_WEBHOOK_URL="https://your-domain.com/api/telegram/webhook"
TELEGRAM_API_BASE_URL="https://api.telegram.org"

# AI Provider Credentials
GEMINI_API_KEY_1=""
GEMINI_API_KEY_2=""
GEMINI_MODEL="gemini-3.8-flash"
GROQ_API_KEY=""
GROQ_MODEL="openai/gpt-oss-120b"
```

---

## 🚀 Getting Started & Local Setup

### Prerequisites
- **Node.js**: `v20.x` or `v22.x`
- **Python**: `v3.11` or `v3.12`
- **Package Managers**: `npm` and `pip`
- **Database**: PostgreSQL (or a free [Neon](https://neon.tech) serverless database)

---

### Step 1: Run the Backend Microservice
```bash
# Navigate to the backend directory
cd backend

# Create and activate a virtual environment
python -m venv venv
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On Linux/macOS:
source venv/bin/activate

# Install dependencies (use CPU PyTorch to save bandwidth & disk)
pip install --upgrade pip
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt

# Create your .env file
cp .env.example .env

# Start the development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- API Interactive Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health Check: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

### Step 2: Run the Next.js Web Application
```bash
# Navigate to the web directory
cd ../web

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
# (Edit .env.local to supply your real DATABASE_URL and Clerk keys)

# Generate Prisma Client & push schema to database
npx prisma generate
npx prisma db push

# Seed the database with sample districts, villages, and demo accounts
npx prisma db seed

# Start the Next.js development server
npm run dev
```
- Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Step 3: Bootstrap the First Administrator
Because there is no public self-service registration route for administrators, promote your initial user via the CLI script:
```bash
# From within the web/ directory:
npx tsx scripts/bootstrap-admin.ts <clerkUserId>
```

---

## 🧪 Testing & Triple Verification Gate

The platform mandates a **Triple Verification Gate** for all code contributions before merging:

```bash
# 1. Run the Vitest test suite (40 test files covering all workflows, IoT, and IVR)
npm test

# 2. Run static analysis (ESLint must pass with 0 errors and 0 warnings)
npm run lint

# 3. Perform strict TypeScript type checking
npx tsc --noEmit
```

### Backend Testing (FastAPI)
```bash
# Run pytest in the backend directory
cd backend
pytest tests/
```

---

## 🤖 Instructions & Invariants for AI Coding Agents

If you are an AI coding assistant (e.g. Antigravity, Claude, GPT, Cursor, Aider) reading or modifying this repository, **you must strictly adhere to the following architectural invariants**:

1. **Durable Case First Pattern**:
   - Always persist the `Case` record in PostgreSQL **before** invoking the external AI engine. If the AI service is unreachable, times out, or fails, the case must remain valid with `status = PENDING_REVIEW` and `analysisResult = null`. Never fail or roll back case creation due to an AI microservice error.

2. **Server-Only Security Boundaries**:
   - `AI_ENGINE_URL`, `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `TELEGRAM_BOT_TOKEN`, and AI provider keys must **never** be prefixed with `NEXT_PUBLIC_` or exposed to client-side bundles. Use `import "server-only";` in server library files.

3. **Optimistic Concurrency on Mutations**:
   - Every mutation modifying case status or assistance status (`acceptAssistanceRequestAction`, `startVisitAssistanceRequestAction`, `updateCaseStatus`) must validate `expectedUpdatedAt` against the database timestamp to prevent stale write conflicts in the field.

4. **Offline Queue Isolation & Photo Blob Retention**:
   - Queued offline reports must be associated with the active `clerkUserId` when enqueued. Never drop or reassign records belonging to other users on shared devices.
   - Offline photographs must be saved as raw `Blob` objects in IndexedDB and preserved through failed upload attempts until successfully synchronized.

5. **Clinical Safety & Non-Prescriptive Guardrails**:
   - Generative AI outputs and risk scores are strictly decision-support aids. Never allow AI to automatically prescribe medications, issue veterinary prescriptions, or override a licensed veterinarian's assessment.

6. **Relational Deletion Safeguards**:
   - When modifying animal deletion logic in [`web/lib/actions/reporting_data.ts`](file:///d:/PS128/web/lib/actions/reporting_data.ts), always check all six relational entities (`cases`, `vaccinations`, `treatments`, `assistanceRequests`, `veterinaryReports`, `conversations`) before allowing deletion.

7. **Telegram Delivery Resilience**:
   - Telegram notifications must be dispatched outside of Prisma transactions. A failure in Telegram delivery must never cause a database transaction to roll back.

8. **Mobile Responsiveness & Design Consistency**:
   - Ensure all UI pages and components support mobile viewports down to **375px** with no horizontal overflow, responsive padding, and tap targets $\ge 44\text{px}$. Respect the Apple Liquid Glass design tokens and Tailwind CSS v4 conventions.

---

## 📜 License
This project is open-source software licensed under the [MIT License](LICENSE).  
Copyright (c) 2026 Chirabrata Ghosal.
