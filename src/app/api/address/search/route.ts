import { addressFromNominatim, type Address } from "@/lib/address";
import { NextRequest, NextResponse } from "next/server";

const UA = "FamilyrApp/1.0 (hackgt; contact@familyr.local)";

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: Record<string, string>;
};

export type AddressSuggestion = {
  id: string;
  label: string;
  address: Address;
};

async function nominatimSearch(q: string): Promise<AddressSuggestion[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "6");
  url.searchParams.set("countrycodes", "us");

  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error("Address search failed.");
  const rows = (await res.json()) as NominatimResult[];
  return rows.map((row) => ({
    id: String(row.place_id),
    label: row.display_name,
    address: addressFromNominatim(row),
  }));
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 3) {
    return NextResponse.json({ suggestions: [] as AddressSuggestion[] });
  }
  try {
    const suggestions = await nominatimSearch(q);
    return NextResponse.json({ suggestions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Address search failed.";
    return NextResponse.json({ error: message, suggestions: [] }, { status: 502 });
  }
}
