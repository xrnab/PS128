import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { HealthReportForm } from "@/components/reporting/HealthReportForm";
import * as livestockApi from "@/lib/api/livestock";
import * as casesActions from "@/lib/actions/cases";
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

describe("Lesion Photo Rejection & Submit Blocking Test Suite", () => {
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
   * Helper to navigate the wizard from Step 1 to Step 4.
   */
  async function advanceToStep4() {
    render(<HealthReportForm mode="farmer" />);

    // Step 1: Wait for animals to load and select animal
    await waitFor(() => {
      expect(screen.getByText(/COW-404/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/COW-404/i));

    // Click Next step to Step 2
    const nextBtn1 = screen.getByRole("button", { name: /Next step/i });
    fireEvent.click(nextBtn1);

    // Step 2: Select a symptom
    await waitFor(() => {
      expect(screen.getByText(/Skin Nodules/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/Skin Nodules/i));

    // Click Next step to Step 3
    const nextBtn2 = screen.getByRole("button", { name: /Next step/i });
    fireEvent.click(nextBtn2);

    // Step 3: Click Next step to Step 4
    await waitFor(() => {
      expect(document.getElementById("duration")).toBeInTheDocument();
    });
    const nextBtn3 = screen.getByRole("button", { name: /Next step/i });
    fireEvent.click(nextBtn3);

    // Step 4: Photo Capture should be active
    await waitFor(() => {
      expect(screen.getByText(/4\. Lesion Photo/i)).toBeInTheDocument();
    });
  }

  it("1. Blocks Next Step button when image contains a PERSON", async () => {
    // Mock AI vision rejecting photo as a Person
    vi.mocked(livestockApi.predictYoloImage).mockResolvedValue({
      primary_prediction: "Rejected: Person",
      message: "Invalid photo. Person detected.",
      confidence: 0,
      visual_anomaly_detected: false,
      success: true,
    });

    await advanceToStep4();

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

    // Clicking Next step should do nothing and NOT advance to Step 5
    fireEvent.click(nextBtn);
    expect(screen.queryByText(/5\. GPS Location/i)).not.toBeInTheDocument();
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

    await advanceToStep4();

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

    await advanceToStep4();

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

  it("4. Allows proceeding when a VALID animal lesion photo is uploaded", async () => {
    vi.mocked(livestockApi.predictYoloImage).mockResolvedValue({
      primary_prediction: "Lumpy Skin Disease",
      confidence: 96.5,
      visual_anomaly_detected: true,
      success: true,
    });

    await advanceToStep4();

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

    // Click Next step to proceed to Step 5 (Location)
    fireEvent.click(nextBtn);
    await waitFor(() => {
      expect(screen.getByText(/5\. GPS Location/i)).toBeInTheDocument();
    });
  });

  it("5. Disables Submit button on Step 7 if image was rejected", async () => {
    // Start with a valid photo on Step 4 to advance all the way to Step 7
    vi.mocked(livestockApi.predictYoloImage).mockResolvedValue({
      primary_prediction: "Healthy",
      confidence: 90,
      visual_anomaly_detected: false,
      success: true,
    });

    await advanceToStep4();

    // Upload a valid photo on step 4 first
    const fileInput4 = document.querySelector('input[type="file"]') as HTMLInputElement;
    const validFile = new File(["fake-cattle"], "cow.jpg", { type: "image/jpeg" });
    await act(async () => {
      fireEvent.change(fileInput4, { target: { files: [validFile] } });
    });
    await waitFor(() => {
      expect(screen.getByText(/AI: Healthy/i)).toBeInTheDocument();
    });

    // Advance to Step 5 (GPS)
    const nextBtn4 = screen.getByRole("button", { name: /Next step/i });
    fireEvent.click(nextBtn4);

    // Advance to Step 6 (IoT)
    await waitFor(() => expect(screen.getByText(/5\. GPS Location/i)).toBeInTheDocument());
    const nextBtn5 = screen.getByRole("button", { name: /Next step/i });
    fireEvent.click(nextBtn5);

    // Advance to Step 7 (Review & Submit)
    await waitFor(() => expect(screen.getByText(/6\. Temperature and IoT Vitals/i)).toBeInTheDocument());
    const nextBtn6 = screen.getByRole("button", { name: /Next step/i });
    fireEvent.click(nextBtn6);

    // Verify on Step 7
    await waitFor(() => {
      expect(screen.getByText(/7\. Review and Submit Report/i)).toBeInTheDocument();
    });

    // Submit button is initially active for valid flow
    const submitBtn = screen.getByRole("button", { name: /Submit report/i });
    expect(submitBtn).not.toBeDisabled();

    // Now go back to Step 4, replace with a person photo
    const backBtn = screen.getByRole("button", { name: /Back/i });
    fireEvent.click(backBtn); // to Step 6
    fireEvent.click(screen.getByRole("button", { name: /Back/i })); // to Step 5
    fireEvent.click(screen.getByRole("button", { name: /Back/i })); // to Step 4

    await waitFor(() => {
      expect(screen.getByText(/4\. Lesion Photo/i)).toBeInTheDocument();
    });

    // Mock AI returning rejection
    vi.mocked(livestockApi.predictYoloImage).mockResolvedValue({
      primary_prediction: "Rejected: Person",
      message: "Invalid photo. Person detected.",
      confidence: 0,
      visual_anomaly_detected: false,
      success: true,
    });

    // Remove old photo and upload person photo
    const deleteBtn = screen.getByTitle(/Remove Photo/i);
    fireEvent.click(deleteBtn);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const personFile = new File(["fake-person"], "person.jpg", { type: "image/jpeg" });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [personFile] } });
    });

    await waitFor(() => {
      expect(screen.getByText(/AI: Rejected: Person/i)).toBeInTheDocument();
    });

    // Button on Step 4 is blocked
    const step4NextBtn = screen.getByRole("button", { name: /Next step/i });
    expect(step4NextBtn).toBeDisabled();

    // Attempting to advance does not move away from Step 4
    fireEvent.click(step4NextBtn);
    expect(screen.getByText(/4\. Lesion Photo/i)).toBeInTheDocument();
  });
});
