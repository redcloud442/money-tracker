"use client";

import { authClient } from "@/lib/better-auth/auth-client";
import {
  Anchor,
  Badge,
  Box,
  Button,
  Checkbox,
  Container,
  Divider,
  Group,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconBrandGithub,
  IconBrandGoogle,
  IconLock,
  IconMail,
  IconUser,
} from "@tabler/icons-react";
import { zodResolver } from "mantine-form-zod-resolver";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
  acceptTerms: z
    .boolean()
    .refine((value) => value, "You must accept terms and conditions"),
});

type SubmitValues = z.infer<typeof schema>;

const RegisterPage = () => {
  const router = useRouter();
  const form = useForm({
    initialValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },

    validate: zodResolver(schema),
  });

  const handleSubmit = async (values: SubmitValues) => {
    try {
      await authClient.signUp.email(
        {
          email: values.email,
          password: values.password,
          name: values.name,
        },
        {
          onSuccess: ({ data: user }) => {
            notifications.show({
              title: "Account created",
              message: "You have successfully created your account",
            });
            if (user.activeOrganizationId) {
              router.push(`/${user.activeOrganizationId}`);
            } else {
              router.push("/onboarding");
            }
          },
          onError: (error) => {
            notifications.show({
              title: "Error",
              message: error.error.message,
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
    }
  };

  return (
    <Box
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        backgroundColor: "#ffffff",
      }}
    >
      <Container size={480} my={40}>
        <Paper
          withBorder
          shadow="lg"
          p={40}
          radius="md"
          style={{
            backgroundColor: "#ffffff",
            borderColor: "#e9ecef",
          }}
        >
          <Group justify="center" gap="xs" mb="xs">
            <Title order={1} ta="center" fw={700} c="blue" size="32px">
              Create Account
            </Title>
            <Badge color="blue" size="lg" variant="filled">
              Register for Free
            </Badge>
          </Group>
          <Text c="dimmed" size="sm" ta="center" mb={30}>
            Already have an account?{" "}
            <Anchor size="sm" component={Link} href="/login" fw={600} c="blue">
              Sign in
            </Anchor>
          </Text>

          <Stack gap="sm">
            <Button
              variant="default"
              size="md"
              leftSection={<IconBrandGoogle size={18} />}
              fullWidth
              styles={{
                root: {
                  borderColor: "#e9ecef",
                },
              }}
            >
              Sign up with Google
            </Button>
            <Button
              variant="default"
              size="md"
              leftSection={<IconBrandGithub size={18} />}
              fullWidth
              styles={{
                root: {
                  borderColor: "#e9ecef",
                },
              }}
            >
              Sign up with GitHub
            </Button>
          </Stack>

          <Divider
            label="or sign up with email"
            labelPosition="center"
            my={30}
          />

          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
              <TextInput
                label="Full Name"
                placeholder="John Doe"
                required
                size="md"
                leftSection={<IconUser size={18} />}
                {...form.getInputProps("name")}
              />

              <TextInput
                label="Email Address"
                placeholder="your@email.com"
                required
                size="md"
                leftSection={<IconMail size={18} />}
                {...form.getInputProps("email")}
              />

              <PasswordInput
                label="Password"
                placeholder="Create a strong password"
                required
                size="md"
                leftSection={<IconLock size={18} />}
                {...form.getInputProps("password")}
              />

              <PasswordInput
                label="Confirm Password"
                placeholder="Confirm your password"
                required
                size="md"
                leftSection={<IconLock size={18} />}
                {...form.getInputProps("confirmPassword")}
              />

              <Checkbox
                label={
                  <Text size="sm">
                    I agree to the{" "}
                    <Anchor size="sm" href="#" c="blue">
                      Terms of Service
                    </Anchor>{" "}
                    and{" "}
                    <Anchor size="sm" href="#" c="blue">
                      Privacy Policy
                    </Anchor>
                  </Text>
                }
                size="sm"
                color="blue"
                {...form.getInputProps("acceptTerms", { type: "checkbox" })}
              />

              <Button
                loading={form.submitting}
                type="submit"
                fullWidth
                size="md"
                mt="md"
                color="blue"
              >
                Create Account
              </Button>
            </Stack>
          </form>
        </Paper>
      </Container>
    </Box>
  );
};

export default RegisterPage;
