"use client";

import { AlertTriangle, Check, Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { EmptyState } from "@/src/components/sheet/EmptyState";
import { Badge } from "@/src/components/ui/Badge";
import { Button } from "@/src/components/ui/Button";
import { Checkbox } from "@/src/components/ui/Checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/Dialog";
import { Field } from "@/src/components/ui/Field";
import { Input } from "@/src/components/ui/Input";
import { focusChromeWithinClassName } from "@/src/components/ui/focusRing";
import { ResultBanner } from "@/src/components/ui/ResultBanner";
import { formatTimestamp } from "@/src/lib/formatting";
import { cn } from "@/src/lib/utils";
// The import-free scopes module only: the package index would pull Prisma into the client bundle.
import {
  API_TOKEN_EXPIRY_OPTIONS,
  API_TOKEN_SCOPES,
  isAdminApiTokenScope,
  type ApiTokenExpiryOption,
  type ApiTokenScope,
} from "@/src/server/api-tokens/scopes";
import type { ApiTokenView } from "@/src/server/api-tokens/tokens";
import { createApiTokenAction, revokeApiTokenAction } from "./actions";
import type { SecuritySettingsActionState } from "./actions.types";

export type ApiTokensClientProps = {
  tokens: readonly ApiTokenView[];
  /** Admin scopes are offered only to admins; the server re-checks on create and on every call. */
  canGrantAdminScopes: boolean;
};

/** Scope ids contain `:`, which message keys cannot. */
function scopeKey(scope: ApiTokenScope) {
  return scope.replaceAll(":", "_");
}

const NAME_MAX_LENGTH = 80;

export function ApiTokensClient({ tokens, canGrantAdminScopes }: ApiTokensClientProps) {
  const t = useTranslations("Settings.apiTokens");
  const locale = useLocale();
  const router = useRouter();
  const [result, setResult] = useState<SecuritySettingsActionState | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const confirming = tokens.find((token) => token.id === confirmingId) ?? null;

  function revoke(token: ApiTokenView) {
    setPendingId(token.id);
    setResult(null);

    startTransition(async () => {
      const state = await revokeApiTokenAction({ tokenId: token.id });

      setPendingId(null);
      setConfirmingId(null);
      setResult(state);

      if (state.status === "success") router.refresh();
    });
  }

  return (
    <div className="grid gap-4">
      {result ? (
        <ResultBanner tone={result.status === "error" ? "error" : "success"}>
          {result.message}
        </ResultBanner>
      ) : null}

      <div className="grid gap-3">
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
        <Button
          type="button"
          icon={Plus}
          className="justify-self-start"
          onClick={() => {
            setResult(null);
            setCreateOpen(true);
          }}
        >
          {t("create")}
        </Button>
      </div>

      {tokens.length === 0 ? (
        <EmptyState icon={KeyRound} title={t("empty.title")} body={t("empty.body")} />
      ) : (
        <ul className="grid gap-3" aria-label={t("listLabel")}>
          {tokens.map((token) => (
            <li
              key={token.id}
              className="grid gap-3 rounded-[var(--radius-lg)] border border-border bg-card p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid min-w-0 gap-1">
                  <p className="flex min-w-0 flex-wrap items-center gap-2 font-ui text-sm font-semibold text-foreground">
                    <span className="break-words">{token.name}</span>
                    {token.status === "expired" ? (
                      <Badge tone="warning">{t("status.expired")}</Badge>
                    ) : null}
                  </p>
                  <p className="break-all font-mono text-xs text-muted-foreground">
                    {token.prefix}…
                  </p>
                </div>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  aria-label={t("revokeToken", { name: token.name })}
                  loading={pendingId === token.id}
                  disabled={pendingId !== null}
                  onClick={() => setConfirmingId(token.id)}
                >
                  {t("revoke")}
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  {t("scopesLabel")}
                </span>
                {token.scopes.map((scope) => (
                  <Badge key={scope} tone={isAdminApiTokenScope(scope) ? "info" : "neutral"}>
                    {t(`scopes.${scopeKey(scope)}.title`)}
                  </Badge>
                ))}
              </div>
              <dl className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                <TokenDate label={t("createdLabel")}>
                  {formatTimestamp(token.createdAt, locale)}
                </TokenDate>
                <TokenDate label={t("lastUsedLabel")}>
                  {token.lastUsedAt ? formatTimestamp(token.lastUsedAt, locale) : t("never")}
                </TokenDate>
                <TokenDate label={t("expiresLabel")}>
                  {token.expiresAt ? formatTimestamp(token.expiresAt, locale) : t("noExpiry")}
                </TokenDate>
              </dl>
            </li>
          ))}
        </ul>
      )}

      <p className="text-sm text-muted-foreground">{t("note")}</p>

      <CreateApiTokenDialog
        open={createOpen}
        canGrantAdminScopes={canGrantAdminScopes}
        onOpenChange={setCreateOpen}
        onCreated={() => router.refresh()}
      />

      <Dialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmingId(null);
        }}
      >
        <DialogContent closeLabel={t("revokeDialog.cancel")}>
          <DialogHeader>
            <DialogTitle>{t("revokeDialog.title")}</DialogTitle>
            <DialogDescription>
              {confirming ? t("revokeDialog.body", { name: confirming.name }) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={pendingId !== null}>
                {t("revokeDialog.cancel")}
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="danger"
              icon={Trash2}
              loading={pendingId !== null}
              onClick={() => {
                if (confirming) revoke(confirming);
              }}
            >
              {t("revokeDialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TokenDate({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="font-semibold uppercase text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  );
}

function CreateApiTokenDialog({
  open,
  canGrantAdminScopes,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  canGrantAdminScopes: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const t = useTranslations("Settings.apiTokens");
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<ApiTokenScope[]>(["hours:read"]);
  const [expiry, setExpiry] = useState<ApiTokenExpiryOption>("90");
  const [error, setError] = useState<string | null>(null);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const offeredScopes = API_TOKEN_SCOPES.filter(
    (scope) => canGrantAdminScopes || !isAdminApiTokenScope(scope),
  );

  function reset() {
    setName("");
    setScopes(["hours:read"]);
    setExpiry("90");
    setError(null);
    setCreatedToken(null);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const state = await createApiTokenAction({ name, scopes, expiry });

      if (state.status === "success") {
        setCreatedToken(state.token);
        onCreated();
      } else {
        setError(state.message);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // The plaintext dies with the dialog; that is the "shown once" guarantee.
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent closeLabel={t("createDialog.close")}>
        {createdToken ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("createdDialog.title")}</DialogTitle>
              <DialogDescription>{t("createdDialog.body")}</DialogDescription>
            </DialogHeader>
            <TokenSecret token={createdToken} />
            <p className="flex items-start gap-2 rounded-[var(--radius-md)] bg-warning-soft px-3 py-2 text-sm text-warning">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {t("createdDialog.onceWarning")}
            </p>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button">{t("createdDialog.done")}</Button>
              </DialogClose>
            </DialogFooter>
          </>
        ) : (
          <form className="grid gap-4" onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>{t("createDialog.title")}</DialogTitle>
              <DialogDescription>{t("createDialog.body")}</DialogDescription>
            </DialogHeader>
            <Field label={t("createDialog.nameLabel")} hint={t("createDialog.nameHint")} required>
              {(field) => (
                <Input
                  id={field.id}
                  aria-describedby={field.describedBy}
                  value={name}
                  maxLength={NAME_MAX_LENGTH}
                  required
                  autoComplete="off"
                  onChange={(event) => setName(event.target.value)}
                />
              )}
            </Field>
            <fieldset className="grid gap-2">
              <legend className="mb-2 font-ui text-sm font-semibold text-foreground">
                {t("createDialog.scopesLabel")}
              </legend>
              {offeredScopes.map((scope) => (
                <label
                  key={scope}
                  className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border border-border bg-secondary/55 p-3"
                >
                  <Checkbox
                    checked={scopes.includes(scope)}
                    aria-describedby={`api-token-scope-${scopeKey(scope)}`}
                    onCheckedChange={(checked) =>
                      setScopes((current) =>
                        checked === true
                          ? API_TOKEN_SCOPES.filter((s) => s === scope || current.includes(s))
                          : current.filter((s) => s !== scope),
                      )
                    }
                  />
                  <span className="grid min-w-0 gap-1">
                    <span className="flex flex-wrap items-center gap-2 font-ui text-sm font-semibold text-foreground">
                      {t(`scopes.${scopeKey(scope)}.title`)}
                      <code className="font-mono text-xs text-muted-foreground">{scope}</code>
                      {isAdminApiTokenScope(scope) ? (
                        <Badge tone="info">{t("adminOnly")}</Badge>
                      ) : null}
                    </span>
                    <span
                      id={`api-token-scope-${scopeKey(scope)}`}
                      className="text-sm text-muted-foreground"
                    >
                      {t(`scopes.${scopeKey(scope)}.description`)}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
            {/* Native radios rather than a segmented control: four HU labels do not fit one row at 390px. */}
            <fieldset className="grid gap-2">
              <legend className="mb-2 font-ui text-sm font-semibold text-foreground">
                {t("createDialog.expiryLabel")}
              </legend>
              <div className="flex flex-wrap gap-2">
                {API_TOKEN_EXPIRY_OPTIONS.map((option) => (
                  <label
                    key={option}
                    className={cn(
                      "flex min-h-9 cursor-pointer items-center gap-2 whitespace-nowrap rounded-[var(--radius-pill)] border px-3 font-ui text-sm font-semibold transition",
                      focusChromeWithinClassName,
                      expiry === option
                        ? "border-primary/55 bg-accent-soft text-accent"
                        : "border-border bg-secondary/55 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <input
                      type="radio"
                      name="api-token-expiry"
                      value={option}
                      checked={expiry === option}
                      onChange={() => setExpiry(option)}
                      className="sr-only"
                    />
                    {t(`expiry.${option}`)}
                  </label>
                ))}
              </div>
            </fieldset>
            {error ? <ResultBanner tone="error">{error}</ResultBanner> : null}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost" disabled={pending}>
                  {t("createDialog.cancel")}
                </Button>
              </DialogClose>
              <Button type="submit" icon={KeyRound} loading={pending}>
                {t("createDialog.submit")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TokenSecret({ token }: { token: string }) {
  const t = useTranslations("Settings.apiTokens.createdDialog");
  const [outcome, setOutcome] = useState<"idle" | "copied" | "failed">("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function copy() {
    if (resetTimer.current) clearTimeout(resetTimer.current);

    try {
      await navigator.clipboard.writeText(token);
      setOutcome("copied");
      resetTimer.current = setTimeout(() => setOutcome("idle"), 4000);
    } catch {
      setOutcome("failed");
    }
  }

  return (
    <div className="grid gap-2">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <p
          aria-label={t("tokenLabel")}
          className="break-all rounded-[var(--radius-md)] border border-border bg-background/55 px-3 py-2 font-mono text-sm text-foreground"
        >
          {token}
        </p>
        <Button
          type="button"
          variant="soft"
          size="sm"
          icon={outcome === "copied" ? Check : Copy}
          className="justify-self-start"
          onClick={() => void copy()}
        >
          {t("copy")}
        </Button>
      </div>
      <p role="status" className="min-h-5 text-sm leading-5 text-muted-foreground">
        {outcome === "copied" ? t("copied") : outcome === "failed" ? t("copyFailed") : null}
      </p>
    </div>
  );
}
