import { NextRequest, NextResponse } from "next/server";
import { assertAdminRequest } from "@/lib/auth/admin-session";
import { createComment } from "@/services/commentRepository";
import { createCommentSchema } from "@/lib/validators/comments";

export async function POST(request: NextRequest) {
  try {
    await assertAdminRequest(request);
    const body = await request.json();
    const parsed = createCommentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid comment payload.",
          issues: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const comment = await createComment(parsed.data);

    return NextResponse.json(
      {
        ok: true,
        comment,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("Admin session")
      ? 401
      : message.includes("not found") || message.includes("exceeds available lines")
        ? 400
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
