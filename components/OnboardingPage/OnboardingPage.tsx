"use client";

import { authClient, useSession } from "@/lib/better-auth/auth-client";
import {
  Box,
  Button,
  Container,
  Group,
  Paper,
  Stack,
  Stepper,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconBuildingStore,
  IconCheck,
  IconRocket,
  IconUser,
} from "@tabler/icons-react";
import { zodResolver } from "mantine-form-zod-resolver";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

const schema = z.object({
  organizationName: z
    .string()
    .min(2, "Organization name must be at least 2 characters")
    .max(50, "Organization name must be less than 50 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(30, "Slug must be less than 30 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must only contain lowercase letters, numbers, and hyphens"
    ),
});

type FormValues = z.infer<typeof schema>;

const OnboardingPage = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    initialValues: {
      organizationName: "",
      slug: "",
    },
    validate: zodResolver(schema),
  });

  // Auto-generate slug from organization name
  const handleOrganizationNameChange = (value: string) => {
    form.setFieldValue("organizationName", value);

    // Auto-generate slug if user hasn't manually edited it
    const generatedSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

    form.setFieldValue("slug", generatedSlug);
  };

  const handleSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      await authClient.organization.create(
        {
          name: values.organizationName,
          slug: values.slug,
          userId: session?.user.id,
          keepCurrentActiveOrganization: false,
        },
        {
          onSuccess: ({ data: organization }) => {
            router.push(`/${organization.id}`);
          },
          onError: (error) => {
            notifications.show({
              title: "Error",
              message: (error as unknown as Error).message,
              color: "red",
            });
          },
        }
      );
    } catch (error) {
      notifications.show({
        title: "Error",
        message: (error as Error).message,
        color: "red",
      });
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (active === 0) {
      if (!form.values.organizationName || !form.values.slug) {
        form.validate();
        return;
      }
      setActive((current) => (current < 1 ? current + 1 : current));
    }
  };

  const prevStep = () =>
    setActive((current) => (current > 0 ? current - 1 : current));

  return (
    <Box
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        backgroundColor: "#f8f9fa",
      }}
    >
      <Container size={680} my={40}>
        <Paper withBorder shadow="lg" p={40} radius="md">
          <Group justify="center" mb="xl">
            <IconRocket size={48} color="#228be6" />
          </Group>

          <Title order={1} ta="center" fw={700} c="blue" mb="xs" size="32px">
            Welcome to Money Tracker
          </Title>
          <Text c="dimmed" size="sm" ta="center" mb={40}>
            Let's get started by creating your organization
          </Text>

          <Stepper
            active={active}
            onStepClick={setActive}
            orientation="vertical"
            mb="xl"
          >
            <Stepper.Step
              label="Organization Details"
              description="Set up your workspace"
              icon={<IconBuildingStore size={18} />}
            >
              <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="md" mt="xl">
                  <TextInput
                    label="Organization Name"
                    placeholder="My Company"
                    description="This is the display name for your organization"
                    required
                    size="md"
                    leftSection={<IconBuildingStore size={18} />}
                    value={form.values.organizationName}
                    onChange={(e) =>
                      handleOrganizationNameChange(e.currentTarget.value)
                    }
                    error={form.errors.organizationName}
                  />

                  <TextInput
                    label="Organization Slug"
                    placeholder="my-company"
                    description="This will be used in your organization URL"
                    required
                    size="md"
                    {...form.getInputProps("slug")}
                  />

                  {form.values.slug && (
                    <Text size="xs" c="dimmed">
                      Your organization URL will be:{" "}
                      <Text component="span" fw={600} c="blue">
                        {window.location.origin}/{form.values.slug}
                      </Text>
                    </Text>
                  )}

                  <Group justify="flex-end" mt="xl">
                    <Button onClick={nextStep} size="md">
                      Continue
                    </Button>
                  </Group>
                </Stack>
              </form>
            </Stepper.Step>

            <Stepper.Step
              label="Review & Create"
              description="Confirm your details"
              icon={<IconUser size={18} />}
            >
              <Stack gap="md" mt="xl">
                <Paper p="md" withBorder>
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        Organization Name:
                      </Text>
                      <Text size="sm" fw={600}>
                        {form.values.organizationName}
                      </Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        Slug:
                      </Text>
                      <Text size="sm" fw={600} c="blue">
                        {form.values.slug}
                      </Text>
                    </Group>
                  </Stack>
                </Paper>

                <Text size="sm" c="dimmed" ta="center">
                  By creating an organization, you agree to our Terms of Service
                  and Privacy Policy.
                </Text>

                <Group justify="space-between" mt="xl">
                  <Button variant="default" onClick={prevStep} size="md">
                    Back
                  </Button>
                  <Button
                    onClick={() => form.onSubmit(handleSubmit)()}
                    size="md"
                    loading={loading}
                    leftSection={<IconCheck size={18} />}
                  >
                    Create Organization
                  </Button>
                </Group>
              </Stack>
            </Stepper.Step>

            <Stepper.Completed>
              <Stack align="center" gap="md" mt="xl">
                <IconCheck size={64} color="#51cf66" />
                <Title order={2}>All set!</Title>
                <Text c="dimmed">Redirecting to your dashboard...</Text>
              </Stack>
            </Stepper.Completed>
          </Stepper>
        </Paper>
      </Container>
    </Box>
  );
};

export default OnboardingPage;
