import { describe, expect, it } from "vitest";

import { authUrls } from "@/src/server/auth/auth-urls";

import { GET } from "./route";

describe("GET /api/v1/openapi.json", () => {
  it("serves the spec without a token, with the app's own base URL", async () => {
    const response = GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.openapi).toBe("3.1.0");
    expect(body.servers[0].url).toBe(`${authUrls.origin}/api/v1`);
  });
});
