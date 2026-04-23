import { NextRequest, NextResponse } from "next/server";
import { assertAdminRequest } from "@/lib/auth/admin-session";
import { getDb } from "@/db/client";
import { createManualDraftVersion } from "@/lib/content/drafts";
import { updateDraftSchema } from "@/lib/validators/drafts";

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: NextRequest, { params }: RouteProps) {
  try {
    await assertAdminRequest(request);
    const { id } = await params;
    const body = await request.json();
    const parsed = updateDraftSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid draft update payload.",
          issues: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const result = await createManualDraftVersion(getDb(), id, parsed.data);

    return NextResponse.json({
      ok: true,
      articleId: result.articleId,
      versionId: result.versionId,
      versionNumber: result.versionNumber,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("Admin session")
      ? 401
      : message.includes("not found")
        ? 404
        : 500;

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status }
    );
  }
}
