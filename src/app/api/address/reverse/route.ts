import { addressFromNominatim, type Address } from "@/lib/address";
import { NextRequest, NextResponse } from "next/server";

const UA = "FamilyrApp/1.0 (hackgt; contact@familyr.local)";

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lon = Number(req.nextUrl.searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat and lon are required." }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error("Could not resolve that location.");
    const row = (await res.json()) as { display_name?: string; address?: Record<string, string> };
    const address: Address = addressFromNominatim(row);
    return NextResponse.json({
      label: row.display_name || formatFallback(address),
      address,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not resolve that location.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

function formatFallback(a: Address) {
  return [a.street, a.city, a.state, a.postalCode].filter(Boolean).join(", ");
}
