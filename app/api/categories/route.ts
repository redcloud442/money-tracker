import prisma from "@/lib/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_CATEGORIES = [
  // Expense categories
  { name: "Food & Dining", type: "EXPENSE" as const, color: "#ef4444", icon: "food" },
  { name: "Transportation", type: "EXPENSE" as const, color: "#f97316", icon: "car" },
  { name: "Entertainment", type: "EXPENSE" as const, color: "#a855f7", icon: "movie" },
  { name: "Shopping", type: "EXPENSE" as const, color: "#ec4899", icon: "shopping" },
  { name: "Bills & Utilities", type: "EXPENSE" as const, color: "#06b6d4", icon: "bill" },
  { name: "Healthcare", type: "EXPENSE" as const, color: "#10b981", icon: "health" },
  { name: "Education", type: "EXPENSE" as const, color: "#6366f1", icon: "education" },
  { name: "Rent & Housing", type: "EXPENSE" as const, color: "#8b5cf6", icon: "house" },
  { name: "Insurance", type: "EXPENSE" as const, color: "#14b8a6", icon: "shield" },
  { name: "Subscriptions", type: "EXPENSE" as const, color: "#f43f5e", icon: "subscription" },
  { name: "Personal Care", type: "EXPENSE" as const, color: "#d946ef", icon: "person" },
  { name: "Gifts & Donations", type: "EXPENSE" as const, color: "#e11d48", icon: "gift" },
  { name: "Travel", type: "EXPENSE" as const, color: "#0ea5e9", icon: "plane" },
  { name: "Groceries", type: "EXPENSE" as const, color: "#22c55e", icon: "grocery" },
  { name: "Other Expense", type: "EXPENSE" as const, color: "#6b7280", icon: "other" },
  // Income categories
  { name: "Salary", type: "INCOME" as const, color: "#22c55e", icon: "salary" },
  { name: "Freelance", type: "INCOME" as const, color: "#3b82f6", icon: "freelance" },
  { name: "Investment Returns", type: "INCOME" as const, color: "#8b5cf6", icon: "investment" },
  { name: "Business Income", type: "INCOME" as const, color: "#f59e0b", icon: "business" },
  { name: "Rental Income", type: "INCOME" as const, color: "#14b8a6", icon: "rent" },
  { name: "Side Hustle", type: "INCOME" as const, color: "#06b6d4", icon: "hustle" },
  { name: "Bonus", type: "INCOME" as const, color: "#eab308", icon: "bonus" },
  { name: "Refund", type: "INCOME" as const, color: "#10b981", icon: "refund" },
  { name: "Other Income", type: "INCOME" as const, color: "#6b7280", icon: "other" },
];

async function seedDefaultCategories(userId: string) {
  const existingCount = await prisma.category.count({ where: { userId } });
  if (existingCount > 0) return;

  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((cat) => ({
      ...cat,
      userId,
    })),
  });
}

// GET all categories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const type = searchParams.get("type");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Auto-seed default categories on first fetch
    await seedDefaultCategories(userId);

    const categories = await prisma.category.findMany({
      where: {
        userId,
        ...(type && { type: type as "INCOME" | "EXPENSE" }),
      },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

// POST new category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, color, icon, userId } = body;

    if (!name || !type || !userId) {
      return NextResponse.json(
        { error: "Name, type, and userId are required" },
        { status: 400 }
      );
    }

    if (type !== "INCOME" && type !== "EXPENSE") {
      return NextResponse.json(
        { error: "Type must be either INCOME or EXPENSE" },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        name,
        type,
        color,
        icon,
        userId,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}

// PUT update category
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, color, icon } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Category id is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.category.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(color !== undefined && { color }),
        ...(icon !== undefined && { icon }),
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

// DELETE category
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Category id is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.category.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Check if any transactions use this category
    const transactionCount = await prisma.transaction.count({
      where: { categoryId: id },
    });

    if (transactionCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete category: ${transactionCount} transaction(s) are using it`,
        },
        { status: 400 }
      );
    }

    await prisma.category.delete({ where: { id } });

    return NextResponse.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
