import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import prisma from "../prisma/prisma";
import { sendEmail } from "../resend/resend";
import {
  setupDefaultResources,
  syncOrganizationToExternalSystems,
} from "./helper";
import InvitationEmail from "./invitation-email";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  experimental: { joins: true },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const organization = await prisma.organization.findFirst({
            where: {
              members: {
                some: {
                  userId: session.userId,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          });

          return {
            data: {
              ...session,
              slug: organization?.slug,
              activeOrganizationId: organization?.id,
            },
          };
        },
      },
    },
  },
  plugins: [
    organization({
      organizationHooks: {
        // Organization creation hooks
        beforeCreateOrganization: async ({ organization, user }) => {
          // Run custom logic before organization is created
          // Optionally modify the organization data
          return {
            data: {
              ...organization,
            },
          };
        },
        afterCreateOrganization: async ({ organization, member, user }) => {
          // Run custom logic after organization is created
          // e.g., create default resources, send notifications
          await setupDefaultResources(organization.id);
        },
        // Organization update hooks
        beforeUpdateOrganization: async ({ organization, user, member }) => {
          // Validate updates, apply business rules
          return {
            data: {
              ...organization,
              name: organization.name?.toLowerCase(),
            },
          };
        },
        afterUpdateOrganization: async ({ organization, user, member }) => {
          // Sync changes to external systems
          await syncOrganizationToExternalSystems(organization);
        },
      },
      sendInvitationEmail: async (data) => {
        await sendEmail({
          to: data.email,
          subject: `Invitation to join ${data.organization.name}`,
          html: InvitationEmail({
            invitation: {
              email: data.email,
              organizationName: data.organization.name,
              inviterName: data.inviter.user.name,
              inviteLink: `${process.env.BETTER_AUTH_URL}/invitation/accept?token=${data.invitation.id}`,
              rejectLink: `${process.env.BETTER_AUTH_URL}/invitation/reject?token=${data.invitation.id}`,
            },
          }),
          from: `${process.env.BETTER_AUTH_EMAIL}`,
        });
      },
    }),

    nextCookies(),
  ],
});
