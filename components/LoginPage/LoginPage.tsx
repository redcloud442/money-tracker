"use client";

import { authClient } from "@/lib/better-auth/auth-client";
import {
  Anchor,
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
} from "@tabler/icons-react";
import { zodResolver } from "mantine-form-zod-resolver";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";

const schema = z.object({
  email: z.email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type SubmitValues = z.infer<typeof schema>;

const LoginPage = () => {
  const router = useRouter();
  const form = useForm({
    initialValues: {
      email: "",
      password: "",
      rememberMe: false,
    },

    validate: zodResolver(schema),
  });

  const handleSubmit = async (values: SubmitValues) => {
    try {
      await authClient.signIn.email(
        {
          email: values.email,
          password: values.password,
          callbackURL: "/dashboard",
        },
        {
          onSuccess: ({ data: user }) => {
            notifications.show({
              title: "Success",
              message: "You have successfully logged in",
            });

            if (user.slug) {
              router.push(`/${user.slug}`);
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
      }}
    >
      <Container size={480} my={40}>
        <Paper
          withBorder
          shadow="lg"
          p={40}
          radius="md"
          style={{
            borderColor: "#e9ecef",
          }}
        >
          <Title order={1} ta="center" fw={700} c="blue" mb="xs" size="32px">
            Welcome Back
          </Title>
          <Text c="dimmed" size="sm" ta="center" mb={30}>
            Don't have an account?{" "}
            <Anchor
              size="sm"
              component={Link}
              href="/register"
              fw={600}
              c="blue"
            >
              Sign up for free
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
              Continue with Google
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
              Continue with GitHub
            </Button>
          </Stack>

          <Divider
            label="or continue with email"
            labelPosition="center"
            my={30}
          />

          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
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
                placeholder="Enter your password"
                required
                size="md"
                leftSection={<IconLock size={18} />}
                {...form.getInputProps("password")}
              />

              <Group justify="space-between" mt="xs">
                <Checkbox
                  label="Remember me"
                  size="sm"
                  color="blue"
                  {...form.getInputProps("rememberMe", { type: "checkbox" })}
                />
                <Anchor
                  component={Link}
                  href="/forgot-password"
                  size="sm"
                  fw={500}
                  c="blue"
                >
                  Forgot password?
                </Anchor>
              </Group>

              <Button
                type="submit"
                fullWidth
                size="md"
                mt="lg"
                color="blue"
                loading={form.submitting}
              >
                Sign In
              </Button>
            </Stack>
          </form>
        </Paper>
      </Container>
    </Box>
  );
};

export default LoginPage;
