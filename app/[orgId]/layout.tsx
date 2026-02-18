import DashboardLayout from "@/components/DashboardLayout/DashboardLayout";
import ActivityTracker from "@/components/PWA/ActivityTracker";
import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

const MainLayout = async ({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ orgId: string }>;
}) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const { orgId } = await params;

  if (!session) {
    redirect("/login");
  }

  if (session?.session.activeOrganizationId !== orgId) {
    redirect(`/${session.session.activeOrganizationId}`);
  }

  if (!session?.session.activeOrganizationId) {
    redirect("/onboarding");
  }

  return (
    <DashboardLayout orgId={orgId}>
      <ActivityTracker />
      {children}
    </DashboardLayout>
  );
};

export default MainLayout;
