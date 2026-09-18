import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  DemoVideoModal,
  extractYouTubeId,
  DEMO_VIDEOS,
} from "@/components/site/DemoVideoModal";
import { DemoVideoButton } from "@/components/site/DemoVideoButton";

describe("YouTube ID Extraction Utility", () => {
  it("extracts ID from standard youtu.be short URLs", () => {
    expect(extractYouTubeId("https://youtu.be/x6H0suXY7SI")).toBe("x6H0suXY7SI");
  });

  it("extracts ID from standard youtube.com/watch URLs", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=x6H0suXY7SI")).toBe("x6H0suXY7SI");
  });

  it("extracts ID from embed URLs", () => {
    expect(extractYouTubeId("https://www.youtube-nocookie.com/embed/x6H0suXY7SI")).toBe("x6H0suXY7SI");
  });

  it("handles plain 11-character video IDs directly", () => {
    expect(extractYouTubeId("x6H0suXY7SI")).toBe("x6H0suXY7SI");
  });

  it("handles empty or whitespace inputs gracefully", () => {
    expect(extractYouTubeId("")).toBe("");
    expect(extractYouTubeId("   ")).toBe("");
  });
});

describe("DemoVideoButton Component", () => {
  it("renders with Watch Demo text and play icon", () => {
    render(<DemoVideoButton />);
    const button = screen.getByRole("button", { name: /Watch Demo/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("liquid-button-glass");
  });

  it("opens modal when clicked", () => {
    render(<DemoVideoButton />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const button = screen.getByRole("button", { name: /Watch Demo/i });
    fireEvent.click(button);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("DemoVideoModal Component", () => {
  it("does not render when open is false", () => {
    render(<DemoVideoModal open={false} onClose={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders when open is true with accessibility attributes and privacy-respecting iframe", () => {
    render(<DemoVideoModal open={true} onClose={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "demo-video-title");

    const iframe = screen.getByTitle(/PS128 Maitri Hardware Device Demo/i);
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/1T-oxDdzUbg?rel=0");
    expect(iframe).toHaveAttribute(
      "allow",
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    );
  });

  it("switches tabs when tab buttons are clicked", () => {
    render(<DemoVideoModal open={true} onClose={vi.fn()} />);

    const tab2 = screen.getByRole("button", { name: new RegExp(DEMO_VIDEOS[1].defaultTabLabel, "i") });
    fireEvent.click(tab2);

    expect(screen.getByText(DEMO_VIDEOS[1].defaultTitle)).toBeInTheDocument();
    const iframe2 = screen.getByTitle(/PS128 Maitri IoT Implementation Demo/i);
    expect(iframe2).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/x6H0suXY7SI?rel=0");
  });

  it("calls onClose when close button is clicked", () => {
    const handleClose = vi.fn();
    render(<DemoVideoModal open={true} onClose={handleClose} />);

    const closeBtn = screen.getByRole("button", { name: /Close demo modal/i });
    expect(closeBtn).toBeInTheDocument();
    expect(closeBtn).toHaveClass("touch-target");
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when clicking outside overlay", () => {
    const handleClose = vi.fn();
    render(<DemoVideoModal open={true} onClose={handleClose} />);

    const overlay = screen.getByRole("dialog");
    fireEvent.click(overlay);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when clicking inside the modal panel", () => {
    const handleClose = vi.fn();
    render(<DemoVideoModal open={true} onClose={handleClose} />);

    const title = screen.getByText(/Maitri Live Demonstration/i);
    fireEvent.click(title);

    expect(handleClose).not.toHaveBeenCalled();
  });

  it("calls onClose when pressing Escape key", () => {
    const handleClose = vi.fn();
    render(<DemoVideoModal open={true} onClose={handleClose} />);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("locks body scroll when open and restores it when closed", () => {
    const { unmount } = render(<DemoVideoModal open={true} onClose={vi.fn()} />);
    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).toBe("");
  });
});
