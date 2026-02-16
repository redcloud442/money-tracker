import { DEFAULT_CATEGORIES } from "../constants/categories";
import prisma from "../prisma/prisma";

export const setupDefaultResources = async (organizationId: string) => {
  // Seed default categories for the new organization
  const ownerMember = await prisma.member.findFirst({
    where: { organizationId, role: "owner" },
  });

  if (!ownerMember) return;

  const existingCount = await prisma.category.count({
    where: { organizationId },
  });

  if (existingCount === 0) {
    await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((cat) => ({
        ...cat,
        userId: ownerMember.userId,
        organizationId,
      })),
    });
  }
};

export const syncOrganizationToExternalSystems = async (
  organization: { id: string; name: string; slug: string } | null
) => {
  if (!organization) return;
  // Placeholder for external system sync
  console.log(`Syncing organization ${organization.id} to external systems`);
};
