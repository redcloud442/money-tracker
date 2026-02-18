import prisma from "@/lib/prisma/prisma";
import { BudgetPeriod } from "@/app/generated/prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "../../protection";
import { computeNextRecurrenceDate } from "../../transactions/route";

function advanceBudgetDates(
  startDate: Date,
  endDate: Date,
  period: BudgetPeriod,
  renewDay: number | null
): { start: Date; end: Date } {
  if (renewDay !== null && period === "MONTHLY") {
    // Salary-day-based: start on renewDay of next month after endDate
    const nextStart = new Date(endDate);
    nextStart.setDate(renewDay);
    // Move to the month after endDate
    if (nextStart <= endDate) {
      nextStart.setMonth(nextStart.getMonth() + 1);
    }
    const nextEnd = new Date(nextStart);
    nextEnd.setMonth(nextEnd.getMonth() + 1);
    nextEnd.setDate(nextEnd.getDate() - 1);
    nextEnd.setHours(23, 59, 59, 999);
    return { start: nextStart, end: nextEnd };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  switch (period) {
    case "DAILY":
      start.setDate(start.getDate() + 1);
      end.setDate(end.getDate() + 1);
      break;
    case "WEEKLY":
      start.setDate(start.getDate() + 7);
      end.setDate(end.getDate() + 7);
      break;
    case "MONTHLY":
      start.setMonth(start.getMonth() + 1);
      end.setMonth(end.getMonth() + 1);
      break;
    case "YEARLY":
      start.setFullYear(start.getFullYear() + 1);
      end.setFullYear(end.getFullYear() + 1);
      break;
  }

  return { start, end };
}

export async function POST(request: NextRequest) {
  try {
    const { userId, organizationId } = await getAuthContext(request);

    const now = new Date();
    let processedTransactions = 0;
    let renewedBudgets = 0;

    // --- 3a: Process recurring transactions ---
    const dueTransactions = await prisma.transaction.findMany({
      where: {
        organizationId,
        isRecurring: true,
        nextRecurrenceDate: { lte: now },
      },
    });

    for (const tx of dueTransactions) {
      if (!tx.recurringInterval || !tx.nextRecurrenceDate) continue;

      let nextDate = new Date(tx.nextRecurrenceDate);

      // Loop to handle multiple missed periods
      while (nextDate <= now) {
        // Create a new non-recurring copy
        await prisma.$transaction(async (prismaTransaction) => {
          await prismaTransaction.transaction.create({
            data: {
              amount: tx.amount,
              type: tx.type,
              description: tx.description,
              date: nextDate,
              userId: tx.userId,
              organizationId: tx.organizationId,
              walletId: tx.walletId,
              categoryId: tx.categoryId,
              tags: tx.tags,
              notes: tx.notes,
              isRecurring: false,
              recurringInterval: null,
              nextRecurrenceDate: null,
            },
          });

          // Update wallet balance
          const balanceChange =
            tx.type === "INCOME" ? tx.amount : -tx.amount;
          await prismaTransaction.wallet.update({
            where: { id: tx.walletId },
            data: { balance: { increment: balanceChange } },
          });
        });

        processedTransactions++;
        nextDate = computeNextRecurrenceDate(nextDate, tx.recurringInterval);
      }

      // Update the original transaction's nextRecurrenceDate
      await prisma.transaction.update({
        where: { id: tx.id },
        data: { nextRecurrenceDate: nextDate },
      });
    }

    // --- 3b: Process budget renewals ---
    const expiredBudgets = await prisma.budget.findMany({
      where: {
        organizationId,
        autoRenew: true,
        endDate: { lt: now },
      },
    });

    for (const budget of expiredBudgets) {
      let { start, end } = advanceBudgetDates(
        budget.startDate,
        budget.endDate,
        budget.period,
        budget.renewDay
      );

      // Keep advancing until the new endDate covers now
      while (end < now) {
        const advanced = advanceBudgetDates(start, end, budget.period, budget.renewDay);
        start = advanced.start;
        end = advanced.end;
      }

      // Create a new budget for the current period
      await prisma.budget.create({
        data: {
          name: budget.name,
          amount: budget.amount,
          period: budget.period,
          startDate: start,
          endDate: end,
          userId: budget.userId,
          organizationId: budget.organizationId,
          categoryId: budget.categoryId,
          walletId: budget.walletId,
          autoRenew: true,
          renewDay: budget.renewDay,
        },
      });

      // Disable auto-renew on the old budget
      await prisma.budget.update({
        where: { id: budget.id },
        data: { autoRenew: false },
      });

      renewedBudgets++;
    }

    return NextResponse.json({ processedTransactions, renewedBudgets });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Error processing recurring items:", error);
    return NextResponse.json(
      { error: "Failed to process recurring items" },
      { status: 500 }
    );
  }
}
