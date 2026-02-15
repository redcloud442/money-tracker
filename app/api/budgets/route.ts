import prisma from "@/lib/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";
import { ProtectionMiddleware } from "../protection";

// GET all budgets with computed spent from transactions
export async function GET(request: NextRequest) {
  try {
    await ProtectionMiddleware(request);

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const budgets = await prisma.budget.findMany({
      where: { userId },
      include: {
        category: true,
        wallet: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Compute actual spent for each budget from transactions
    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        const where: {
          userId: string;
          type: "EXPENSE";
          date: { gte: Date; lte: Date };
          categoryId?: string;
          walletId?: string;
        } = {
          userId,
          type: "EXPENSE",
          date: {
            gte: budget.startDate,
            lte: budget.endDate,
          },
        };

        if (budget.categoryId) {
          where.categoryId = budget.categoryId;
        }

        if (budget.walletId) {
          where.walletId = budget.walletId;
        }

        const result = await prisma.transaction.aggregate({
          where,
          _sum: { amount: true },
        });

        return {
          ...budget,
          spent: result._sum.amount || 0,
        };
      })
    );

    return NextResponse.json(budgetsWithSpent);
  } catch (error) {
    console.error("Error fetching budgets:", error);
    return NextResponse.json(
      { error: "Failed to fetch budgets" },
      { status: 500 }
    );
  }
}

// POST new budget
export async function POST(request: NextRequest) {
  try {
    await ProtectionMiddleware(request);

    const body = await request.json();
    const {
      name,
      amount,
      period,
      userId,
      categoryId,
      walletId,
      startDate,
      endDate,
    } = body;

    if (!name || !amount || !userId) {
      return NextResponse.json(
        { error: "Name, amount, and userId are required" },
        { status: 400 }
      );
    }

    // Calculate default start/end dates based on period if not provided
    const now = new Date();
    let start = startDate ? new Date(startDate) : now;
    let end = endDate ? new Date(endDate) : new Date();

    if (!startDate || !endDate) {
      switch (period || "MONTHLY") {
        case "DAILY":
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          end = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            23,
            59,
            59
          );
          break;
        case "WEEKLY": {
          const day = now.getDay();
          start = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - day
          );
          end = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + (6 - day),
            23,
            59,
            59
          );
          break;
        }
        case "MONTHLY":
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
          break;
        case "YEARLY":
          start = new Date(now.getFullYear(), 0, 1);
          end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
          break;
      }
    }

    const budget = await prisma.budget.create({
      data: {
        name,
        amount,
        period: period || "MONTHLY",
        startDate: start,
        endDate: end,
        userId,
        categoryId: categoryId || undefined,
        walletId: walletId || undefined,
      },
      include: {
        category: true,
        wallet: true,
      },
    });

    return NextResponse.json(budget, { status: 201 });
  } catch (error) {
    console.error("Error creating budget:", error);
    return NextResponse.json(
      { error: "Failed to create budget" },
      { status: 500 }
    );
  }
}

// PUT update budget
export async function PUT(request: NextRequest) {
  try {
    await ProtectionMiddleware(request);

    const body = await request.json();
    const { id, name, amount, period, categoryId, walletId } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Budget id is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.budget.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    const budget = await prisma.budget.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(amount !== undefined && { amount }),
        ...(period !== undefined && { period }),
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
        ...(walletId !== undefined && { walletId: walletId || null }),
      },
      include: {
        category: true,
        wallet: true,
      },
    });

    return NextResponse.json(budget);
  } catch (error) {
    console.error("Error updating budget:", error);
    return NextResponse.json(
      { error: "Failed to update budget" },
      { status: 500 }
    );
  }
}

// DELETE budget
export async function DELETE(request: NextRequest) {
  try {
    await ProtectionMiddleware(request);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Budget id is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.budget.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    await prisma.budget.delete({ where: { id } });

    return NextResponse.json({ message: "Budget deleted successfully" });
  } catch (error) {
    console.error("Error deleting budget:", error);
    return NextResponse.json(
      { error: "Failed to delete budget" },
      { status: 500 }
    );
  }
}
