import prisma from "@/lib/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "../protection";

// GET all wallets
export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await getAuthContext(request);

    const wallets = await prisma.wallet.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(wallets);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Error fetching wallets:", error);
    return NextResponse.json(
      { error: "Failed to fetch wallets" },
      { status: 500 }
    );
  }
}

// POST new wallet
export async function POST(request: NextRequest) {
  try {
    const { userId, organizationId } = await getAuthContext(request);

    const body = await request.json();
    const { name, type, balance, currency, color, icon } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const wallet = await prisma.wallet.create({
      data: {
        name,
        type: type || "CASH",
        balance: balance || 0,
        currency: currency || "PHP",
        color,
        icon,
        userId,
        organizationId,
      },
    });

    return NextResponse.json(wallet, { status: 201 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Error creating wallet:", error);
    return NextResponse.json(
      { error: "Failed to create wallet" },
      { status: 500 }
    );
  }
}

// PUT update wallet
export async function PUT(request: NextRequest) {
  try {
    const { organizationId } = await getAuthContext(request);

    const body = await request.json();
    const { id, name, type, color, icon, currency } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Wallet id is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.wallet.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    const wallet = await prisma.wallet.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(color !== undefined && { color }),
        ...(icon !== undefined && { icon }),
        ...(currency !== undefined && { currency }),
      },
    });

    return NextResponse.json(wallet);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Error updating wallet:", error);
    return NextResponse.json(
      { error: "Failed to update wallet" },
      { status: 500 }
    );
  }
}

// DELETE wallet
export async function DELETE(request: NextRequest) {
  try {
    const { organizationId } = await getAuthContext(request);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Wallet id is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.wallet.findFirst({
      where: { id, organizationId },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    if (existing._count.transactions > 0) {
      await prisma.transaction.deleteMany({
        where: { walletId: id },
      });
    }

    await prisma.wallet.delete({ where: { id } });

    return NextResponse.json({ message: "Wallet deleted successfully" });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Error deleting wallet:", error);
    return NextResponse.json(
      { error: "Failed to delete wallet" },
      { status: 500 }
    );
  }
}
