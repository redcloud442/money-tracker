import { auth } from "@/lib/better-auth/auth";
import prisma from "@/lib/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET all organizations the current user belongs to
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberships = await prisma.member.findMany({
      where: { userId: session.user.id },
      include: {
        organization: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const organizations = memberships.map((m) => ({
      ...m.organization,
      role: m.role,
    }));

    return NextResponse.json(organizations);
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return NextResponse.json(
      { error: "Failed to fetch organizations" },
      { status: 500 }
    );
  }
}
