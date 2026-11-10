import type { Route } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { BookOpen, Braces, FileText, Lock, Pencil, Plug, type LucideIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { AppShell } from "@/src/components/layout/AppShell";
import { MarkdownArticle } from "@/src/components/sheet/MarkdownArticle";
import { Badge } from "@/src/components/ui/Badge";
import { Button } from "@/src/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/Card";
import { SectionHead } from "@/src/components/ui/SectionHead";
import { cn } from "@/src/lib/utils";
import {
  mapMemberToShellProfile,
  mapMemberToShellRole,
  mapMemberToShellUser,
  requireActiveAppMember,
} from "@/src/server/auth/app-access";
import { authUrls } from "@/src/server/auth/auth-urls";
import {
  getDefaultWelcomeInfoPage,
  getManualTopicsForAccess,
  getPublishedInfoPage,
  HELP_WELCOME_INFO_PAGE_SLUG,
  type ManualTopicAudience,
  type ManualTopicView,
} from "@/src/server/info-pages";
import {
  addDays,
  formatDateOnly,
  getMonthStart,
  getTodayIsoInTimezone,
  parseDateOnly,
} from "@/src/server/time-tracking";
import { ApiPanel } from "./ApiPanel";
import { ConnectorUrlClient } from "./ConnectorUrlClient";

type HelpPageProps = {
  searchParams?: Promise<{
    tab?: string;
  }>;
};

type HelpTab = "welcome" | "manual" | "connector" | "api";

export const dynamic = "force-dynamic";

export default async function HelpPage({ searchParams }: HelpPageProps) {
  const { member } = await requireActiveAppMember("/help");
  const resolvedSearchParams = (await searchParams) ?? {};
  const activeTab = resolveTab(resolvedSearchParams.tab);
  const locale = await getLocale();
  const t = await getTranslations("Help");
  const defaultWelcome = getDefaultWelcomeInfoPage(locale);
  const publishedWelcome = await getPublishedInfoPage(HELP_WELCOME_INFO_PAGE_SLUG);
  const welcome = publishedWelcome ?? {
    ...defaultWelcome,
    version: null,
    updatedAt: null,
  };
  const topics = getManualTopicsForAccess({
    locale,
    role: member.role,
    profile: member.currentProfile,
  });

  return (
    <AppShell
      current="help"
      role={mapMemberToShellRole(member)}
      profile={mapMemberToShellProfile(member)}
      user={mapMemberToShellUser(member)}
    >
      <section className="mx-auto grid w-full max-w-[73.75rem] gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <SectionHead
          eyebrow={t("eyebrow")}
          title={t("title")}
          subtitle={t("subtitle")}
          actions={
            member.role === "ADMIN" ? (
              <Button asChild variant="soft" icon={Pencil}>
                <Link href={"/admin/info" as Route}>{t("actions.editWelcome")}</Link>
              </Button>
            ) : null
          }
        />

        <nav
          className="inline-flex w-fit max-w-full flex-wrap rounded-[var(--radius-pill)] border border-border bg-secondary p-1"
          aria-label={t("tabs.label")}
        >
          <HelpTabLink active={activeTab === "welcome"} href="/help?tab=welcome" icon={FileText}>
            {t("tabs.welcome")}
          </HelpTabLink>
          <HelpTabLink active={activeTab === "manual"} href="/help?tab=manual" icon={BookOpen}>
            {t("tabs.manual")}
          </HelpTabLink>
          <HelpTabLink active={activeTab === "connector"} href="/help?tab=connector" icon={Plug}>
            {t("tabs.connector")}
          </HelpTabLink>
          <HelpTabLink active={activeTab === "api"} href="/help?tab=api" icon={Braces}>
            {t("tabs.api")}
          </HelpTabLink>
        </nav>

        {activeTab === "api" ? (
          <ApiPanel
            baseUrl={authUrls.restApi}
            isAdmin={member.role === "ADMIN"}
            {...apiExampleDates(member.timezone)}
          />
        ) : activeTab === "connector" ? (
          /*
           * The connector recipe is static copy, unlike the Welcome tab: it describes how Claude is
           * wired to this deployment, which is a property of the code and not something an admin
           * should be editing as an info page.
           */
          <ConnectorPanel resourceUrl={authUrls.mcpResource} />
        ) : activeTab === "welcome" ? (
          <WelcomePanel
            title={welcome.title}
            markdown={welcome.bodyMarkdown}
            badge={publishedWelcome ? t("welcome.publishedBadge") : t("welcome.fallbackBadge")}
            version={
              publishedWelcome
                ? t("welcome.version", {
                    version: publishedWelcome.version,
                  })
                : null
            }
            description={t("welcome.description")}
          />
        ) : (
          <ManualPanel
            topics={topics}
            labels={{
              title: t("manual.title"),
              subtitle: t("manual.subtitle"),
              available: t("manual.available"),
              restricted: t("manual.restricted"),
              restrictedMessage: t("manual.restrictedMessage"),
              audienceAll: t("audience.all"),
              audienceContractor: t("audience.contractor"),
              audienceAdmin: t("audience.admin"),
            }}
          />
        )}
      </section>
    </AppShell>
  );
}

/**
 * How a member connects Claude to their own hours (`docs/mcp-server.md` §12).
 *
 * The URL comes from `authUrls.mcpResource` rather than from the copy: it is the RFC 8707 resource
 * identifier the OAuth layer audience-binds tokens to, so a hardcoded string here could drift from
 * the one the server actually answers on — and this way the development deployment prints its own
 * host instead of the production one.
 */
async function ConnectorPanel({ resourceUrl }: { resourceUrl: string }) {
  const t = await getTranslations("Help.mcp");

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
            <p className="text-xs font-semibold uppercase text-muted-foreground">{t("urlLabel")}</p>
            <ConnectorUrlClient url={resourceUrl} />
            <p className="text-sm leading-6 text-muted-foreground">{t("urlHint")}</p>
          </div>
        </CardContent>
      </Card>

      <Card variant="flat" density="lg">
        <CardHeader className="block">
          <CardTitle className="text-lg">{t("app.title")}</CardTitle>
          <CardDescription>{t("app.description")}</CardDescription>
        </CardHeader>
        <CardContent className="gap-4">
          <ConnectorStepGroup
            title={t("app.teamTitle")}
            steps={[t("app.teamOwner"), t("app.teamMember")]}
          />
          <ConnectorStepGroup title={t("app.personalTitle")} steps={[t("app.personalStep")]} />
          <p className="text-sm leading-6 text-muted-foreground">{t("app.tools")}</p>
        </CardContent>
      </Card>

      <Card variant="flat" density="lg">
        <CardHeader className="block">
          <CardTitle className="text-lg">{t("code.title")}</CardTitle>
          <CardDescription>{t("code.description")}</CardDescription>
        </CardHeader>
        <CardContent className="gap-3">
          <pre className="overflow-x-auto rounded-[var(--radius-md)] border border-border bg-background/55 px-3 py-2 font-mono text-xs leading-6 text-foreground">
            <code>
              {`claude mcp add --transport http sheet-happens ${resourceUrl}\nclaude mcp login sheet-happens`}
            </code>
          </pre>
          <p className="text-sm leading-6 text-muted-foreground">{t("code.loginHint")}</p>
        </CardContent>
      </Card>

      <Card variant="flat" density="lg">
        <CardHeader className="block">
          <CardTitle className="text-lg">{t("ownership.title")}</CardTitle>
          <CardDescription>{t("ownership.body")}</CardDescription>
        </CardHeader>
        <CardContent className="gap-4">
          <p className="text-sm leading-6 text-muted-foreground">{t("ownership.disconnect")}</p>
          <div>
            <Button asChild variant="soft" icon={Plug}>
              <Link href={"/settings?section=connectedApps" as Route}>
                {t("ownership.openConnectedApps")}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ConnectorStepGroup({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="grid gap-2">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <ol className="grid list-decimal gap-1.5 pl-5 text-sm leading-6 text-muted-foreground [&_li::marker]:text-accent">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </div>
  );
}

function WelcomePanel({
  title,
  markdown,
  badge,
  version,
  description,
}: {
  title: string;
  markdown: string;
  badge: string;
  version: string | null;
  description: string;
}) {
  return (
    <Card variant="elevated" density="lg">
      <CardHeader className="block">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge tone="info" dot>
            {badge}
          </Badge>
          {version ? <span className="text-xs text-muted-foreground">{version}</span> : null}
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <MarkdownArticle markdown={markdown} />
      </CardContent>
    </Card>
  );
}

function ManualPanel({
  topics,
  labels,
}: {
  topics: ManualTopicView[];
  labels: {
    title: string;
    subtitle: string;
    available: string;
    restricted: string;
    restrictedMessage: string;
    audienceAll: string;
    audienceContractor: string;
    audienceAdmin: string;
  };
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <h3 className="text-xl font-semibold">{labels.title}</h3>
        <p className="text-sm leading-6 text-muted-foreground">{labels.subtitle}</p>
      </div>
      <div className="grid gap-4">
        {topics.map((topic) => (
          <ManualTopicCard key={topic.id} topic={topic} labels={labels} />
        ))}
      </div>
    </div>
  );
}

function ManualTopicCard({
  topic,
  labels,
}: {
  topic: ManualTopicView;
  labels: {
    available: string;
    restricted: string;
    restrictedMessage: string;
    audienceAll: string;
    audienceContractor: string;
    audienceAdmin: string;
  };
}) {
  const accessLabel = topic.accessible ? labels.available : labels.restricted;

  return (
    <Card variant={topic.accessible ? "flat" : "warning"} density="lg">
      <CardHeader className="block">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge tone={topic.accessible ? "success" : "warning"} dot>
            {accessLabel}
          </Badge>
          <Badge tone="neutral">{audienceLabel(topic.audience, labels)}</Badge>
        </div>
        <CardTitle className="text-lg">{topic.title}</CardTitle>
        {topic.accessible ? <CardDescription>{topic.summary}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {topic.accessible ? (
          <MarkdownArticle markdown={topic.bodyMarkdown} />
        ) : (
          <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-warning/35 bg-warning-soft p-4 text-sm leading-6 text-muted-foreground">
            <Lock className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
            <p>{labels.restrictedMessage}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HelpTabLink({
  active,
  href,
  icon: Icon,
  children,
}: {
  active: boolean;
  href: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <Link
      href={href as Route}
      className={cn(
        "inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-pill)] px-4 py-2 text-sm font-semibold text-muted-foreground transition",
        active && "bg-accent text-accent-foreground shadow-soft",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="size-4" aria-hidden="true" />
      {children}
    </Link>
  );
}

function audienceLabel(
  audience: ManualTopicAudience,
  labels: {
    audienceAll: string;
    audienceContractor: string;
    audienceAdmin: string;
  },
) {
  if (audience === "admin") return labels.audienceAdmin;
  if (audience === "contractor") return labels.audienceContractor;
  return labels.audienceAll;
}

function resolveTab(tab: string | undefined): HelpTab {
  if (tab === "manual") return "manual";
  if (tab === "connector") return "connector";
  if (tab === "api") return "api";

  return "welcome";
}

/** Example dates for the curl recipes: the last seven days and the previous month, member-local. */
function apiExampleDates(timezone: string) {
  const today = parseDateOnly(getTodayIsoInTimezone(timezone));
  const lastMonth = getMonthStart(addDays(getMonthStart(today), -1));

  return {
    today: formatDateOnly(today),
    weekAgo: formatDateOnly(addDays(today, -6)),
    lastMonth: formatDateOnly(lastMonth).slice(0, 7),
  };
}
