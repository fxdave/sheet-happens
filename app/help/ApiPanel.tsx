import type { Route } from "next";
import Link from "next/link";
import { FileJson, KeyRound } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Badge } from "@/src/components/ui/Badge";
import { Button } from "@/src/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/Card";
import { API_TOKEN_SCOPES, isAdminApiTokenScope } from "@/src/server/api-tokens/scopes";
import { CopyValueClient } from "./CopyValueClient";

type Endpoint = {
  id: "hours" | "timesheets" | "timesheet" | "submit" | "invoice";
  method: "GET" | "POST";
  path: string;
  scope: string;
  curl: string;
};

/**
 * The REST API recipe (`docs/rest-api.md`). The base URL comes from `authUrls.restApi`, so every
 * example quotes the deployment the reader is on.
 */
export async function ApiPanel({
  baseUrl,
  today,
  weekAgo,
  lastMonth,
  isAdmin,
}: {
  baseUrl: string;
  today: string;
  weekAgo: string;
  lastMonth: string;
  isAdmin: boolean;
}) {
  const t = await getTranslations("Help.api");
  const scopesT = await getTranslations("Settings.apiTokens.scopes");
  const auth = '-H "Authorization: Bearer $TOKEN"';
  const year = today.slice(0, 4);
  const endpoints: Endpoint[] = [
    {
      id: "hours",
      method: "GET",
      path: "/hours",
      scope: "hours:read",
      curl: `curl ${auth} \\\n  "${baseUrl}/hours?from=${weekAgo}&to=${today}"`,
    },
    {
      id: "timesheets",
      method: "GET",
      path: "/timesheets",
      scope: "timesheets:read",
      curl: `curl ${auth} \\\n  "${baseUrl}/timesheets?year=${year}"`,
    },
    {
      id: "timesheet",
      method: "GET",
      path: "/timesheets/{month}",
      scope: "timesheets:read",
      curl: `curl ${auth} \\\n  "${baseUrl}/timesheets/${lastMonth}"`,
    },
    {
      id: "submit",
      method: "POST",
      path: "/timesheets/{month}/submit",
      scope: "timesheets:write",
      curl: `curl -X POST ${auth} \\\n  "${baseUrl}/timesheets/${lastMonth}/submit"`,
    },
    {
      id: "invoice",
      method: "POST",
      path: "/timesheets/{month}/invoice",
      scope: "timesheets:write",
      curl: `curl ${auth} \\\n  -F invoiceNumber=INV-${lastMonth} -F declaredAmount=1000.00 \\\n  -F currencyCode=EUR -F file=@invoice.pdf \\\n  "${baseUrl}/timesheets/${lastMonth}/invoice"`,
    },
  ];
  const copyLabels = { copy: t("copy"), copied: t("copied"), failed: t("copyFailed") };
  const errorCodes = ["400", "401", "403", "404", "409", "413", "415", "422", "429"] as const;

  return (
    <div className="grid max-w-3xl gap-4">
      <Card variant="elevated" density="lg">
        <CardHeader className="block">
          <Badge tone="info" dot>
            {t("badge")}
          </Badge>
          <CardTitle className="mt-3 text-xl">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className="gap-4">
          <div className="grid gap-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              {t("baseUrlLabel")}
            </p>
            <CopyValueClient value={baseUrl} labels={copyLabels} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="soft" icon={KeyRound}>
              <Link href={"/settings?section=apiTokens" as Route}>{t("createToken")}</Link>
            </Button>
            <Button asChild variant="ghost" icon={FileJson}>
              <a href={`${baseUrl}/openapi.json`} target="_blank" rel="noreferrer">
                {t("openApi")}
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card variant="flat" density="lg">
        <CardHeader className="block">
          <CardTitle className="text-lg">{t("token.title")}</CardTitle>
          <CardDescription>{t("token.description")}</CardDescription>
        </CardHeader>
        <CardContent className="gap-4">
          <ol className="grid list-decimal gap-1.5 pl-5 text-sm leading-6 text-muted-foreground [&_li::marker]:text-accent">
            <li>{t("token.step1")}</li>
            <li>{t("token.step2")}</li>
            <li>{t("token.step3")}</li>
          </ol>
          <dl className="grid gap-3">
            {API_TOKEN_SCOPES.filter((scope) => isAdmin || !isAdminApiTokenScope(scope)).map(
              (scope) => (
                <div key={scope} className="grid gap-1 sm:grid-cols-[11rem_minmax(0,1fr)]">
                  <dt>
                    <code className="font-mono text-xs text-foreground">{scope}</code>
                  </dt>
                  <dd className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {scopesT(`${scope.replaceAll(":", "_")}.title`)}
                    </span>
                    {" — "}
                    {scopesT(`${scope.replaceAll(":", "_")}.description`)}
                  </dd>
                </div>
              ),
            )}
          </dl>
        </CardContent>
      </Card>

      <Card variant="flat" density="lg">
        <CardHeader className="block">
          <CardTitle className="text-lg">{t("endpoints.title")}</CardTitle>
          <CardDescription>{t("endpoints.description")}</CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          {endpoints.map((endpoint) => (
            <section key={endpoint.id} className="grid min-w-0 gap-2">
              <h4 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                <Badge tone={endpoint.method === "GET" ? "success" : "warning"}>
                  {endpoint.method}
                </Badge>
                <code className="break-all font-mono text-sm">{endpoint.path}</code>
                <code className="font-mono text-xs text-muted-foreground">{endpoint.scope}</code>
              </h4>
              <p className="text-sm leading-6 text-muted-foreground">
                {t(`endpoints.${endpoint.id}`)}
              </p>
              <CopyValueClient
                value={endpoint.curl}
                labels={copyLabels}
                valueLabel={t("curlLabel", { method: endpoint.method, path: endpoint.path })}
                variant="block"
              />
            </section>
          ))}
        </CardContent>
      </Card>

      <Card variant="flat" density="lg">
        <CardHeader className="block">
          <CardTitle className="text-lg">{t("errors.title")}</CardTitle>
          <CardDescription>{t("errors.description")}</CardDescription>
        </CardHeader>
        <CardContent className="gap-4">
          <pre className="overflow-x-auto rounded-[var(--radius-md)] border border-border bg-background/55 px-3 py-2 font-mono text-xs leading-6 text-foreground">
            <code>{`{ "error": { "code": "MONTH_LOCKED", "message": "…" } }`}</code>
          </pre>
          <dl className="grid gap-2">
            {errorCodes.map((status) => (
              <div key={status} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-2 text-sm">
                <dt className="font-mono font-semibold text-foreground">{status}</dt>
                <dd className="text-muted-foreground">{t(`errors.status${status}`)}</dd>
              </div>
            ))}
          </dl>
          <ul className="grid list-disc gap-1.5 pl-5 text-sm leading-6 text-muted-foreground">
            <li>{t("limits.rate")}</li>
            <li>{t("limits.range")}</li>
            <li>{t("limits.upload")}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
