import prisma from "@/lib/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";
import { ProtectionMiddleware } from "../../protection";

// POST transfer money between wallets
export async function POST(request: NextRequest) {
  try {
    await ProtectionMiddleware(request);

    const body = await request.json();
    const { fromWalletId, toWalletId, amount, userId, description } = body;

    if (!fromWalletId || !toWalletId || !amount || !userId) {
      return NextResponse.json(
        {
          error: "fromWalletId, toWalletId, amount, and userId are required",
        },
        { status: 400 }
      );
    }

    if (fromWalletId === toWalletId) {
      return NextResponse.json(
        { error: "Cannot transfer to the same wallet" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than zero" },
        { status: 400 }
      );
    }

    const [fromWallet, toWallet] = await Promise.all([
      prisma.wallet.findUnique({ where: { id: fromWalletId } }),
      prisma.wallet.findUnique({ where: { id: toWalletId } }),
    ]);

    if (!fromWallet) {
      return NextResponse.json(
        { error: "Source wallet not found" },
        { status: 404 }
      );
    }

    if (!toWallet) {
      return NextResponse.json(
        { error: "Destination wallet not found" },
        { status: 404 }
      );
    }

    if (fromWallet.userId !== userId || toWallet.userId !== userId) {
      return NextResponse.json(
        { error: "Both wallets must belong to the specified user" },
        { status: 403 }
      );
    }

    if (fromWallet.balance < amount) {
      return NextResponse.json(
        { error: "Insufficient balance in source wallet" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Decrement source wallet balance
      const updatedFromWallet = await tx.wallet.update({
        where: { id: fromWalletId },
        data: { balance: { decrement: amount } },
      });

      // Increment destination wallet balance
      const updatedToWallet = await tx.wallet.update({
        where: { id: toWalletId },
        data: { balance: { increment: amount } },
      });

      // Create EXPENSE transaction on source wallet
      const expenseTransaction = await tx.transaction.create({
        data: {
          amount,
          type: "EXPENSE",
          description: description || `Transfer to ${toWallet.name}`,
          userId,
          walletId: fromWalletId,
        },
      });

      // Create INCOME transaction on destination wallet
      const incomeTransaction = await tx.transaction.create({
        data: {
          amount,
          type: "INCOME",
          description: description || `Transfer from ${fromWallet.name}`,
          userId,
          walletId: toWalletId,
        },
      });

      return {
        fromWallet: updatedFromWallet,
        toWallet: updatedToWallet,
        transactions: {
          expense: expenseTransaction,
          income: incomeTransaction,
        },
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error transferring between wallets:", error);
    return NextResponse.json(
      { error: "Failed to transfer between wallets" },
      { status: 500 }
    );
  }
}
