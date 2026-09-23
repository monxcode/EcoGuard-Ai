// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppProvider, useApp } from "../context/AppContext";
import { ErrorState, PageSkeleton } from "../components/ui/states";
import { useApi } from "./useApi";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

interface ProbePayload {
  city: string;
}

function Probe() {
  const { settings } = useApp();
  const { data, loading, error, reload } = useApi<ProbePayload>(
    `/api/dashboard?locationId=${settings.locationId}`,
  );
  if (loading && !data) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <ErrorState message="No dashboard data returned." onRetry={reload} />;
  return <p>city:{data.city}</p>;
}

function Switchers() {
  const { setLocation } = useApp();
  return (
    <div>
      <button type="button" onClick={() => setLocation("jaipur")}>
        to-jaipur
      </button>
      <button type="button" onClick={() => setLocation("delhi")}>
        to-delhi
      </button>
    </div>
  );
}

function Harness() {
  return (
    <AppProvider>
      <Probe />
      <Switchers />
    </AppProvider>
  );
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const fetchedUrls: string[] = [];
let resolveJaipur: ((r: Response) => void) | null = null;

function routeFetch(input: RequestInfo | URL): Response | Promise<Response> {
  const url = String(input);
  fetchedUrls.push(url);
  if (url.startsWith("/api/health")) return jsonResponse({ demoMode: false });
  if (url.includes("locationId=udaipur")) return jsonResponse({ city: "Udaipur" });
  if (url.includes("locationId=jaipur")) {
    return new Promise<Response>((resolve) => {
      resolveJaipur = resolve;
    });
  }
  if (url.includes("locationId=delhi")) {
    return jsonResponse({ error: { message: "Delhi service unavailable." } }, 503);
  }
  return jsonResponse({ error: { message: "Not found." } }, 404);
}

function clickButton(rootEl: HTMLElement, label: string): void {
  const btn = Array.from(rootEl.querySelectorAll("button")).find(
    (b) => b.textContent === label,
  );
  if (!btn) throw new Error(`Button "${label}" not found.`);
  btn.click();
}

describe("useApi location switching", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    localStorage.clear();
    fetchedUrls.length = 0;
    resolveJaipur = null;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => routeFetch(input)),
    );
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(<Harness />);
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it("switches city instantly: loading state, no stale data, correct URL, new city", async () => {
    expect(container.textContent).toContain("city:Udaipur");
    expect(fetchedUrls).toContain("/api/dashboard?locationId=udaipur");

    await act(async () => {
      clickButton(container, "to-jaipur");
    });

    expect(container.textContent).not.toContain("city:Udaipur");
    expect(container.textContent).not.toContain("Something went wrong");
    expect(container.querySelector('[aria-label="Loading page"]')).not.toBeNull();
    expect(fetchedUrls).toContain("/api/dashboard?locationId=jaipur");

    await act(async () => {
      resolveJaipur?.(jsonResponse({ city: "Jaipur" }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain("city:Jaipur");
    expect(container.querySelector('[aria-label="Loading page"]')).toBeNull();
  });

  it("shows a graceful error for the new location with no stale city data", async () => {
    expect(container.textContent).toContain("city:Udaipur");

    await act(async () => {
      clickButton(container, "to-delhi");
    });

    expect(container.textContent).not.toContain("city:Udaipur");
    expect(container.textContent).not.toContain("city:");
    expect(container.textContent).toContain("Something went wrong");
    expect(container.textContent).toContain("Delhi service unavailable.");
    expect(fetchedUrls).toContain("/api/dashboard?locationId=delhi");
  });
});
