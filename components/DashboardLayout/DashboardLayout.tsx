"use client";

import { authClient, useSession } from "@/lib/better-auth/auth-client";
import {
  ActionIcon,
  AppShell,
  Avatar,
  Burger,
  Group,
  Menu,
  NavLink,
  Text,
  Tooltip,
  UnstyledButton,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconChartBar,
  IconCreditCard,
  IconHome,
  IconLogout,
  IconMoon,
  IconReceipt,
  IconSettings,
  IconSun,
  IconUsers,
  IconWallet,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
  orgId: string;
}

export default function DashboardLayout({
  children,
  orgId,
}: DashboardLayoutProps) {
  const [opened, { toggle, close }] = useDisclosure();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const userName = session?.user?.name || "User";
  const userInitial = userName.charAt(0).toUpperCase();
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("light");

  const toggleColorScheme = () => {
    setColorScheme(computedColorScheme === "dark" ? "light" : "dark");
  };

  const handleLogout = async () => {
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            notifications.show({
              title: "Logged out",
              message: "You have been successfully logged out",
            });
            router.push("/login");
          },
        },
      });
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to logout",
        color: "red",
      });
    }
  };

  const navLinks = [
    { icon: IconHome, label: "Dashboard", href: `/${orgId}` },
    {
      icon: IconReceipt,
      label: "Transactions",
      href: `/${orgId}/transactions`,
    },
    { icon: IconWallet, label: "Wallets", href: `/${orgId}/wallets` },
    {
      icon: IconCreditCard,
      label: "Budgets",
      href: `/${orgId}/budgets`,
    },
    {
      icon: IconChartBar,
      label: "Reports",
      href: `/${orgId}/reports`,
    },
    {
      icon: IconUsers,
      label: "Team",
      href: `/${orgId}/members`,
    },
    {
      icon: IconSettings,
      label: "Settings",
      href: `/${orgId}/settings`,
    },
  ];

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 250,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
            />
            <Text fw={700} size="xl" c="blue">
              Money Tracker
            </Text>
          </Group>

          <Group gap="sm">
            <Tooltip
              label={
                computedColorScheme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
            >
              <ActionIcon
                variant="subtle"
                size="lg"
                onClick={toggleColorScheme}
                color="gray"
              >
                {computedColorScheme === "dark" ? (
                  <IconSun size={20} />
                ) : (
                  <IconMoon size={20} />
                )}
              </ActionIcon>
            </Tooltip>

            <Menu shadow="md" width={200}>
              <Menu.Target>
                <UnstyledButton>
                  <Group gap="xs">
                    <Avatar color="blue" radius="xl" src={session?.user?.image}>
                      {userInitial}
                    </Avatar>
                    <Text size="sm" fw={500} visibleFrom="sm">
                      {userName}
                    </Text>
                  </Group>
                </UnstyledButton>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>Account</Menu.Label>
                <Menu.Item
                  leftSection={<IconSettings size={16} />}
                  component={Link}
                  href={`/${orgId}/settings`}
                >
                  Settings
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<IconLogout size={16} />}
                  onClick={handleLogout}
                >
                  Logout
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Text size="xs" c="dimmed" fw={500} mb="md" tt="uppercase">
          Navigation
        </Text>
        {navLinks.map((link) => (
          <NavLink
            key={link.href}
            component={Link}
            href={link.href}
            label={link.label}
            leftSection={<link.icon size={20} />}
            active={pathname === link.href}
            color="blue"
            variant="filled"
            mb={4}
            onClick={close}
          />
        ))}
      </AppShell.Navbar>

      {/* Mobile Bottom Navigation */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          borderTop: "1px solid var(--mantine-color-default-border)",
          backgroundColor: "var(--mantine-color-body)",
          padding: "4px 0",
        }}
        className="mantine-visible-from-xs mantine-hidden-from-sm"
      >
        <Group justify="space-around" gap={0}>
          {navLinks.slice(0, 5).map((link) => {
            const isActive = pathname === link.href;
            return (
              <UnstyledButton
                key={link.href}
                component={Link}
                href={link.href}
                style={{ textAlign: "center", flex: 1 }}
                onClick={close}
              >
                <link.icon
                  size={20}
                  style={{
                    color: isActive
                      ? "var(--mantine-color-blue-6)"
                      : "var(--mantine-color-dimmed)",
                    display: "block",
                    margin: "0 auto",
                  }}
                />
                <Text
                  size="xs"
                  c={isActive ? "blue" : "dimmed"}
                  fw={isActive ? 600 : 400}
                  mt={2}
                >
                  {link.label}
                </Text>
              </UnstyledButton>
            );
          })}
        </Group>
      </div>

      <AppShell.Main pb={80}>{children}</AppShell.Main>
    </AppShell>
  );
}
