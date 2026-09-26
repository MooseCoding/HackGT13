import { updateFamilyAutoAddFamilyCalls } from "@/lib/data";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as { familyId?: string; autoAddFamilyCalls?: boolean };
    if (!body.familyId) {
      return NextResponse.json({ error: "Missing circle." }, { status: 400 });
    }
    if (typeof body.autoAddFamilyCalls !== "boolean") {
      return NextResponse.json({ error: "Choose whether to auto-add family calls." }, { status: 400 });
    }
    const result = await updateFamilyAutoAddFamilyCalls(body.familyId, body.autoAddFamilyCalls);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save circle settings." },
      { status: 403 },
    );
  }
}
