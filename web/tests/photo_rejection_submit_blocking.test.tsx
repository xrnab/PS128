import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { HealthReportForm } from "@/components/reporting/HealthReportForm";
import * as livestockApi from "@/lib/api/livestock";
import * as reportingDataActions from "@/lib/actions/reporting_data";
import enDict from "@/lib/i18n/dictionaries/en.json";

// Mock Clerk user
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    user: { id: "farmer_clerk_123", firstName: "Ramesh" },
    isLoaded: true,
    isSignedIn: true,
  }),
}));

// Mock reporting data (animals)
vi.mock("@/lib/actions/reporting_data", () => ({
  getFarmerAnimals: vi.fn(),
  registerFarmerAnimal: vi.fn(),
}));

// Mock case creation
vi.mock("@/lib/actions/cases", () => ({
  createCaseReportAction: vi.fn(),
}));

// Mock AI vision prediction
vi.mock("@/lib/api/livestock", () => ({
  predictYoloImage: vi.fn(),
}));

// Mock LocaleProvider
vi.mock("@/components/layout/LocaleProvider", () => ({
  useLocale: () => ({
    locale: "en",
    dictionary: enDict,
    setLocale: vi.fn(),
  }),
}));

// Mock URL.createObjectURL
if (typeof window !== "undefined") {
  window.URL.createObjectURL = vi.fn(() => "blob:http://localhost:3000/mock-preview-id");
}

describe("Lesion Photo Rejection & Submit Blocking Test Suite (5-Step Flow)", () => {
  const mockAnimal = {
    id: "animal-cow-01",
    tag: "COW-404",
    species: "COW",
    breed: "Gir",
    ageMonths: 36,
    farmId: "farm-1",
    farmName: "Green Valley Farm",
    villageName: "Shirwal",
    districtName: "Satara",
    herdSize: 8,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(reportingDataActions.getFarmerAnimals).mockResolvedValue([mockAnimal]);

    // Mock upload fetch endpoint
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes("/api/storage/upload")) {
        return new Response(
          JSON.stringify({ success: true, url: "https://blob.mock/lesion_photo.jpg" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("Not found", { status: 404 });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Helper to navigate the 5-step wizard from Step 1 to Step 3 (Evidence: Photo & IoT).
   */
  async function advanceToStep3() {
    render(<HealthReportForm mode="farmer" />);

    // Step 1: Wait for animals to load and select animal
    await waitFor(() => {
      expect(screen.getByText(/COW-404/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/COW-404/i));

    // Click Next step to Step 2 (Symptoms & Duration)
    const nextBtn1 = screen.getByRole("button", { name: /Next step/i });
    fireEvent.click(nextBtn1);

    // Step 2: Select a symptom
    await waitFor(() => {
      expect(screen.getByText(/Skin Nodules/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/Skin Nodules/i));

    // Click Next step to Step 3 (Evidence: Photo & IoT)
    const nextBtn2 = screen.getByRole("button", { name: /Next step/i });
    fireEvent.click(nextBtn2);

    // Step 3: Evidence: Photo & IoT should be active
    await waitFor(() => {
      expect(screen.getByText(/3\. Evidence: Photo & IoT/i)).toBeInTheDocument();
    });
  }

  it("1. Blocks Next Step button on Step 3 when image contains a PERSON", async () => {
    // Mock AI vision rejecting photo as a Person
    vi.mocked(livestockApi.predictYoloImage).mockResolvedValue({
      primary_prediction: "Rejected: Person",
      message: "Invalid photo. Person detected.",
      confidence: 0,
      visual_anomaly_detected: false,
      success: true,
    });

    await advanceToStep3();

    // Upload dummy person image
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    const personFile = new File(["fake-person-image"], "person.jpg", { type: "image/jpeg" });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [personFile] } });
    });

    // Verify AI Rejection Badge appears
    await waitFor(() => {
      expect(screen.getByText(/AI: Rejected: Person/i)).toBeInTheDocument();
    });

    // Verify SUBMISSION BLOCKED warning appears
    expect(screen.getByText(/Submission Blocked/i)).toBeInTheDocument();
    expect(screen.getByText(/Invalid photo\. Person detected\./i)).toBeInTheDocument();

    // Verify Next step button is DISABLED
    const nextBtn = screen.getByRole("button", { name: /Next step/i });
    expect(nextBtn).toBeDisabled();
    expect(nextBtn.className).toContain("cursor-not-allowed");

    // Clicking Next step should do nothing and NOT advance to Step 4 (Review)
    fireEvent.click(nextBtn);
    expect(screen.queryByText(/4\. Review Health Report/i)).not.toBeInTheDocument();
  });

  it("2. Blocks Next Step button when image contains ANY OTHER OBJECT (e.g. Cup, Phone, Bottle, Car)", async () => {
    // Mock AI vision rejecting photo because of non-animal object (Cup)
    vi.mocked(livestockApi.predictYoloImage).mockResolvedValue({
      primary_prediction: "Rejected: Cup",
      message: "Invalid photo. Cup detected.",
      confidence: 0,
      visual_anomaly_detected: false,
      success: true,
    });

    await advanceToStep3();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const cupFile = new File(["fake-cup-image"], "cup.png", { type: "image/png" });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [cupFile] } });
    });

    // Verify AI Rejection Badge for Cup appears
    await waitFor(() => {
      expect(screen.getByText(/AI: Rejected: Cup/i)).toBeInTheDocument();
    });

    // Verify SUBMISSION BLOCKED warning appears
    expect(screen.getByText(/Submission Blocked/i)).toBeInTheDocument();
    expect(screen.getByText(/Invalid photo\. Cup detected\./i)).toBeInTheDocument();

    // Verify Next step button is DISABLED
    const nextBtn = screen.getByRole("button", { name: /Next step/i });
    expect(nextBtn).toBeDisabled();
    expect(nextBtn.className).toContain("cursor-not-allowed");
  });

  it("3. Unblocks Next Step button when the invalid/rejected photo is deleted", async () => {
    vi.mocked(livestockApi.predictYoloImage).mockResolvedValue({
      primary_prediction: "Rejected: Cell Phone",
      message: "Invalid photo. Cell Phone detected.",
      confidence: 0,
      visual_anomaly_detected: false,
      success: true,
    });

    await advanceToStep3();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const phoneFile = new File(["fake-phone-image"], "phone.jpg", { type: "image/jpeg" });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [phoneFile] } });
    });

    await waitFor(() => {
      expect(screen.getByText(/AI: Rejected: Cell Phone/i)).toBeInTheDocument();
    });

    const nextBtn = screen.getByRole("button", { name: /Next step/i });
    expect(nextBtn).toBeDisabled();

    // Click Delete photo button (trash button)
    const deleteBtn = screen.getByTitle(/Remove Photo/i) || screen.getByRole("button", { name: "" });
    fireEvent.click(deleteBtn);

    // After removal, preview and rejected warning are gone
    await waitFor(() => {
      expect(screen.queryByText(/AI: Rejected: Cell Phone/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Submission Blocked/i)).not.toBeInTheDocument();
    });

    // Next step button is enabled again (photo is optional)
    expect(nextBtn).not.toBeDisabled();
  });

  it("4. Allows proceeding to Step 4 (Review) when a VALID animal lesion photo is uploaded", async () => {
    vi.mocked(livestockApi.predictYoloImage).mockResolvedValue({
      primary_prediction: "Lumpy Skin Disease",
      confidence: 96.5,
      visual_anomaly_detected: true,
      success: true,
    });

    await advanceToStep3();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const cowFile = new File(["valid-cow-nodule-photo"], "nodule.jpg", { type: "image/jpeg" });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [cowFile] } });
    });

    await waitFor(() => {
      expect(screen.getByText(/AI: Lumpy Skin Disease/i)).toBeInTheDocument();
    });

    // Submission is NOT blocked
    expect(screen.queryByText(/Submission Blocked/i)).not.toBeInTheDocument();

    const nextBtn = screen.getByRole("button", { name: /Next step/i });
    expect(nextBtn).not.toBeDisabled();

    // Click Next step to proceed to Step 4 (Review)
    fireEvent.click(nextBtn);
    await waitFor(() => {
      expect(screen.getByText(/4\. Review Health Report/i)).toBeInTheDocument();
    });
  });

  it("5. Allows reviewing and submitting on Step 4 for valid flow", async () => {
    vi.mocked(livestockApi.predictYoloImage).mockResolvedValue({
      primary_prediction: "Healthy",
      confidence: 90,
      visual_anomaly_detected: false,
      success: true,
    });

    await advanceToStep3();

    // Upload a valid photo on Step 3
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const validFile = new File(["fake-cattle"], "cow.jpg", { type: "image/jpeg" });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [validFile] } });
    });
    await waitFor(() => {
      expect(screen.getByText(/AI: Healthy/i)).toBeInTheDocument();
    });

    // Advance to Step 4 (Review Health Report)
    const nextBtn3 = screen.getByRole("button", { name: /Next step/i });
    fireEvent.click(nextBtn3);

    // Verify on Step 4 (Review)
    await waitFor(() => {
      expect(screen.getByText(/4\. Review Health Report/i)).toBeInTheDocument();
    });

    // Submit button is active
    const submitBtn = screen.getByRole("button", { name: /Submit report/i });
    expect(submitBtn).not.toBeDisabled();
  });
});
