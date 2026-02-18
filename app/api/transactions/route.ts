import prisma from "@/lib/prisma/prisma";
import { RecurringInterval } from "@/app/generated/prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "../protection";

export function computeNextRecurrenceDate(
  date: Date,
  interval: RecurringInterval
): Date {
  const next = new Date(date);
  switch (interval) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "BIWEEKLY":
      next.setDate(next.getDate() + 14);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      break;
    case "YEARLY":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

async function computeBudgetAlerts(
  organizationId: string,
  txDate: Date,
  categoryId: string | null | undefined,
  walletId: string
) {
  const matchingBudgets = await prisma.budget.findMany({
    where: {
      organizationId,
      startDate: { lte: txDate },
      endDate: { gte: txDate },
      AND: [
        {
          OR: [
            { categoryId: null },
            ...(categoryId ? [{ categoryId }] : []),
          ],
        },
        {
          OR: [{ walletId: null }, { walletId }],
        },
      ],
    },
  });

  if (matchingBudgets.length === 0) return [];

  const alerts = [];

  for (const budget of matchingBudgets) {
    const where: {
      organizationId: string;
      type: "EXPENSE";
      date: { gte: Date; lte: Date };
      categoryId?: string;
      walletId?: string;
    } = {
      organizationId,
      type: "EXPENSE",
      date: {
        gte: budget.startDate,
        lte: budget.endDate,
      },
    };

    if (budget.categoryId) where.categoryId = budget.categoryId;
    if (budget.walletId) where.walletId = budget.walletId;

    const result = await prisma.transaction.aggregate({
      where,
      _sum: { amount: true },
    });

    const spent = result._sum.amount || 0;
    const percentage = Math.round((spent / budget.amount) * 100);

    if (percentage >= 80) {
      alerts.push({
        budgetId: budget.id,
        name: budget.name,
        spent,
        limit: budget.amount,
        percentage,
        level: spent > budget.amount ? "exceeded" : "warning",
      });
    }
  }

  return alerts;
}

// GET all transactions with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await getAuthContext(request);

    const { searchParams } = new URL(request.url);

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
    );
    const skip = (page - 1) * limit;

    // Filters
    const search = searchParams.get("search");
    const type = searchParams.get("type");
    const categoryId = searchParams.get("categoryId");
    const walletId = searchParams.get("walletId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build where clause
    const where: Record<string, unknown> = { organizationId };

    if (search) {
      where.description = { contains: search, mode: "insensitive" };
    }

    if (type === "INCOME" || type === "EXPENSE") {
      where.type = type;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (walletId) {
      where.walletId = walletId;
    }

    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) {
        dateFilter.gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.lte = new Date(endDate);
      }
      where.date = dateFilter;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          wallet: true,
          category: true,
        },
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    return NextResponse.json({ data: transactions, total, page, limit });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

// POST new transaction
export async function POST(request: NextRequest) {
  try {
    const { userId, organizationId } = await getAuthContext(request);

    const body = await request.json();
    const {
      amount,
      type,
      description,
      walletId,
      categoryId,
      date,
      tags,
      notes,
      isRecurring,
      recurringInterval,
    } = body;

    if (!amount || !type || !walletId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Auto-compute nextRecurrenceDate for recurring transactions
    const txDate = date ? new Date(date) : new Date();
    let computedNextDate: Date | null = null;
    if (isRecurring && recurringInterval) {
      computedNextDate = computeNextRecurrenceDate(txDate, recurringInterval);
    }

    // Create transaction and update wallet balance atomically
    const transaction = await prisma.$transaction(async (tx) => {
      const newTransaction = await tx.transaction.create({
        data: {
          amount,
          type,
          description,
          userId,
          organizationId,
          walletId,
          categoryId,
          date: txDate,
          tags: tags || [],
          notes,
          isRecurring: isRecurring || false,
          recurringInterval: recurringInterval || null,
          nextRecurrenceDate: computedNextDate,
        },
        include: {
          wallet: true,
          category: true,
        },
      });

      // Update wallet balance
      const balanceChange = type === "INCOME" ? amount : -amount;
      await tx.wallet.update({
        where: { id: walletId },
        data: {
          balance: {
            increment: balanceChange,
          },
        },
      });

      return newTransaction;
    });

    const budgetAlerts =
      type === "EXPENSE"
        ? await computeBudgetAlerts(
            organizationId,
            transaction.date,
            transaction.categoryId,
            transaction.walletId
          )
        : [];

    return NextResponse.json(
      { ...transaction, budgetAlerts },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Error creating transaction:", error);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    );
  }
}

// PUT update transaction
export async function PUT(request: NextRequest) {
  try {
    const { organizationId } = await getAuthContext(request);

    const body = await request.json();
    const {
      id,
      amount,
      type,
      description,
      walletId,
      categoryId,
      date,
      tags,
      notes,
      isRecurring,
      recurringInterval,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Transaction id is required" },
        { status: 400 }
      );
    }

    const transaction = await prisma.$transaction(async (tx) => {
      // Fetch the existing transaction to reverse its balance effect
      const existing = await tx.transaction.findFirst({
        where: { id, organizationId },
      });

      if (!existing) {
        throw new Error("NOT_FOUND");
      }

      // Reverse the old balance change on the old wallet
      const oldBalanceChange =
        existing.type === "INCOME" ? -existing.amount : existing.amount;
      await tx.wallet.update({
        where: { id: existing.walletId },
        data: {
          balance: {
            increment: oldBalanceChange,
          },
        },
      });

      // Determine the effective new values
      const newAmount = amount ?? existing.amount;
      const newType = type ?? existing.type;
      const newWalletId = walletId ?? existing.walletId;

      // Apply the new balance change on the (possibly different) wallet
      const newBalanceChange = newType === "INCOME" ? newAmount : -newAmount;
      await tx.wallet.update({
        where: { id: newWalletId },
        data: {
          balance: {
            increment: newBalanceChange,
          },
        },
      });

      // Build the update payload — only include fields that were provided
      const updateData: Record<string, unknown> = {};
      if (amount !== undefined) updateData.amount = amount;
      if (type !== undefined) updateData.type = type;
      if (description !== undefined) updateData.description = description;
      if (walletId !== undefined) updateData.walletId = walletId;
      if (categoryId !== undefined) updateData.categoryId = categoryId;
      if (date !== undefined) updateData.date = new Date(date);
      if (tags !== undefined) updateData.tags = tags;
      if (notes !== undefined) updateData.notes = notes;
      if (isRecurring !== undefined) updateData.isRecurring = isRecurring;
      if (recurringInterval !== undefined)
        updateData.recurringInterval = recurringInterval;

      // Recompute nextRecurrenceDate when recurring fields change
      const effectiveIsRecurring =
        isRecurring !== undefined ? isRecurring : existing.isRecurring;
      const effectiveInterval =
        recurringInterval !== undefined
          ? recurringInterval
          : existing.recurringInterval;
      const effectiveDate =
        date !== undefined ? new Date(date) : existing.date;

      if (effectiveIsRecurring && effectiveInterval) {
        updateData.nextRecurrenceDate = computeNextRecurrenceDate(
          effectiveDate,
          effectiveInterval
        );
      } else if (isRecurring === false) {
        updateData.nextRecurrenceDate = null;
      }

      const updatedTransaction = await tx.transaction.update({
        where: { id },
        data: updateData,
        include: {
          wallet: true,
          category: true,
        },
      });

      return updatedTransaction;
    });

    const budgetAlerts =
      transaction.type === "EXPENSE"
        ? await computeBudgetAlerts(
            organizationId,
            transaction.date,
            transaction.categoryId,
            transaction.walletId
          )
        : [];

    return NextResponse.json({ ...transaction, budgetAlerts });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }
    if (error instanceof NextResponse) return error;
    console.error("Error updating transaction:", error);
    return NextResponse.json(
      { error: "Failed to update transaction" },
      { status: 500 }
    );
  }
}

// DELETE transaction
export async function DELETE(request: NextRequest) {
  try {
    const { organizationId } = await getAuthContext(request);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Transaction id is required" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Fetch the transaction to know the balance impact to reverse
      const existing = await tx.transaction.findFirst({
        where: { id, organizationId },
      });

      if (!existing) {
        throw new Error("NOT_FOUND");
      }

      // Reverse the balance change
      const reverseChange =
        existing.type === "INCOME" ? -existing.amount : existing.amount;
      await tx.wallet.update({
        where: { id: existing.walletId },
        data: {
          balance: {
            increment: reverseChange,
          },
        },
      });

      // Delete the transaction
      await tx.transaction.delete({
        where: { id },
      });
    });

    return NextResponse.json({ message: "Transaction deleted successfully" });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }
    if (error instanceof NextResponse) return error;
    console.error("Error deleting transaction:", error);
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 }
    );
  }
}
