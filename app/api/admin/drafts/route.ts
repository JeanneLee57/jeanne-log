import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { assertAdminRequest } from "@/lib/auth/admin-session";
import { createStudioDraft, publishDraft } from "@/lib/content/drafts";
import { createDraftSchema } from "@/lib/validators/drafts";

export async function POST(request: NextRequest) {
  try {
    await assertAdminRequest(request);
    const body = await request.json();
    const parsed = createDraftSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid draft create payload.",
          issues: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const db = getDb();
    const result = await createStudioDraft(db, parsed.data);

    if (parsed.data.publish) {
      const publication = await publishDraft(db, result.articleId);

      return NextResponse.json(
        {
          ok: true,
          articleId: result.articleId,
          versionId: result.versionId,
          versionNumber: result.versionNumber,
          publishedVersionId: publication.publishedVersionId,
          slug: publication.slug,
          status: "published",
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        articleId: result.articleId,
        versionId: result.versionId,
        versionNumber: result.versionNumber,
        status: "draft",
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("Admin session")
      ? 401
      : message.includes("already exists")
        ? 409
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
