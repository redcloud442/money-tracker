import AcceptInvitation from "@/components/AcceptInvitation/AcceptInvitation";

export default async function Page({
  params,
}: {
  params: Promise<{ action: "accept" | "reject"; token: string }>;
}) {
  const { action } = await params;

  return <AcceptInvitation action={action} />;
}
