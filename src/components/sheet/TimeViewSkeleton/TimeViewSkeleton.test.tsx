import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TimeViewSkeleton } from ".";

describe("TimeViewSkeleton", () => {
  it.each(["days", "weeks", "months"] as const)("announces %s loading and stays still", (view) => {
    const { container } = render(<TimeViewSkeleton view={view} label={`Loading ${view}`} />);

    expect(screen.getByRole("status")).toHaveTextContent(`Loading ${view}`);
    expect(container.firstElementChild).toHaveAttribute("data-skeleton", view);
    // Static blocks only: nothing animates, whatever the motion or power settings.
    expect(container.querySelector(".sheet-shimmer, [class*='animate-']")).toBeNull();
  });
});
