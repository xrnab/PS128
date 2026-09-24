import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MaitriIntro } from "@/components/motion/MaitriIntro";

// Mock next/navigation — always simulate the landing route
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

// Mock next/image so we get a plain <img> in jsdom
vi.mock("next/image", () => ({
  default: ({ alt, src, ...rest }: { alt: string; src: string; [k: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} {...rest} />
  ),
}));

/** Install a matchMedia stub into jsdom before tests run. */
function setReducedMotion(reduced: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: reduced ? query === "(prefers-reduced-motion: reduce)" : false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

describe("MaitriIntro (brand splash)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
    setReducedMotion(false); // default: motion OK
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ─── Core render ───────────────────────────────────────────────────────

  it("renders on first visit when no session flag is set", () => {
    render(<MaitriIntro />);
    expect(screen.getByTestId("maitri-intro")).toBeInTheDocument();
  });

  it("does NOT render when the session flag is already set", () => {
    sessionStorage.setItem("maitri-intro-seen", "true");
    render(<MaitriIntro />);
    expect(screen.queryByTestId("maitri-intro")).not.toBeInTheDocument();
  });

  it("does NOT set the session flag immediately on mount (only on completion)", () => {
    render(<MaitriIntro />);
    // Flag must NOT exist yet — intro is still playing
    expect(sessionStorage.getItem("maitri-intro-seen")).toBeNull();
  });

  it("sets the session flag when the intro is dismissed via click", () => {
    render(<MaitriIntro />);
    const overlay = screen.getByTestId("maitri-intro");
    fireEvent.click(overlay);
    // dismiss() writes sessionStorage synchronously
    expect(sessionStorage.getItem("maitri-intro-seen")).toBe("true");
  });


  it("displays the Maitri logo image", () => {
    render(<MaitriIntro />);
    const logo = screen.getByAltText("Maitri");
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("src", "/images/maitri-livestock-logo.png");
  });

  // ─── Dismiss / skip behaviour ──────────────────────────────────────────

  it("dismisses immediately on overlay click", () => {
    render(<MaitriIntro />);
    const overlay = screen.getByTestId("maitri-intro");
    fireEvent.click(overlay);

    act(() => { vi.advanceTimersByTime(400); });

    expect(screen.queryByTestId("maitri-intro")).not.toBeInTheDocument();
  });

  it("dismisses immediately on keydown", () => {
    render(<MaitriIntro />);
    fireEvent.keyDown(window, { key: "Escape" });

    act(() => { vi.advanceTimersByTime(400); });

    expect(screen.queryByTestId("maitri-intro")).not.toBeInTheDocument();
  });

  it("auto-dismisses after ~2650 ms", () => {
    render(<MaitriIntro />);
    expect(screen.getByTestId("maitri-intro")).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(2700); });

    expect(screen.queryByTestId("maitri-intro")).not.toBeInTheDocument();
  });

  it("sets the session flag on natural auto-completion", () => {
    render(<MaitriIntro />);
    expect(sessionStorage.getItem("maitri-intro-seen")).toBeNull();

    act(() => { vi.advanceTimersByTime(2700); });

    expect(sessionStorage.getItem("maitri-intro-seen")).toBe("true");
  });

  // ─── Reduced motion ────────────────────────────────────────────────────

  it("skips the intro entirely when prefers-reduced-motion is enabled", () => {
    setReducedMotion(true);
    render(<MaitriIntro />);
    // Overlay must never appear
    expect(screen.queryByTestId("maitri-intro")).not.toBeInTheDocument();
    // Session key must NOT be written — the user hasn't been interrupted
    expect(sessionStorage.getItem("maitri-intro-seen")).toBeNull();
  });
});
