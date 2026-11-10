import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildOpenApiDocument } from "./openapi";

const ROOT = __dirname;

/** Every `route.ts` under `app/api/v1` as `{ path, methods }`, `[month]` written as `{month}`. */
function collectRoutes() {
  const routes: { path: string; methods: string[] }[] = [];

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name === "route.ts") {
        const relative = path.relative(ROOT, dir).split(path.sep).join("/");
        const source = fs.readFileSync(full, "utf8");
        const methods = [
          ...source.matchAll(/export (?:async )?function (GET|POST|PUT|PATCH|DELETE)\b/g),
        ].map((match) => match[1].toLowerCase());

        routes.push({ path: `/${relative.replaceAll(/\[(\w+)\]/g, "{$1}")}`, methods });
      }
    }
  }

  walk(ROOT);
  return routes;
}

describe("OpenAPI document", () => {
  const document = buildOpenApiDocument("https://app.example.com/api/v1");
  const routes = collectRoutes();

  it("finds the routes it checks", () => {
    expect(routes.length).toBeGreaterThanOrEqual(6);
  });

  it.each(collectRoutes().flatMap((route) => route.methods.map((method) => [method, route.path])))(
    "documents %s %s",
    (method, routePath) => {
      const paths = document.paths as Record<string, Record<string, unknown>>;

      expect(paths[routePath], `${routePath} is missing from openapi.ts`).toBeDefined();
      expect(paths[routePath]?.[method], `${method} ${routePath} is missing`).toBeDefined();
    },
  );

  it("documents no route that does not exist", () => {
    const served = new Set(
      routes.flatMap((route) => route.methods.map((m) => `${m} ${route.path}`)),
    );
    const documented = Object.entries(document.paths).flatMap(([routePath, operations]) =>
      Object.keys(operations).map((method) => `${method} ${routePath}`),
    );

    expect(documented.filter((operation) => !served.has(operation))).toEqual([]);
  });

  it("points servers at the given base URL and resolves every $ref", () => {
    expect(document.servers[0]?.url).toBe("https://app.example.com/api/v1");

    const text = JSON.stringify(document);
    for (const [, ref] of text.matchAll(/"\$ref":"#\/([^"]+)"/g)) {
      const target = ref
        .split("/")
        .reduce<unknown>(
          (node, key) => (node as Record<string, unknown> | undefined)?.[key],
          document,
        );
      expect(target, ref).toBeDefined();
    }
  });
});
