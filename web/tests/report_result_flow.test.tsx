import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReportResultFlow } from "@/components/reporting/ReportResultFlow";

vi.mock("@/lib/actions/analysis", () => ({
  runCaseAnalysisAction: vi.fn().mockResolvedValue({ success: true, analysisResult: null, visionResult: null }),
}));

describe("ReportResultFlow - Liquid Ledger Assessment Flow", () => {
  const baseSubmitResult = {
    success: true,
    caseId: "case-123",
    caseNumber: "CASE-2026-570290",
    status: "PENDING_REVIEW",
    assignedVeterinarian: {
      id: "vet-1",
      name: "Alpha Medic",
      email: "vet@maitri.org",
      phone: "+919876543210",
      jurisdiction: "North 24 Parganas",
    },
    assignmentLevel: "DISTRICT" as const,
    location: {
      villageName: "Bidhannagar",
      blockName: "Rajarhat",
      districtName: "North 24 Parganas",
    },
  };

  const selectedAnimal = {
    id: "animal-004",
    farmId: "farm-1",
    farmName: "Green Acres Farm",
    tag: "COW-004",
    species: "Cow",
    breed: "Gir",
    ageMonths: 36,
    gender: "Female",
    villageName: "Bidhannagar",
    districtName: "North 24 Parganas",
  };

  it("renders the top report header, case context, and assigned veterinarian", () => {
    render(
      <ReportResultFlow
        submitResult={baseSubmitResult}
        selectedAnimal={selectedAnimal}
        symptoms={["Fever", "Low activity"]}
        durationDays={2}
        temperature={40.1}
        activity={22}
        onReset={vi.fn()}
      />
    );

    // 1. Header
    expect(screen.getByText("HEALTH REPORT SUBMITTED")).toBeInTheDocument();
    expect(screen.getByText(/Case #CASE-2026-570290/i)).toBeInTheDocument();
    expect(screen.getByText(/Animal: Cow #COW-004/i)).toBeInTheDocument();
    expect(screen.getByText("PENDING VETERINARIAN REVIEW")).toBeInTheDocument();

    // 2. Location & Vet
    expect(screen.getByText("Bidhannagar")).toBeInTheDocument();
    expect(screen.getByText("Rajarhat")).toBeInTheDocument();
    expect(screen.getByText("North 24 Parganas")).toBeInTheDocument();
    expect(screen.getByText("Dr. Alpha Medic")).toBeInTheDocument();
  });

  it("renders dominant AI health assessment with real API signals and no hardcoded fallbacks", () => {
    const aiState = {
      analysisResult: {
        overall_risk_score: 72,
        overall_risk_level: "HIGH",
        disease_prediction: {
          suspected_condition: "Lumpy Skin Disease",
          confidence: 0.88,
        },
        iot_telemetry_analysis: {
          temperature: 40.1,
          activity_index: 22,
          has_anomaly: true,
          anomalies: ["Hyperthermia: 40.1°C"],
        },
        weather_analysis: {
          temperature: 27.5,
          humidity: 87,
          vector_breeding_risk: "HIGH",
        },
        outbreak_surge_analysis: {
          latest_cases: 24,
          is_outbreak_spike: false,
          z_score: 1.8,
        },
      },
      visionResult: {
        visual_anomaly_detected: true,
        primary_prediction: "Lumpy Skin Disease",
        confidence: 0.88,
      },
    };

    render(
      <ReportResultFlow
        submitResult={baseSubmitResult}
        selectedAnimal={selectedAnimal}
        symptoms={["Fever", "Low activity"]}
        durationDays={2}
        photoUrl="https://blob.vercel.com/sample.jpg"
        aiState={aiState}
        onReset={vi.fn()}
      />
    );

    // Dominant Assessment
    expect(screen.getByText("AI-ASSISTED HEALTH ASSESSMENT")).toBeInTheDocument();
    expect(screen.getByText("72")).toBeInTheDocument();
    expect(screen.getByText("HIGH RISK")).toBeInTheDocument();

    // Why? Section
    expect(screen.getByText("Why?")).toBeInTheDocument();
    expect(screen.getByText(/Fever recorded/i)).toBeInTheDocument();
    expect(screen.getByText(/Recent local case increase/i)).toBeInTheDocument();
    expect(screen.getByText(/Environmental risk elevated/i)).toBeInTheDocument();
    expect(screen.getByText(/IoT activity abnormal/i)).toBeInTheDocument();

    // Disclaimer
    expect(
      screen.getByText("“Preliminary assessment — veterinarian verification required.”")
    ).toBeInTheDocument();
  });

  it("handles non-contradictory computer vision states", () => {
    // Healthy / no anomaly case
    const aiStateHealthy = {
      analysisResult: {
        overall_risk_score: 25,
        overall_risk_level: "LOW",
      },
      visionResult: {
        visual_anomaly_detected: false,
        primary_prediction: "Healthy",
        confidence: 0.95,
      },
    };

    const { unmount } = render(
      <ReportResultFlow
        submitResult={baseSubmitResult}
        selectedAnimal={selectedAnimal}
        symptoms={["Mild fatigue"]}
        photoUrl="https://blob.vercel.com/healthy.jpg"
        aiState={aiStateHealthy}
        onReset={vi.fn()}
      />
    );

    expect(screen.getByText("No significant visual abnormality detected.")).toBeInTheDocument();
    expect(screen.queryByText(/Healthy-like lesion/i)).not.toBeInTheDocument();

    unmount();

    // Lesion detected case
    const aiStateLesion = {
      analysisResult: {
        overall_risk_score: 80,
        overall_risk_level: "HIGH",
      },
      visionResult: {
        visual_anomaly_detected: true,
        primary_prediction: "Lumpy Skin Disease",
        confidence: 0.88,
      },
    };

    render(
      <ReportResultFlow
        submitResult={baseSubmitResult}
        selectedAnimal={selectedAnimal}
        symptoms={["Skin nodule"]}
        photoUrl="https://blob.vercel.com/lesion.jpg"
        aiState={aiStateLesion}
        onReset={vi.fn()}
      />
    );

    expect(screen.getByText("Lumpy Skin Disease-like lesion")).toBeInTheDocument();
    expect(screen.getByText("Model Confidence")).toBeInTheDocument();
    expect(
      screen.getByText("“AI-assisted visual signal only. Clinical examination required.”")
    ).toBeInTheDocument();
  });

  it("renders the veterinarian handoff, farmer guidance, and final actions", () => {
    render(
      <ReportResultFlow
        submitResult={baseSubmitResult}
        selectedAnimal={selectedAnimal}
        symptoms={["Fever"]}
        onReset={vi.fn()}
      />
    );

    // Handoff
    expect(screen.getByText("PRELIMINARY ASSESSMENT")).toBeInTheDocument();
    expect(screen.getByText("VETERINARIAN REVIEW")).toBeInTheDocument();
    expect(screen.getByText("NEXT CLINICAL STEPS")).toBeInTheDocument();
    expect(screen.getByText("Veterinarian review & triage")).toBeInTheDocument();
    expect(screen.getByText("Physical clinical examination")).toBeInTheDocument();
    expect(screen.getByText("Lab referral if required")).toBeInTheDocument();
    expect(screen.getByText("Authorized treatment / follow-up")).toBeInTheDocument();
    expect(
      screen.getByText("The veterinarian remains the final clinical decision authority.")
    ).toBeInTheDocument();

    // Farmer Guidance
    expect(screen.getByText("FARMER GUIDANCE")).toBeInTheDocument();
    expect(screen.getByText("Keep the animal under observation.")).toBeInTheDocument();
    expect(screen.getByText("Avoid unnecessary contact with other animals.")).toBeInTheDocument();

    // Actions
    expect(screen.getByText("View Animal Health History")).toBeInTheDocument();
    expect(screen.getByText("Create Another Report")).toBeInTheDocument();
  });
});
