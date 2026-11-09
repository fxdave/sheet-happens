"use client";

import { useSyncExternalStore } from "react";

/** Reads the `data-resource-saver` flag the root layout renders on `<html>` from the cookie. */
export function useResourceSaver() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

function subscribe(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, { attributeFilter: ["data-resource-saver"] });
  return () => observer.disconnect();
}

function getSnapshot() {
  return document.documentElement.hasAttribute("data-resource-saver");
}
