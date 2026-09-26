import { cookies } from "next/headers";
import { DEMO_COOKIE, demoModeFromCookie } from "./mode";

export async function isDemoMode() {
  const jar = await cookies();
  return demoModeFromCookie(jar.get(DEMO_COOKIE)?.value);
}
