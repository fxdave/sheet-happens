import { describe, expect, it } from "vitest";

import {
  DISTANCE_STEP,
  DURATION_LEVEL,
  DURATION_SETTLE,
  DURATION_STEP,
  EASE_STANDARD,
  SCALE_ZOOM_IN,
  SCALE_ZOOM_OUT,
  STAGGER_CAP,
  STAGGER_ENTRY,
  dayLayoutId,
  entryEnterTransition,
  entryStaggerDelay,
  settleVariants,
  springThumb,
} from "./motion";

describe("motion tokens", () => {
  /**
   * The literals here mirror the motion tokens in `app/globals.css`, which Motion cannot read
   * because it animates outside CSS. This asserts the mirror rather than the values: milliseconds
   * there, seconds here, and nothing else.
   */
  it("mirrors the CSS token table in seconds", () => {
    expect(DURATION_LEVEL * 1000).toBe(260);
    expect(DURATION_STEP * 1000).toBe(200);
    expect(DURATION_SETTLE * 1000).toBe(180);
    expect(DISTANCE_STEP).toBe(24);
    expect(SCALE_ZOOM_IN).toBe(0.96);
    expect(SCALE_ZOOM_OUT).toBe(1.04);
    expect(STAGGER_ENTRY * 1000).toBe(24);
    expect(EASE_STANDARD).toEqual([0.2, 0.7, 0.2, 1]);
    expect(springThumb).toEqual({ type: "spring", stiffness: 520, damping: 42, mass: 0.8 });
  });

  it("keeps every move under 300ms", () => {
    for (const duration of [DURATION_LEVEL, DURATION_STEP, DURATION_SETTLE]) {
      expect(duration).toBeLessThan(0.3);
    }
  });
});

describe("settleVariants", () => {
  it("enters from below when the figure went up and from above when it went down", () => {
    expect(settleVariants.enter(1)).toEqual({ opacity: 0, y: 6 });
    expect(settleVariants.enter(-1)).toEqual({ opacity: 0, y: -6 });
    expect(settleVariants.enter(0)).toEqual({ opacity: 0, y: 0 });
  });
});

describe("entryStaggerDelay", () => {
  it("steps one card at a time up to the cap", () => {
    expect(entryStaggerDelay(0)).toBe(0);
    expect(entryStaggerDelay(1)).toBeCloseTo(STAGGER_ENTRY);
    expect(entryStaggerDelay(7)).toBeCloseTo(7 * STAGGER_ENTRY);
  });

  /** The arithmetic: 40 cards at 24ms each would be 960ms of drizzle. */
  it("holds every card past the cap at the cap, so a dense column cannot drizzle", () => {
    const capped = entryStaggerDelay(STAGGER_CAP - 1);

    expect(entryStaggerDelay(STAGGER_CAP)).toBe(capped);
    expect(entryStaggerDelay(39)).toBe(capped);
    expect(capped).toBeLessThan(0.2);
  });

  it("keeps the cascade in reading order", () => {
    const delays = Array.from({ length: 20 }, (_, index) => entryStaggerDelay(index));

    expect(delays).toEqual([...delays].sort((a, b) => a - b));
  });

  it("survives an index it should never be given", () => {
    expect(entryStaggerDelay(-3)).toBe(0);
  });
});

describe("entryEnterTransition", () => {
  it("carries the stagger as the delay and nothing else", () => {
    expect(entryEnterTransition(2)).toEqual({
      duration: expect.any(Number),
      ease: EASE_STANDARD,
      delay: entryStaggerDelay(2),
    });
  });
});

describe("layout ids", () => {
  it("names a day", () => {
    expect(dayLayoutId("2026-09-02")).toBe("day-2026-09-02");
  });
});
