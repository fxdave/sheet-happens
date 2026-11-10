/**
 * The motion vocabulary of `/time`, as TypeScript literals.
 *
 * **The token table in `app/globals.css` is the source of truth** — `--ease-standard`,
 * `--ease-exit`, `--duration-level`, `--duration-micro`, `--duration-bar`, `--duration-step`,
 * `--duration-settle`, `--distance-step`, `--scale-zoom-in`, `--scale-zoom-out`, `--spring-thumb`,
 * `--spring-ring`, `--stagger-entry`, documented in `docs/tokens.md`. The values are repeated here
 * because Motion animates via JS outside CSS transitions and cannot interpolate a `var()`. Change
 * one and change the other.
 *
 * Durations are seconds, which is what Motion takes; the tokens are milliseconds, which is what
 * CSS takes. That is the only difference between the two lists.
 *
 * This module sits in `src/lib` rather than `app/time` because the entry cards that carry the
 * stagger live inside `WeekAgenda` and `DayAgenda`, which are library components. Nothing under
 * `src/` imports from `app/`, and inverting that for a table of numbers would be the wrong trade.
 * The `/time`-specific half of the wiring, the `LazyMotion` feature boundary, does stay in
 * `app/time/motion-features.ts`.
 */

/** `cubic-bezier(0.2, 0.7, 0.2, 1)` — the default for everything. Nothing eases in. */
export const EASE_STANDARD: [number, number, number, number] = [0.2, 0.7, 0.2, 1];

/** `cubic-bezier(0.4, 0, 1, 1)` — elements leaving, which should be quick and unremarkable. */
export const EASE_EXIT: [number, number, number, number] = [0.4, 0, 1, 1];

/** 260ms — a zoom (scope) transition: the container transform and the shared-element moves. */
export const DURATION_LEVEL = 0.26;

/** 140ms — hover, chip state, badge crossfade, a single card arriving, and every exit. */
export const DURATION_MICRO = 0.14;

/** 300ms — a capacity bar changing width. */
export const DURATION_BAR = 0.3;

/** 200ms — a date step: the shared-axis slide of the content and the period label. */
export const DURATION_STEP = 0.2;

/** 180ms — a figure changing: the one-step settle of §7.6. */
export const DURATION_SETTLE = 0.18;

/** 24px — how far the content slides on a date step. The period label slides a third of it. */
export const DISTANCE_STEP = 24;

/** 8px — the period label's own slide on a step. */
export const DISTANCE_STEP_LABEL = 8;

/** 6px — how far a settling figure travels in the direction of its change. */
export const DISTANCE_SETTLE = 6;

/** The incoming view's starting scale when zooming in ("it grows into the page"). */
export const SCALE_ZOOM_IN = 0.96;

/** The incoming view's starting scale when zooming out ("it shrinks back into its slot"). */
export const SCALE_ZOOM_OUT = 1.04;

/** 24ms — the step between entry cards entering. */
export const STAGGER_ENTRY = 0.024;

/** 12ms — the step between heat navigator rows drawing in, and between grid rows on a re-lens. */
export const STAGGER_ROW = 0.012;

/**
 * How many cards in a column actually stagger.
 *
 * A 40-entry week at 24ms each is 960ms of drizzle. Capping the *delay* rather than dropping it
 * past the cap bounds the whole cascade to 7 × 24ms = 168ms while keeping the cards in reading
 * order — dropping it would make the tenth card arrive before the third, which looks like a bug
 * rather than a restraint.
 */
export const STAGGER_CAP = 8;

/** The scope and lens thumbs, and the ribbon's selected chip. Settles in ≈ 220ms, no visible bounce. */
export const springThumb = { type: "spring", stiffness: 520, damping: 42, mass: 0.8 } as const;

/** The target ring and the capacity bars filling. */
export const springRing = { type: "spring", stiffness: 180, damping: 26 } as const;

/** A zoom transition: the shared `layoutId` morph and anything that rides along with it. */
export const levelTransition = { duration: DURATION_LEVEL, ease: EASE_STANDARD } as const;

/** A date step. */
export const stepTransition = { duration: DURATION_STEP, ease: EASE_STANDARD } as const;

/** A figure settling. */
export const settleTransition = { duration: DURATION_SETTLE, ease: EASE_STANDARD } as const;

/** A capacity bar growing or shrinking. */
export const barTransition = { duration: DURATION_BAR, ease: EASE_STANDARD } as const;

/** A micro state change: a hover reveal, a badge, a lens toggle appearing. */
export const microTransition = { duration: DURATION_MICRO, ease: EASE_STANDARD } as const;

/** Leaving. Opacity only, and faster than arriving. */
export const exitTransition = { duration: DURATION_MICRO, ease: EASE_EXIT } as const;

/**
 * Entering entry cards: opacity plus 4px of `y`, and nothing else.
 *
 * Transform and opacity only — no width, height, top or left — so the whole cascade stays on the
 * compositor. Exits carry no movement at all: they are leaving, not going somewhere.
 */
export const entryCardMotion = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
} as const;

/** Where the nth card in a column sits in the cascade. Capped — see {@link STAGGER_CAP}. */
export function entryStaggerDelay(index: number): number {
  return Math.min(Math.max(index, 0), STAGGER_CAP - 1) * STAGGER_ENTRY;
}

/** The arrival of the nth card in a column. */
export function entryEnterTransition(index: number) {
  return { duration: DURATION_MICRO, ease: EASE_STANDARD, delay: entryStaggerDelay(index) };
}

/** The arrival of the nth row of a table or a heat grid, capped like the cards. */
export function rowEnterTransition(index: number) {
  return {
    duration: DURATION_STEP,
    ease: EASE_STANDARD,
    delay: Math.min(Math.max(index, 0), STAGGER_CAP - 1) * STAGGER_ROW,
  };
}

/** The period label's own slide on a step, 8px instead of 24. */
export const labelVariants = {
  enter: (direction: 1 | -1 | 0 | undefined) => ({
    opacity: 0,
    x: (direction ?? 0) * DISTANCE_STEP_LABEL,
  }),
  center: { opacity: 1, x: 0, transition: stepTransition },
  exit: (direction: 1 | -1 | 0 | undefined) => ({
    opacity: 0,
    x: (direction ?? 0) * -DISTANCE_STEP_LABEL,
    transition: exitTransition,
  }),
} as const;

/**
 * §7.6: a figure settles, it does not roll. The old value leaves upward, the new one enters from
 * below if it went up and from above if it went down — one step, in the direction of change,
 * digits always exact. `direction` is the sign of the change; `0` for a first paint or a
 * same-value re-key, which crossfades.
 */
export const settleVariants = {
  enter: (direction: 1 | -1 | 0 | undefined) => ({
    opacity: 0,
    y: (direction ?? 0) * DISTANCE_SETTLE,
  }),
  center: { opacity: 1, y: 0, transition: settleTransition },
  exit: { opacity: 0, y: -DISTANCE_SETTLE, transition: exitTransition },
} as const;

/**
 * Stable ids for a day and for a Month project row. Kept as `layoutId`s from the old level morph;
 * `/time` now loads `domAnimation`, which has no layout projection, so they only key elements.
 */
export function dayLayoutId(isoDate: string): string {
  return `day-${isoDate}`;
}

/** See {@link dayLayoutId}. Month rows only. */
export function projectLayoutId(projectId: string): string {
  return `project-${projectId}`;
}
