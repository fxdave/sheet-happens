import type { Metadata } from "next";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import "./globals.css";
import { RunningTimerProvider } from "@/src/components/layout/RunningTimerProvider";
import { SheetToaster } from "@/src/components/sheet/Toast";
import { ThemeProvider } from "@/src/components/layout/ThemeProvider";
import { resourceSaverCookieName } from "@/src/lib/resource-saver";
import { getShellRunningTimer } from "@/src/server/time-tracking/shell-timer";

import { stopRunningTimerAction } from "./time/actions";

export const metadata: Metadata = {
  title: "Sheet Happens",
  description:
    "Time tracking, monthly timesheets and contractor invoice verification for small teams.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [locale, messages, runningTimer, cookieStore] = await Promise.all([
    getLocale(),
    getMessages(),
    /*
      Resolved here rather than per page because this layout is the only node that survives a
      client-side navigation — every page renders its own AppShell, so a timer sourced inside the
      shell would be refetched and re-mounted on every route change. Returns null for anyone who is
      not a signed-in active member, which is what makes it safe above the auth screens too.
    */
    getShellRunningTimer(),
    cookies(),
  ]);
  const resourceSaver = cookieStore.get(resourceSaverCookieName)?.value === "1";

  return (
    /*
      `dark` here is the server-render baseline rather than a fixed theme: `:root` in globals.css
      holds the dark token values, and AuthShell/AuthForm carry `dark:` utilities whose base branch
      is light, so un-classed markup would paint a light panel for one frame. next-themes' blocking
      script rewrites the class from the stored preference before first paint, which is exactly the
      difference `suppressHydrationWarning` covers. Keeping it a constant also means the
      `router.refresh()` on language change cannot clobber what the script wrote.
    */
    <html
      lang={locale}
      className="dark"
      data-resource-saver={resourceSaver ? "" : undefined}
      suppressHydrationWarning
    >
      {/*
        Only the two Lexend subsets are preloaded, and both unconditionally. `@font-face` rules in a
        stylesheet are not fetched until the browser has matched them against laid-out text, so the
        body typeface would otherwise arrive a layout pass late. `latin-ext` is not gated on the HU
        locale because Hungarian names and project titles carry ő/ű inside the EN UI too.

        Poppins is deliberately left to on-demand discovery: it only dresses `.font-ui` labels, and
        preloading four more weights would compete with Lexend for the same early bandwidth.

        `crossOrigin` is required even though these are same-origin — CSS fetches fonts in anonymous
        CORS mode, so a preload without it is a cache miss the browser silently fetches twice.
      */}
      <link
        rel="preload"
        href="/fonts/lexend-variable-latin.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
      <link
        rel="preload"
        href="/fonts/lexend-variable-latin-ext.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
      <body>
        {/* Outermost, so the blocking script is the first node in <body>. */}
        <ThemeProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <RunningTimerProvider timer={runningTimer} stopAction={stopRunningTimerAction}>
              {children}
            </RunningTimerProvider>
            {/* One toaster for the app, here because this is the only node every route shares.
                Renders nothing until a toast fires; `/time` uses it for the undoable delete. */}
            <SheetToaster />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
