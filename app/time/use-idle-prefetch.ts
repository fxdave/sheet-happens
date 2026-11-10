"use client";

import type { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/* `router.prefetch` only skips the page's data for a dynamic route unless asked for all of it. */
const FULL = "full" as PrefetchKind;

/**
 * Warms the views a click is likely to open next — the other tabs at this anchor and the previous
 * period — once per view and period, when the browser is idle. A mutation evicts them through
 * `revalidatePath`; `onInvalidate` then fetches the fresh copy, again when idle.
 */
export function useIdlePrefetch(view: string, periodKey: string, hrefs: () => string[]) {
  // `typedRoutes` narrows `prefetch` to one argument; the runtime takes the options too.
  const router = useRouter() as unknown as AppRouterInstance;
  const latestHrefs = useRef(hrefs);

  useEffect(() => {
    latestHrefs.current = hrefs;
  });

  useEffect(() => {
    if (saveData()) return;

    const cancels: Array<() => void> = [];
    const prefetch = (href: string) => {
      cancels.push(
        whenIdle(() => router.prefetch(href, { kind: FULL, onInvalidate: () => prefetch(href) })),
      );
    };

    for (const href of latestHrefs.current()) prefetch(href);
    return () => {
      for (const cancel of cancels) cancel();
    };
  }, [router, view, periodKey]);
}

function whenIdle(callback: () => void) {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(callback, { timeout: 2_000 });
    return () => window.cancelIdleCallback(id);
  }

  const id = window.setTimeout(callback, 300);
  return () => window.clearTimeout(id);
}

/** A member who asked the browser to save data gets no speculative requests. */
function saveData() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return connection?.saveData === true;
}
