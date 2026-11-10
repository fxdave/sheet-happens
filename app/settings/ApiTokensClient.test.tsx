import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import en from "@/messages/en.json";
import hu from "@/messages/hu.json";
import type { ApiTokenView } from "@/src/server/api-tokens/tokens";

import { ApiTokensClient } from "./ApiTokensClient";

const createApiTokenAction = vi.fn();
const revokeApiTokenAction = vi.fn();
const refresh = vi.fn();

vi.mock("./actions", () => ({
  createApiTokenAction: (input: unknown) => createApiTokenAction(input),
  revokeApiTokenAction: (input: unknown) => revokeApiTokenAction(input),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const token: ApiTokenView = {
  id: "33333333-3333-4333-8333-333333333333",
  name: "Invoice script",
  prefix: "sh_pat_AbCd1234",
  scopes: ["hours:read", "timesheets:write"],
  createdAt: "2026-11-01T08:00:00.000Z",
  lastUsedAt: null,
  expiresAt: "2027-02-01T08:00:00.000Z",
  status: "active",
};

function renderClient(
  props: Partial<React.ComponentProps<typeof ApiTokensClient>> = {},
  locale: "en" | "hu" = "en",
) {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : hu}>
      <ApiTokensClient tokens={[token]} canGrantAdminScopes={false} {...props} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  createApiTokenAction.mockResolvedValue({
    status: "success",
    message: "API token created.",
    token: "sh_pat_plaintextsecret",
  });
  revokeApiTokenAction.mockResolvedValue({ status: "success", message: "API token revoked." });
});

describe("ApiTokensClient", () => {
  it("lists name, prefix, scopes and dates, never a secret", () => {
    renderClient();

    const list = screen.getByRole("list", { name: "Your API tokens" });
    expect(within(list).getByText("Invoice script")).toBeInTheDocument();
    expect(within(list).getByText("sh_pat_AbCd1234…")).toBeInTheDocument();
    expect(within(list).getByText("Read my hours")).toBeInTheDocument();
    expect(within(list).getByText("Submit my timesheet")).toBeInTheDocument();
    expect(within(list).getByText("Never")).toBeInTheDocument();
  });

  it("shows the empty state", () => {
    renderClient({ tokens: [] });

    expect(screen.getByText("No API tokens")).toBeInTheDocument();
  });

  it("offers the admin scope only to admins", async () => {
    const user = userEvent.setup();
    const { unmount } = renderClient();

    await user.click(screen.getByRole("button", { name: "Create token" }));
    expect(screen.queryByText("Read everyone's hours")).not.toBeInTheDocument();
    unmount();

    renderClient({ canGrantAdminScopes: true });
    await user.click(screen.getByRole("button", { name: "Create token" }));
    expect(screen.getByText("Read everyone's hours")).toBeInTheDocument();
  });

  it("creates a token and shows the plaintext exactly once", async () => {
    const user = userEvent.setup();
    renderClient();

    await user.click(screen.getByRole("button", { name: "Create token" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/Name/), "CI export");
    await user.click(within(dialog).getByRole("checkbox", { name: /Submit my timesheet/ }));
    await user.click(within(dialog).getByRole("radio", { name: "1 year" }));
    await user.click(within(dialog).getByRole("button", { name: "Create token" }));

    expect(createApiTokenAction).toHaveBeenCalledWith({
      name: "CI export",
      scopes: ["hours:read", "timesheets:write"],
      expiry: "365",
    });
    expect(await screen.findByText("sh_pat_plaintextsecret")).toBeInTheDocument();
    expect(screen.getByText(/You won't see this token again/)).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Done" }));
    await user.click(screen.getByRole("button", { name: "Create token" }));
    expect(screen.queryByText("sh_pat_plaintextsecret")).not.toBeInTheDocument();
  });

  it("shows a creation error inside the dialog", async () => {
    createApiTokenAction.mockResolvedValue({ status: "error", message: "Give the token a name." });
    const user = userEvent.setup();
    renderClient();

    await user.click(screen.getByRole("button", { name: "Create token" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/Name/), "x");
    await user.click(within(dialog).getByRole("button", { name: "Create token" }));

    expect(await within(dialog).findByText("Give the token a name.")).toBeInTheDocument();
  });

  it("asks before revoking", async () => {
    const user = userEvent.setup();
    renderClient();

    await user.click(screen.getByRole("button", { name: "Revoke Invoice script" }));
    expect(revokeApiTokenAction).not.toHaveBeenCalled();

    const dialog = screen.getByRole("dialog", { name: "Revoke this token?" });
    await user.click(within(dialog).getByRole("button", { name: "Revoke" }));

    expect(revokeApiTokenAction).toHaveBeenCalledWith({ tokenId: token.id });
    expect(await screen.findByText("API token revoked.")).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });

  it("renders in Hungarian", () => {
    renderClient({}, "hu");

    expect(screen.getByRole("button", { name: "Token létrehozása" })).toBeInTheDocument();
    expect(screen.getByText("Saját órák olvasása")).toBeInTheDocument();
  });
});
