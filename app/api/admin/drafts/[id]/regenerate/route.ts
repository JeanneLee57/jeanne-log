import { NextRequest, NextResponse } from "next/server";
import { createRegenerationJob } from "@/services/regenerationJobRepository";

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params;
    const job = await createRegenerationJob(id);

    return NextResponse.json(
      {
        ok: true,
        jobId: job.id,
        status: job.status,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("queued or running")
      ? 409
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
