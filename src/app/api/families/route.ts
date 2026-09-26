import { familiesForUser } from "@/lib/data";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { families, activeId } = await familiesForUser();
    return NextResponse.json({ families, activeId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not load families." },
      { status: 500 },
    );
  }
}
