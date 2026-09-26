import { optedInPatients, patientById } from "@/lib/store";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const row = patientById(id);
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(row);
  }
  return NextResponse.json({ patients: optedInPatients() });
}
