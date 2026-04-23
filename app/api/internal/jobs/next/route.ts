import { NextRequest, NextResponse } from "next/server";
import { assertInternalRequest, getInternalWorkerId } from "@/lib/api/internal";
import { claimNextRegenerationJob } from "@/services/regenerationJobRepository";

export async function GET(request: NextRequest) {
  try {
    assertInternalRequest(request);
    const workerId = getInternalWorkerId(request);
    const type = request.nextUrl.searchParams.get("type");

    if (type && type !== "regenerate") {
      return NextResponse.json(
        {
          ok: false,
          error: "Unsupported job type.",
        },
        { status: 400 }
      );
    }

    const job = await claimNextRegenerationJob(workerId);

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
