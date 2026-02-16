import prisma from "@/lib/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "../../protection";

// POST transfer money between wallets
export async function POST(request: NextRequest) {
  try {
    const { userId, organizationId } = await getAuthContext(request);

    const body = await request.json();
    const { fromWalletId, toWalletId, amount, description } = body;

    if (!fromWalletId || !toWalletId || !amount) {
      return NextResponse.json(
        {
          error: "fromWalletId, toWalletId, and amount are required",
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
      prisma.wallet.findFirst({ where: { id: fromWalletId, organizationId } }),
      prisma.wallet.findFirst({ where: { id: toWalletId, organizationId } }),
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

    if (fromWallet.balance < amount) {
      return NextResponse.json(
        { error: "Insufficient balance in source wallet" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedFromWallet = await tx.wallet.update({
        where: { id: fromWalletId },
        data: { balance: { decrement: amount } },
      });

      const updatedToWallet = await tx.wallet.update({
        where: { id: toWalletId },
        data: { balance: { increment: amount } },
      });

      const expenseTransaction = await tx.transaction.create({
        data: {
          amount,
          type: "EXPENSE",
          description: description || `Transfer to ${toWallet.name}`,
          userId,
          organizationId,
          walletId: fromWalletId,
        },
      });

      const incomeTransaction = await tx.transaction.create({
        data: {
          amount,
          type: "INCOME",
          description: description || `Transfer from ${fromWallet.name}`,
          userId,
          organizationId,
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
    if (error instanceof NextResponse) return error;
    console.error("Error transferring between wallets:", error);
    return NextResponse.json(
      { error: "Failed to transfer between wallets" },
      { status: 500 }
    );
  }
}
