"use client";

import { useEffect, useState } from "react";

/** False on SSR and the first client render; true after mount. Use to gate client-only UI. */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
}
