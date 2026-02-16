import prisma from "@/lib/prisma/prisma";
import { DEFAULT_CATEGORIES } from "@/lib/constants/categories";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "../protection";

async function seedDefaultCategories(
  organizationId: string,
  userId: string
) {
  const existingCount = await prisma.category.count({
    where: { organizationId },
  });
  if (existingCount > 0) return;

  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((cat) => ({
      ...cat,
      userId,
      organizationId,
    })),
  });
}

// GET all categories
export async function GET(request: NextRequest) {
  try {
    const { userId, organizationId } = await getAuthContext(request);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    // Auto-seed default categories on first fetch
    await seedDefaultCategories(organizationId, userId);

    const categories = await prisma.category.findMany({
      where: {
        organizationId,
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
    if (error instanceof NextResponse) return error;
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
    const { userId, organizationId } = await getAuthContext(request);

    const body = await request.json();
    const { name, type, color, icon } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: "Name and type are required" },
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
        organizationId,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
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
    const { organizationId } = await getAuthContext(request);

    const body = await request.json();
    const { id, name, color, icon } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Category id is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.category.findFirst({
      where: { id, organizationId },
    });

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
    if (error instanceof NextResponse) return error;
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
    const { organizationId } = await getAuthContext(request);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Category id is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.category.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Check if any transactions use this category
    const transactionCount = await prisma.transaction.count({
      where: { categoryId: id, organizationId },
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
    if (error instanceof NextResponse) return error;
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
