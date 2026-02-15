import OnboardingPage from "@/components/OnboardingPage/OnboardingPage";
import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function Onboarding() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  if (session?.session.activeOrganizationId) {
    redirect(`/${session.session.activeOrganizationId}`);
  }

  return <OnboardingPage />;
}
