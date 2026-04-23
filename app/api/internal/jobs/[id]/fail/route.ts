import { NextRequest, NextResponse } from "next/server";
import { assertInternalRequest, getInternalWorkerId } from "@/lib/api/internal";
import { failRegenerationJob } from "@/services/regenerationJobRepository";
import { failRegenerationJobSchema } from "@/lib/validators/internal-jobs";

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: NextRequest, { params }: RouteProps) {
  try {
    assertInternalRequest(request);
    const workerId = getInternalWorkerId(request);
    const { id } = await params;
    const body = await request.json();
    const parsed = failRegenerationJobSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid failure payload.",
          issues: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const job = await failRegenerationJob(id, workerId, parsed.data);

    return NextResponse.json({
      ok: true,
      job,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status =
      message.includes("Missing bearer token") ||
      message.includes("Invalid internal API token") ||
      message.includes("Missing worker id")
        ? 401
        : message.includes("not found")
          ? 404
          : message.includes("not running") || message.includes("another worker")
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
