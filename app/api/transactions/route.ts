import prisma from "@/lib/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET all transactions with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

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
    const where: Record<string, unknown> = { userId };

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
    const body = await request.json();
    const {
      amount,
      type,
      description,
      userId,
      walletId,
      categoryId,
      date,
      tags,
      notes,
      isRecurring,
      recurringInterval,
      nextRecurrenceDate,
    } = body;

    if (!amount || !type || !userId || !walletId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create transaction and update wallet balance atomically
    const transaction = await prisma.$transaction(async (tx) => {
      const newTransaction = await tx.transaction.create({
        data: {
          amount,
          type,
          description,
          userId,
          walletId,
          categoryId,
          date: date ? new Date(date) : new Date(),
          tags: tags || [],
          notes,
          isRecurring: isRecurring || false,
          recurringInterval: recurringInterval || null,
          nextRecurrenceDate: nextRecurrenceDate
            ? new Date(nextRecurrenceDate)
            : null,
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

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
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
      nextRecurrenceDate,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Transaction id is required" },
        { status: 400 }
      );
    }

    const transaction = await prisma.$transaction(async (tx) => {
      // Fetch the existing transaction to reverse its balance effect
      const existing = await tx.transaction.findUnique({
        where: { id },
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
      if (nextRecurrenceDate !== undefined)
        updateData.nextRecurrenceDate = nextRecurrenceDate
          ? new Date(nextRecurrenceDate)
          : null;

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

    return NextResponse.json(transaction);
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }
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
      const existing = await tx.transaction.findUnique({
        where: { id },
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
    console.error("Error deleting transaction:", error);
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 }
    );
  }
}
