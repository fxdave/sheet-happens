import en from "@/messages/en.json";
import hu from "@/messages/hu.json";
import { describe, expect, it } from "vitest";

import { supportedLocales } from "./locales";

/**
 * Every user-facing string must exist in both locales (see CLAUDE.md). Report PDF copy is
 * especially easy to drift because it never renders in the browser, so nobody notices a
 * missing key until an export comes out in the wrong language.
 */

type MessageTree = { [key: string]: string | MessageTree };

function collectKeys(tree: MessageTree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const keyPath = prefix ? `${prefix}.${key}` : key;

    return typeof value === "string" ? [keyPath] : collectKeys(value, keyPath);
  });
}

describe("message catalogues", () => {
  it("covers every supported locale", () => {
    expect(supportedLocales).toEqual(["hu", "en"]);
  });

  it("defines the same keys in both locales", () => {
    const enKeys = collectKeys(en as MessageTree).sort();
    const huKeys = collectKeys(hu as MessageTree).sort();

    expect(huKeys.filter((key) => !enKeys.includes(key))).toEqual([]);
    expect(enKeys.filter((key) => !huKeys.includes(key))).toEqual([]);
  });

  it("has no empty translations", () => {
    for (const [locale, messages] of [
      ["en", en],
      ["hu", hu],
    ] as const) {
      const empty = collectKeys(messages as MessageTree).filter((key) => {
        const value = key
          .split(".")
          .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], messages);

        return typeof value === "string" && value.trim() === "";
      });

      expect(empty, `empty messages in ${locale}`).toEqual([]);
    }
  });
});
