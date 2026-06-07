import { NextRequest, NextResponse } from "next/server";
import { assertAdminRequest } from "@/lib/auth/admin-session";
import { getDb } from "@/db/client";
import { publishDraft } from "@/lib/content/drafts";

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: NextRequest, { params }: RouteProps) {
  try {
    await assertAdminRequest(request);
    const { id } = await params;
    const result = await publishDraft(getDb(), id);

    return NextResponse.json(
      {
        ok: true,
        articleId: result.articleId,
        publishedVersionId: result.publishedVersionId,
        publishedAt: result.publishedAt.toISOString(),
        slug: result.slug,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("Admin session")
      ? 401
      : message.includes("not found") || message.includes("no current version")
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
