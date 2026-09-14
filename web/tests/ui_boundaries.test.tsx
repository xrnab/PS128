import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FarmerLoading from "@/app/farmer/loading";
import AgentLoading from "@/app/agent/loading";
import VetLoading from "@/app/vet/loading";
import AuthorityLoading from "@/app/authority/loading";
import FarmerError from "@/app/farmer/error";
import AgentError from "@/app/agent/error";
import VetError from "@/app/vet/error";
import AuthorityError from "@/app/authority/error";

describe("Loading Skeletons (Batch 2)", () => {
  it("renders Farmer portal loading skeleton correctly", async () => {
    const ui = await FarmerLoading();
    const { container } = render(ui);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    expect(screen.getByText(/Loading farmer portal data/i)).toBeInTheDocument();
  });

  it("renders Field Agent portal loading skeleton correctly", () => {
    const { container } = render(<AgentLoading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders Veterinarian portal loading skeleton correctly", async () => {
    const ui = await VetLoading();
    const { container } = render(ui);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    expect(screen.getByText(/Loading clinical triage queue/i)).toBeInTheDocument();
  });

  it("renders Authority portal loading skeleton correctly", async () => {
    const ui = await AuthorityLoading();
    const { container } = render(ui);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    expect(screen.getByText(/Initializing GIS Disease Heatmap/i)).toBeInTheDocument();
  });
});

describe("Error Boundaries with Recovery Actions (Batch 2)", () => {
  it("renders Farmer portal error boundary and triggers reset on Try Again click", () => {
    const resetMock = vi.fn();
    const testError = new Error("Database network timeout");

    render(<FarmerError error={testError} reset={resetMock} />);

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/Database network timeout/i)).toBeInTheDocument();

    const tryAgainBtn = screen.getByRole("button", { name: /Try again/i });
    expect(tryAgainBtn).toBeInTheDocument();
    fireEvent.click(tryAgainBtn);
    expect(resetMock).toHaveBeenCalledTimes(1);

    const homeLink = screen.getByRole("link", { name: /Home/i });
    expect(homeLink).toHaveAttribute("href", "/");
  });

  it("renders Agent portal error boundary and triggers reset on Reload Queue click", () => {
    const resetMock = vi.fn();
    const testError = new Error("Failed to load field assistance queue");

    render(<AgentError error={testError} reset={resetMock} />);

    expect(screen.getByText(/Field Notebook Error/i)).toBeInTheDocument();
    expect(screen.getByText(/Failed to load field assistance queue/i)).toBeInTheDocument();

    const reloadBtn = screen.getByRole("button", { name: /Reload Queue/i });
    fireEvent.click(reloadBtn);
    expect(resetMock).toHaveBeenCalledTimes(1);

    const homeLink = screen.getByRole("link", { name: /Home/i });
    expect(homeLink).toHaveAttribute("href", "/");
  });

  it("renders Vet portal error boundary and triggers reset on Reload Triage click", () => {
    const resetMock = vi.fn();
    const testError = new Error("Clinical sync failed");

    render(<VetError error={testError} reset={resetMock} />);

    expect(screen.getByText(/Clinical Portal Error/i)).toBeInTheDocument();
    expect(screen.getByText(/Clinical sync failed/i)).toBeInTheDocument();

    const reloadBtn = screen.getByRole("button", { name: /Reload Triage/i });
    fireEvent.click(reloadBtn);
    expect(resetMock).toHaveBeenCalledTimes(1);
  });

  it("renders Authority portal error boundary and triggers reset on Retry Query click", () => {
    const resetMock = vi.fn();
    const testError = new Error("GIS service unreachable");

    render(<AuthorityError error={testError} reset={resetMock} />);

    expect(screen.getByText(/Unable to load district data/i)).toBeInTheDocument();
    expect(screen.getByText(/GIS service unreachable/i)).toBeInTheDocument();

    const reloadBtn = screen.getByRole("button", { name: /Retry Query/i });
    fireEvent.click(reloadBtn);
    expect(resetMock).toHaveBeenCalledTimes(1);
  });
});
