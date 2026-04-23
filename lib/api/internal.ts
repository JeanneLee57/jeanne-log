import { NextRequest } from "next/server";
import { requireInternalApiToken } from "@/lib/env";

export function assertInternalRequest(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const expectedToken = requireInternalApiToken();

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Missing bearer token.");
  }

  const token = authorization.replace("Bearer ", "").trim();

  if (token !== expectedToken) {
    throw new Error("Invalid internal API token.");
  }
}

export function getInternalWorkerId(request: NextRequest) {
  const workerId = request.headers.get("x-worker-id")?.trim();

  if (!workerId) {
    throw new Error("Missing worker id.");
  }

  return workerId;
}
