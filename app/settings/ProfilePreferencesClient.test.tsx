import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import en from "@/messages/en.json";
import { updateResourceSaverAction } from "./actions";
import { ProfilePreferencesClient } from "./ProfilePreferencesClient";

vi.mock("./actions", () => ({
  deleteMemberAvatarAction: vi.fn(),
  updateMemberDurationDisplayFormatAction: vi.fn(),
  updateMemberTimezoneAction: vi.fn(),
  updateResourceSaverAction: vi.fn(),
  uploadMemberAvatarAction: vi.fn(),
}));

const member = {
  name: "Ada Lovelace",
  initials: "AL",
  timezone: "Europe/Budapest",
  durationDisplayFormat: "DECIMAL_HOURS" as const,
};

function renderPreferences() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ProfilePreferencesClient
        member={member}
        timezoneOptions={[{ value: "Europe/Budapest", label: "Europe/Budapest" }]}
      />
    </NextIntlClientProvider>,
  );
}

const resourceSaverSwitch = () => screen.getByRole("switch", { name: "Resource saver" });

beforeEach(() => {
  // The real action sets the cookie and revalidates the layout, which re-renders the attribute.
  vi.mocked(updateResourceSaverAction).mockImplementation(async (enabled) => {
    document.documentElement.toggleAttribute("data-resource-saver", enabled);
  });
});

afterEach(() => {
  document.documentElement.removeAttribute("data-resource-saver");
  vi.clearAllMocks();
});

describe("ProfilePreferencesClient resource saver", () => {
  it("renders off when <html> has no data-resource-saver attribute", () => {
    renderPreferences();

    expect(resourceSaverSwitch()).not.toBeChecked();
  });

  it("renders on when <html> has the data-resource-saver attribute", () => {
    document.documentElement.setAttribute("data-resource-saver", "");
    renderPreferences();

    expect(resourceSaverSwitch()).toBeChecked();
  });

  it("turns the mode on through the action", async () => {
    const user = userEvent.setup();
    renderPreferences();

    await user.click(resourceSaverSwitch());

    expect(updateResourceSaverAction).toHaveBeenCalledExactlyOnceWith(true);
    await waitFor(() => expect(resourceSaverSwitch()).toBeChecked());
  });

  it("turns the mode off through the action", async () => {
    const user = userEvent.setup();
    document.documentElement.setAttribute("data-resource-saver", "");
    renderPreferences();

    await user.click(resourceSaverSwitch());

    expect(updateResourceSaverAction).toHaveBeenCalledExactlyOnceWith(false);
    await waitFor(() => expect(resourceSaverSwitch()).not.toBeChecked());
  });

  it("follows the attribute when the layout re-renders it", async () => {
    renderPreferences();

    await act(async () => document.documentElement.setAttribute("data-resource-saver", ""));

    await waitFor(() => expect(resourceSaverSwitch()).toBeChecked());
  });
});
