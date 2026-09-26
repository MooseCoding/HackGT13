import { cookies } from "next/headers";
import { HCP_REPORTING_COOKIE, normalizeReportingMode, type HcpReportingMode } from "./hcp-settings";

export async function hcpReportingMode(): Promise<HcpReportingMode> {
  const jar = await cookies();
  return normalizeReportingMode(jar.get(HCP_REPORTING_COOKIE)?.value);
}
