import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

import enMessages from "@/messages/en.json";

vi.mock("server-only", () => ({}));

type MessageValue = string | { [key: string]: MessageValue };
type Messages = Record<string, MessageValue>;

function resolveTranslation(namespace?: string, key?: string): string {
  if (!namespace || !key) return key || "";
  const messages = enMessages as unknown as Messages;
  const ns = messages[namespace];
  if (!ns) return key;
  if (typeof ns === "string") return ns;

  const parts = key.split(".");
  let current: MessageValue | undefined = ns;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return key;
    }
  }
  return typeof current === "string" ? current : key;
}

vi.mock("next-intl", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>().catch(() => ({}));
  return {
    ...actual,
    useTranslations: (namespace?: string) => {
      return (key: string) => resolveTranslation(namespace, key);
    },
    useLocale: () => ({
      locale: "en",
    }),
  };
});

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace?: string) => {
    return (key: string) => resolveTranslation(namespace, key);
  },
}));

// Polyfill BroadcastChannel if not available in jsdom
if (typeof globalThis.BroadcastChannel === "undefined") {
  class MockBroadcastChannel {
    name: string;
    onmessage: ((event: MessageEvent) => void) | null = null;
    static channels: Map<string, Set<MockBroadcastChannel>> = new Map();

    constructor(name: string) {
      this.name = name;
      if (!MockBroadcastChannel.channels.has(name)) {
        MockBroadcastChannel.channels.set(name, new Set());
      }
      MockBroadcastChannel.channels.get(name)!.add(this);
    }

    postMessage(message: unknown) {
      const peers = MockBroadcastChannel.channels.get(this.name);
      if (peers) {
        peers.forEach((peer) => {
          if (peer !== this && peer.onmessage) {
            peer.onmessage(new MessageEvent("message", { data: message }));
          }
        });
      }
    }

    close() {
      const peers = MockBroadcastChannel.channels.get(this.name);
      if (peers) {
        peers.delete(this);
      }
    }
  }

  globalThis.BroadcastChannel = MockBroadcastChannel as unknown as typeof BroadcastChannel;
}

// Polyfill navigator.locks if not available in jsdom
if (typeof navigator !== "undefined" && !("locks" in navigator)) {
  const locksState = new Map<string, boolean>();
  (navigator as unknown as { locks: unknown }).locks = {
    request: async (
      name: string,
      optionsOrCallback: { ifAvailable?: boolean } | ((lock: unknown) => Promise<unknown>),
      callback?: (lock: unknown) => Promise<unknown>
    ) => {
      const cb = typeof optionsOrCallback === "function" ? optionsOrCallback : callback!;
      const opts = typeof optionsOrCallback === "object" ? optionsOrCallback : {};

      if (opts.ifAvailable && locksState.get(name)) {
        return cb(null);
      }

      locksState.set(name, true);
      try {
        return await cb({ name });
      } finally {
        locksState.delete(name);
      }
    },
  };
}

// Polyfill ResizeObserver if not available in jsdom
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// Polyfill scrollIntoView for jsdom
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
