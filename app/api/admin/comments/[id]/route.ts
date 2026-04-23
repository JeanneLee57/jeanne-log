import { NextRequest, NextResponse } from "next/server";
import { assertAdminRequest } from "@/lib/auth/admin-session";
import { deleteComment, updateComment } from "@/services/commentRepository";
import { updateCommentSchema } from "@/lib/validators/comments";

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
    const parsed = updateCommentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid comment update payload.",
          issues: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const comment = await updateComment(id, parsed.data);

    if (!comment) {
      return NextResponse.json(
        {
          ok: false,
          error: "Comment not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      comment,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: message.includes("Admin session") ? 401 : 500 }
    );
  }
}

export async function DELETE(_: NextRequest, { params }: RouteProps) {
  try {
    await assertAdminRequest(_);
    const { id } = await params;
    const deleted = await deleteComment(id);

    if (!deleted) {
      return NextResponse.json(
        {
          ok: false,
          error: "Comment not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: message.includes("Admin session") ? 401 : 500 }
    );
  }
}
