"use client";

import { authClient, useSession } from "@/lib/better-auth/auth-client";
import {
  Button,
  Center,
  Container,
  Loader,
  Paper,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface AcceptInvitationProps {
  action: "accept" | "reject";
}

const AcceptInvitation = ({ action }: AcceptInvitationProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { data: session, isPending: sessionLoading } = useSession();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );

  useEffect(() => {
    if (sessionLoading) return;

    // If not logged in, redirect to register with invitation token preserved
    if (!session) {
      const params = new URLSearchParams();
      if (token) params.set("invitationToken", token);
      params.set("invitationAction", action);
      router.push(`/register?${params.toString()}`);
      return;
    }

    const handleInvite = async () => {
      if (!token) {
        setStatus("error");
        return;
      }

      try {
        if (action === "accept") {
          const result = await authClient.organization.acceptInvitation({
            invitationId: token,
          });
          if (result.error) {
            setStatus("error");
          } else {
            setStatus("success");
          }
        } else {
          await authClient.organization.rejectInvitation({
            invitationId: token,
          });
          setStatus("success");
        }
      } catch (err) {
        console.error("Failed to process invitation:", err);
        setStatus("error");
      }
    };

    handleInvite();
  }, [token, action, session, sessionLoading, router]);

  const handleSuccessRedirect = async () => {
    if (action === "accept") {
      // Re-fetch session to get updated activeOrganizationId
      const freshSession = await authClient.getSession();
      const orgId = freshSession?.data?.session?.activeOrganizationId;
      router.push(orgId ? `/${orgId}` : "/onboarding");
    } else {
      router.push("/login");
    }
  };

  return (
    <Center mih="100vh">
      <Container size={420}>
        <Paper withBorder shadow="lg" p="xl" radius="md">
          {/* LOADING STATE */}
          {status === "loading" && (
            <Stack align="center" gap="md">
              <Loader size="lg" color="blue" />
              <Text fw={600} size="lg">
                Processing Request
              </Text>
              <Text c="dimmed" ta="center">
                Please wait while we {action === "accept" ? "accept" : "reject"}{" "}
                your invitation...
              </Text>
            </Stack>
          )}

          {/* ERROR STATE */}
          {status === "error" && (
            <Stack align="center" gap="md">
              <ThemeIcon size={64} radius="xl" color="red" variant="light">
                <IconAlertCircle size={32} />
              </ThemeIcon>
              <Text fw={600} size="lg">
                Something went wrong
              </Text>
              <Text c="dimmed" ta="center">
                The invitation link is either invalid, expired, or has already
                been used.
              </Text>
              <Button fullWidth mt="md" onClick={() => router.push("/login")}>
                Back to Login
              </Button>
            </Stack>
          )}

          {/* SUCCESS STATE */}
          {status === "success" && (
            <Stack align="center" gap="md">
              <ThemeIcon size={64} radius="xl" color="teal" variant="light">
                <IconCheck size={32} />
              </ThemeIcon>
              <Text fw={600} size="lg">
                Successfully {action === "accept" ? "Accepted" : "Rejected"}
              </Text>
              <Text c="dimmed" ta="center">
                Your request has been processed. You can now continue to the
                application.
              </Text>
              <Button fullWidth mt="md" onClick={handleSuccessRedirect}>
                {action === "accept" ? "Go to Dashboard" : "Return to Login"}
              </Button>
            </Stack>
          )}
        </Paper>
      </Container>
    </Center>
  );
};

export default AcceptInvitation;
