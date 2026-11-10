import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useResourceSaver } from "./use-resource-saver";

afterEach(() => {
  document.documentElement.removeAttribute("data-resource-saver");
});

describe("useResourceSaver", () => {
  it("is false without the data-resource-saver attribute", () => {
    const { result } = renderHook(() => useResourceSaver());

    expect(result.current).toBe(false);
  });

  it("is true when <html> carries the attribute", () => {
    document.documentElement.setAttribute("data-resource-saver", "");
    const { result } = renderHook(() => useResourceSaver());

    expect(result.current).toBe(true);
  });

  it("re-renders when the attribute is added and removed", async () => {
    const { result } = renderHook(() => useResourceSaver());

    await act(async () => document.documentElement.setAttribute("data-resource-saver", ""));
    await waitFor(() => expect(result.current).toBe(true));

    await act(async () => document.documentElement.removeAttribute("data-resource-saver"));
    await waitFor(() => expect(result.current).toBe(false));
  });

  it("ignores changes to other attributes", async () => {
    let renders = 0;
    renderHook(() => {
      renders += 1;
      return useResourceSaver();
    });
    const before = renders;

    await act(async () => document.documentElement.setAttribute("data-theme-probe", "x"));
    document.documentElement.removeAttribute("data-theme-probe");

    expect(renders).toBe(before);
  });
});
