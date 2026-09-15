import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock @clerk/nextjs
const mockUseUser = vi.fn();
vi.mock("@clerk/nextjs", () => ({
  useUser: () => mockUseUser(),
}));

// Mock next/navigation
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
    push: vi.fn(),
  }),
}));

// Mock sync and db functions
vi.mock("@/lib/offline/db", () => ({
  getQueuedReports: vi.fn(),
  getAllQueuedReports: vi.fn(),
}));

vi.mock("@/lib/offline/sync", () => ({
  triggerQueueSync: vi.fn().mockResolvedValue({ processed: 0, synced: 0, failed: 0 }),
  retryManualQueueItem: vi.fn().mockResolvedValue(true),
  checkServerReachability: vi.fn().mockResolvedValue(true),
}));

// Mock assistance actions
vi.mock("@/lib/actions/assistance", () => ({
  acceptAssistanceRequestAction: vi.fn().mockResolvedValue({ success: true, status: "ACCEPTED" }),
  startVisitAssistanceRequestAction: vi.fn().mockResolvedValue({ success: true, status: "IN_PROGRESS" }),
}));

import { getQueuedReports, getAllQueuedReports } from "@/lib/offline/db";
import { retryManualQueueItem } from "@/lib/offline/sync";
import { acceptAssistanceRequestAction, startVisitAssistanceRequestAction } from "@/lib/actions/assistance";
import { SyncStatusBadge } from "@/components/offline/SyncStatusBadge";
import { AgentAssistanceQueue } from "@/components/agent/AgentAssistanceQueue";

describe("Batch 1 Component UI Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUser.mockReturnValue({ user: { id: "user_me" } });
  });

  describe("SyncStatusBadge Component", () => {
    it("should render warning banner when other user accounts have pending offline items", async () => {
      vi.mocked(getQueuedReports).mockResolvedValue([]);
      vi.mocked(getAllQueuedReports).mockResolvedValue([
        {
          id: "item_other_1",
          submissionId: "item_other_1",
          clerkUserId: "user_other",
          animalId: "a1",
          symptoms: ["Fever"],
          durationDays: 1,
          affectedCount: 1,
          herdSize: 5,
          mortalityCount: 0,
          status: "QUEUED",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      render(<SyncStatusBadge />);

      // Open drawer modal
      const triggerBtn = screen.getByRole("button");
      fireEvent.click(triggerBtn);

      await waitFor(() => {
        expect(screen.getByText(/Reports belonging to another account/i)).toBeInTheDocument();
      });
    });

    it("should render manual retry badge and trigger retryManualQueueItem when retry button is clicked", async () => {
      vi.mocked(getQueuedReports).mockResolvedValue([
        {
          id: "item_failed_capped",
          submissionId: "item_failed_capped",
          clerkUserId: "user_me",
          animalId: "a1",
          symptoms: ["Cough"],
          durationDays: 1,
          affectedCount: 1,
          herdSize: 5,
          mortalityCount: 0,
          status: "NEEDS_MANUAL_RETRY",
          retryCount: 5,
          lastError: "Database lock timeout",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
      vi.mocked(getAllQueuedReports).mockResolvedValue([]);

      render(<SyncStatusBadge />);

      // Open drawer modal
      const triggerBtn = screen.getByRole("button");
      fireEvent.click(triggerBtn);

      await waitFor(() => {
        expect(screen.getByText(/Retry needed/i)).toBeInTheDocument();
      });

      const retryBtn = screen.getByRole("button", { name: /Retry/i });
      expect(retryBtn).toBeInTheDocument();

      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(retryManualQueueItem).toHaveBeenCalledWith("item_failed_capped", "user_me");
      });
    });
  });

  describe("AgentAssistanceQueue Component", () => {
    const mockRequest = {
      id: "req_123",
      reason: "Severe cough and loss of appetite",
      status: "REQUESTED",
      requestedAt: new Date("2026-09-10T08:00:00.000Z"),
      updatedAt: new Date("2026-09-10T08:30:00.000Z"),
      farmerUser: { id: "f1", name: "Ramesh Farmer", phone: "9876543210" },
      animal: { id: "a1", tag: "COW-101", species: "Cattle" },
      farm: { id: "farm1", name: "Green Valley Farm", latitude: 18.52, longitude: 73.85 },
      village: { name: "Shivaji Nagar", block: { name: "Haveli", district: { name: "Pune" } } },
      assignedFieldAgentUser: null,
      case: null,
    };

    it("should pass expectedUpdatedAt to acceptAssistanceRequestAction on Accept Visit click", async () => {
      render(<AgentAssistanceQueue requests={[mockRequest]} currentAgentId="agent_1" />);

      const acceptBtn = screen.getByRole("button", { name: /Accept Visit/i });
      fireEvent.click(acceptBtn);

      await waitFor(() => {
        expect(acceptAssistanceRequestAction).toHaveBeenCalledWith(
          "req_123",
          mockRequest.updatedAt.toISOString()
        );
      });
    });

    it("should pass expectedUpdatedAt to startVisitAssistanceRequestAction on Start Visit click", async () => {
      const acceptedRequest = {
        ...mockRequest,
        status: "ACCEPTED",
        assignedFieldAgentUser: { id: "agent_1", name: "Agent Suresh" },
      };

      render(<AgentAssistanceQueue requests={[acceptedRequest]} currentAgentId="agent_1" />);

      const startVisitBtn = screen.getByRole("button", { name: /Start Visit/i });
      fireEvent.click(startVisitBtn);

      await waitFor(() => {
        expect(startVisitAssistanceRequestAction).toHaveBeenCalledWith(
          "req_123",
          acceptedRequest.updatedAt.toISOString()
        );
      });
    });

    it("should render Record Inspection link with query params when request is IN_PROGRESS", () => {
      const inProgressRequest = {
        ...mockRequest,
        status: "IN_PROGRESS",
        assignedFieldAgentUser: { id: "agent_1", name: "Agent Suresh" },
      };

      render(<AgentAssistanceQueue requests={[inProgressRequest]} currentAgentId="agent_1" />);

      const recordLink = screen.getByRole("link", { name: /Record.*Inspection/i });
      expect(recordLink).toBeInTheDocument();
      expect(recordLink.getAttribute("href")).toContain("requestId=req_123");
      expect(recordLink.getAttribute("href")).toContain(
        `expectedUpdatedAt=${encodeURIComponent(inProgressRequest.updatedAt.toISOString())}`
      );
    });

    it("should render completed Case badge when request status is COMPLETED", () => {
      const completedRequest = {
        ...mockRequest,
        status: "COMPLETED",
        assignedFieldAgentUser: { id: "agent_1", name: "Agent Suresh" },
        case: { id: "c1", caseNumber: "CASE-2026-000456", status: "PENDING_REVIEW" },
      };

      render(<AgentAssistanceQueue requests={[completedRequest]} currentAgentId="agent_1" />);

      expect(screen.getByText(/Case #CASE-2026-000456/i)).toBeInTheDocument();
    });
  });
});
