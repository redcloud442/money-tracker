"use client";

import { authClient, useSession } from "@/lib/better-auth/auth-client";
import {
  Group,
  Loader,
  Menu,
  Paper,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconBuilding,
  IconCheck,
  IconChevronDown,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  role: string;
}

export default function OrgSwitcher() {
  const router = useRouter();
  const { data: session } = useSession();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  const activeOrgId = session?.session?.activeOrganizationId;

  const fetchOrganizations = useCallback(async () => {
    try {
      const res = await fetch("/api/organizations");
      if (res.ok) {
        setOrganizations(await res.json());
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchOrganizations();
    }
  }, [session, fetchOrganizations]);

  const activeOrg = organizations.find((o) => o.id === activeOrgId);

  const handleSwitch = async (orgId: string) => {
    if (orgId === activeOrgId) return;
    setSwitching(true);
    try {
      await authClient.organization.setActive({
        organizationId: orgId,
      });
      const targetOrg = organizations.find((o) => o.id === orgId);
      notifications.show({
        title: "Organization switched",
        message: `Switched to ${targetOrg?.name}`,
        color: "teal",
      });
      router.push(`/${orgId}`);
      router.refresh();
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to switch organization",
        color: "red",
      });
    } finally {
      setSwitching(false);
    }
  };

  if (loading) {
    return (
      <Paper p="xs" mb="sm">
        <Group justify="center">
          <Loader size="xs" />
        </Group>
      </Paper>
    );
  }

  if (organizations.length <= 1) {
    return (
      <Paper p="xs" mb="sm" withBorder radius="md">
        <Group gap="xs">
          <IconBuilding size={16} color="var(--mantine-color-blue-6)" />
          <Text size="sm" fw={500} truncate="end">
            {activeOrg?.name || "Organization"}
          </Text>
        </Group>
      </Paper>
    );
  }

  return (
    <Menu shadow="md" width={250}>
      <Menu.Target>
        <UnstyledButton w="100%" mb="sm">
          <Paper p="xs" withBorder radius="md">
            <Group justify="space-between">
              <Group gap="xs">
                <IconBuilding size={16} color="var(--mantine-color-blue-6)" />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <Text size="xs" c="dimmed" lh={1}>
                    Organization
                  </Text>
                  <Text size="sm" fw={500} truncate="end">
                    {activeOrg?.name || "Select org"}
                  </Text>
                </div>
              </Group>
              <IconChevronDown size={14} color="var(--mantine-color-dimmed)" />
            </Group>
          </Paper>
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Your Organizations</Menu.Label>
        {organizations.map((org) => (
          <Menu.Item
            key={org.id}
            leftSection={<IconBuilding size={16} />}
            rightSection={
              org.id === activeOrgId ? (
                <IconCheck size={14} color="var(--mantine-color-teal-6)" />
              ) : null
            }
            onClick={() => handleSwitch(org.id)}
            disabled={switching}
          >
            <div>
              <Text size="sm">{org.name}</Text>
              <Text size="xs" c="dimmed">
                {org.role}
              </Text>
            </div>
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
