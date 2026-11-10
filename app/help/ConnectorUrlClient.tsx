"use client";

import { useTranslations } from "next-intl";

import { CopyValueClient } from "./CopyValueClient";

export type ConnectorUrlClientProps = {
  url: string;
};

/** The connector URL with a copy button; the URL itself comes from `authUrls.mcpResource`. */
export function ConnectorUrlClient({ url }: ConnectorUrlClientProps) {
  const t = useTranslations("Help.mcp");

  return (
    <CopyValueClient
      value={url}
      labels={{ copy: t("copyUrl"), copied: t("urlCopied"), failed: t("copyFailed") }}
    />
  );
}
