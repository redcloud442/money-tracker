import { auth } from "@/lib/better-auth/auth";
import prisma from "@/lib/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

export interface AuthContext {
  userId: string;
  organizationId: string;
}

/**
 * Validates session and org membership.
 * Returns AuthContext with userId and organizationId from the session.
 */
export async function getAuthContext(
  request: NextRequest
): Promise<AuthContext> {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    throw NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = session.session.activeOrganizationId;

  if (!organizationId) {
    throw NextResponse.json(
      { error: "No active organization" },
      { status: 403 }
    );
  }

  const membership = await prisma.member.findFirst({
    where: {
      userId: session.user.id,
      organizationId,
    },
  });

  if (!membership) {
    throw NextResponse.json(
      { error: "Not a member of this organization" },
      { status: 403 }
    );
  }

  return {
    userId: session.user.id,
    organizationId,
  };
}
