import { now } from "@/lib/clock";
import {
  addWishlistRow,
  patchWishlistRow,
  postingIdentity,
  requireFamilyAccess,
  resolveFamilyId,
  wishlistOf,
} from "@/lib/data";
import { isDemoMode } from "@/lib/mode-server";
import type { WishlistItem, WishlistStatus } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const familyId = req.nextUrl.searchParams.get("familyId") || (await resolveFamilyId());
  try {
    await requireFamilyAccess(familyId);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Access denied." },
      { status: 403 },
    );
  }
  const items = await wishlistOf(familyId);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      familyId: string;
      authorId: string;
      forMemberId: string;
      title: string;
      note?: string;
      estimatedTotal?: number;
      sourcePostId?: string;
    };
    if (!body.title?.trim() || !body.forMemberId) {
      return NextResponse.json({ error: "Wishlist item needs a title and who it's for." }, { status: 400 });
    }
    const identity = await postingIdentity(body.familyId, body.authorId);
    const demo = await isDemoMode();
    const item: WishlistItem = {
      id: `wl-${Date.now()}`,
      familyId: identity.familyId,
      forMemberId: body.forMemberId,
      title: body.title.trim(),
      note: body.note?.trim(),
      estimatedTotal: body.estimatedTotal,
      sourcePostId: body.sourcePostId,
      createdBy: identity.memberId,
      createdAt: demo ? now() : new Date().toISOString(),
      status: "wishlist",
    };
    const saved = await addWishlistRow(item);
    return NextResponse.json(saved);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not add wishlist item." },
      { status: 403 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      id: string;
      familyId?: string;
      status?: WishlistStatus;
      orderedBy?: string;
    };
    if (!body.id) {
      return NextResponse.json({ error: "Missing wishlist item id." }, { status: 400 });
    }
    const familyId = body.familyId || (await resolveFamilyId());
    await requireFamilyAccess(familyId);
    const demo = await isDemoMode();
    const patch: Partial<WishlistItem> = {};
    if (body.status) patch.status = body.status;
    if (body.status === "ordered" || body.status === "purchased") {
      patch.orderedBy = body.orderedBy;
      patch.orderedAt = demo ? now() : new Date().toISOString();
    }
    const saved = await patchWishlistRow(body.id, familyId, patch);
    if (!saved) return NextResponse.json({ error: "Wishlist item not found." }, { status: 404 });
    return NextResponse.json(saved);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update wishlist item." },
      { status: 403 },
    );
  }
}
