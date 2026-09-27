"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** False on SSR and the first client render; true after mount. Use to gate client-only UI. */
export function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
