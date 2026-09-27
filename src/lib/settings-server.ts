import { cookies } from "next/headers";
import { isDemoMode } from "./mode-server";
import { HESTIA_GENERATION_COOKIE } from "./settings";

export async function hestiaPreferLocal(): Promise<boolean> {
  if (await isDemoMode()) return true;
  const jar = await cookies();
  const value = jar.get(HESTIA_GENERATION_COOKIE)?.value;
  if (value === "local") return true;
  return false;
}
