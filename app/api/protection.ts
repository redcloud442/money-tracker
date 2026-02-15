import { auth } from "@/lib/better-auth/auth";
import { NextRequest, NextResponse } from "next/server";

export async function ProtectionMiddleware(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
