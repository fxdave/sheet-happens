import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import en from "@/messages/en.json";
import type { MemberMonthOverview } from "@/src/server/time-tracking";

vi.mock("./actions", () => ({
  saveMonthlyHourDeclarationAction: vi.fn(),
  uploadDeclarationProofAction: vi.fn(),
}));

const { DeclaredMonthSection } = await import("./DeclaredMonthSection");

const actions = {
  pending: false,
  openEntry: vi.fn(),
  deleteEntry: vi.fn(),
  continueEntry: vi.fn(),
  stopTimer: vi.fn(),
  run: vi.fn(),
  notifyResult: vi.fn(),
};

function month(declared: MemberMonthOverview["declared"]): MemberMonthOverview {
  return {
    monthStart: "2026-11-01",
    monthEnd: "2026-11-30",
    days: [],
    trackedMinutes: 0,
    declaredMinutes: 0,
    totalMinutes: 0,
    tracked: [],
    declared,
  };
}

function renderSection(overview: MemberMonthOverview, monthLocked = false) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <DeclaredMonthSection month={overview} monthLocked={monthLocked} actions={actions} />
    </NextIntlClientProvider>,
  );
}

describe("DeclaredMonthSection", () => {
  it("offers the month's declaration form under its heading", () => {
    renderSection(
      month([
        {
          projectId: "nimbus",
          assignmentId: "a1",
          name: "Nimbus",
          color: "#c1b1f9",
          minutes: null,
          note: "",
          proof: null,
        },
      ]),
    );

    expect(screen.getByRole("region", { name: "Declared monthly" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nimbus, declared hours")).toBeEnabled();
  });

  it("renders nothing without declared projects", () => {
    const { container } = renderSection(month([]));

    expect(container).toBeEmptyDOMElement();
  });
});
