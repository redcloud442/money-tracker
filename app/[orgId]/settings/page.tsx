"use client";

import { authClient, useSession } from "@/lib/better-auth/auth-client";
import {
  Button,
  Group,
  Paper,
  PasswordInput,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";

export default function SettingsPage() {
  const { data: session } = useSession();
  const profileForm = useForm({
    initialValues: {
      name: session?.user?.name || "",
      email: session?.user?.email || "",
    },
  });

  const passwordForm = useForm({
    initialValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const handleProfileUpdate = async (values: typeof profileForm.values) => {
    const response = await authClient.updateUser({
      name: values.name,
    });
    if (response.error) {
      notifications.show({
        title: "Error",
        message: response.error.message,
        color: "red",
      });
      return;
    }
    notifications.show({
      title: "Success",
      message: "Profile updated successfully",
      color: "teal",
    });
  };

  const handlePasswordUpdate = async (values: typeof passwordForm.values) => {
    const response = await authClient.changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
    if (response.error) {
      notifications.show({
        title: "Error",
        message: response.error.message,
        color: "red",
      });
      return;
    }
    notifications.show({
      title: "Success",
      message: "Password updated successfully",
      color: "teal",
    });
    passwordForm.reset();
  };

  return (
    <Stack gap="lg">
      <Title order={2}>Settings</Title>

      {/* Profile Settings */}
      <Paper withBorder p="md" radius="md">
        <Text fw={600} size="lg" mb="md">
          Profile Settings
        </Text>
        <form onSubmit={profileForm.onSubmit(handleProfileUpdate)}>
          <Stack gap="md">
            <TextInput
              label="Full Name"
              placeholder="Your name"
              {...profileForm.getInputProps("name")}
            />
            <TextInput
              label="Email"
              placeholder="your@email.com"
              type="email"
              {...profileForm.getInputProps("email")}
            />
            <Group justify="flex-end">
              <Button type="submit" color="blue">
                Update Profile
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>

      {/* Password Settings */}
      <Paper withBorder p="md" radius="md">
        <Text fw={600} size="lg" mb="md">
          Change Password
        </Text>
        <form onSubmit={passwordForm.onSubmit(handlePasswordUpdate)}>
          <Stack gap="md">
            <PasswordInput
              label="Current Password"
              placeholder="Enter current password"
              {...passwordForm.getInputProps("currentPassword")}
            />
            <PasswordInput
              label="New Password"
              placeholder="Enter new password"
              {...passwordForm.getInputProps("newPassword")}
            />
            <PasswordInput
              label="Confirm New Password"
              placeholder="Confirm new password"
              {...passwordForm.getInputProps("confirmPassword")}
            />
            <Group justify="flex-end">
              <Button type="submit" color="blue">
                Update Password
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>

      {/* App Preferences */}
      <Paper withBorder p="md" radius="md">
        <Text fw={600} size="lg" mb="md">
          Preferences
        </Text>
        <Stack gap="md">
          <Select
            label="Default Currency"
            placeholder="Select currency"
            data={[
              { value: "PHP", label: "PHP - Philippine Peso" },
              { value: "USD", label: "USD - US Dollar" },
              { value: "EUR", label: "EUR - Euro" },
              { value: "GBP", label: "GBP - British Pound" },
              { value: "JPY", label: "JPY - Japanese Yen" },
              { value: "CAD", label: "CAD - Canadian Dollar" },
              { value: "AUD", label: "AUD - Australian Dollar" },
              { value: "SGD", label: "SGD - Singapore Dollar" },
              { value: "KRW", label: "KRW - South Korean Won" },
              { value: "CNY", label: "CNY - Chinese Yuan" },
            ]}
            defaultValue="PHP"
          />
          <Select
            label="Date Format"
            placeholder="Select format"
            data={[
              { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
              { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
              { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
            ]}
            defaultValue="MM/DD/YYYY"
          />
          <Switch label="Email notifications" defaultChecked />
          <Switch label="Push notifications" />
          <Switch label="Budget alerts" defaultChecked />
        </Stack>
      </Paper>

      {/* Danger Zone */}
      <Paper withBorder p="md" radius="md" style={{ borderColor: "#ef4444" }}>
        <Text fw={600} size="lg" mb="md" c="red">
          Danger Zone
        </Text>
        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Text fw={500}>Delete Account</Text>
              <Text size="sm" c="dimmed">
                Permanently delete your account and all data
              </Text>
            </div>
            <Button color="red" variant="outline">
              Delete Account
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );
}
