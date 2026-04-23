import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { assertInternalRequest } from "@/lib/api/internal";
import { createOrUpdateDraft } from "@/lib/content/drafts";
import { internalDraftSchema } from "@/lib/validators/internal-drafts";

export async function POST(request: NextRequest) {
  try {
    assertInternalRequest(request);

    const body = await request.json();
    const parsed = internalDraftSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid draft payload.",
          issues: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const result = await createOrUpdateDraft(getDb(), parsed.data);

    return NextResponse.json(
      {
        ok: true,
        articleId: result.articleId,
        versionId: result.versionId,
        versionNumber: result.versionNumber,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    let status = 500;

    if (message.includes("Missing bearer token") || message.includes("Invalid internal API token")) {
      status = 401;
    } else if (message.includes("published article")) {
      status = 409;
    }

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status }
    );
  }
}
