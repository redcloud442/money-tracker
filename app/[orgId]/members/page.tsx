"use client";

import {
  authClient,
  useActiveOrganization,
  useSession,
} from "@/lib/better-auth/auth-client";
import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Group,
  Loader,
  Menu,
  Modal,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconDots,
  IconMail,
  IconPlus,
  IconTrash,
  IconUserMinus,
} from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";

interface Member {
  id: string;
  userId: string;
  role: string;
  createdAt: Date | string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date | string;
  createdAt?: Date | string;
}

export default function MembersPage() {
  const [inviteOpened, { open: openInvite, close: closeInvite }] =
    useDisclosure(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { data: session } = useSession();
  const { data: activeOrg } = useActiveOrganization();
  const currentUserId = session?.user?.id;

  const inviteForm = useForm({
    initialValues: {
      email: "",
      role: "member",
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Invalid email"),
    },
  });

  const fetchOrgData = useCallback(async () => {
    if (!activeOrg?.id) return;
    try {
      const res = await authClient.organization.getFullOrganization({
        query: { organizationId: activeOrg.id },
      });

      if (res.data) {
        setMembers((res.data.members as Member[]) || []);
        setInvitations((res.data.invitations as Invitation[]) || []);
      }
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to fetch team data",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  }, [activeOrg?.id]);

  useEffect(() => {
    if (activeOrg?.id) {
      fetchOrgData();
    }
  }, [activeOrg?.id, fetchOrgData]);

  const handleInvite = async (values: typeof inviteForm.values) => {
    if (!activeOrg?.id) return;
    setSubmitting(true);
    try {
      const res = await authClient.organization.inviteMember({
        organizationId: activeOrg.id,
        email: values.email,
        role: values.role as "member" | "admin" | "owner",
      });

      if (res.error) {
        notifications.show({
          title: "Error",
          message: res.error.message || "Failed to send invitation",
          color: "red",
        });
      } else {
        notifications.show({
          title: "Invitation sent",
          message: `An invitation has been sent to ${values.email}`,
          color: "teal",
        });
        inviteForm.reset();
        closeInvite();
        fetchOrgData();
      }
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to send invitation",
        color: "red",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (memberIdOrEmail: string) => {
    if (!activeOrg?.id) return;
    try {
      const res = await authClient.organization.removeMember({
        organizationId: activeOrg.id,
        memberIdOrEmail,
      });

      if (res.error) {
        notifications.show({
          title: "Error",
          message: res.error.message || "Failed to remove member",
          color: "red",
        });
      } else {
        notifications.show({
          title: "Member removed",
          message: "The member has been removed from the organization",
          color: "teal",
        });
        fetchOrgData();
      }
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to remove member",
        color: "red",
      });
    }
  };

  const handleUpdateRole = async (
    memberId: string,
    newRole: string
  ) => {
    if (!activeOrg?.id) return;
    try {
      const res = await authClient.organization.updateMemberRole({
        organizationId: activeOrg.id,
        memberId,
        role: newRole as "member" | "admin" | "owner",
      });

      if (res.error) {
        notifications.show({
          title: "Error",
          message: res.error.message || "Failed to update role",
          color: "red",
        });
      } else {
        notifications.show({
          title: "Role updated",
          message: "Member role has been updated",
          color: "teal",
        });
        fetchOrgData();
      }
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to update role",
        color: "red",
      });
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!activeOrg?.id) return;
    try {
      const res = await authClient.organization.cancelInvitation({
        invitationId,
      });

      if (res.error) {
        notifications.show({
          title: "Error",
          message: res.error.message || "Failed to cancel invitation",
          color: "red",
        });
      } else {
        notifications.show({
          title: "Invitation cancelled",
          message: "The invitation has been cancelled",
          color: "teal",
        });
        fetchOrgData();
      }
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to cancel invitation",
        color: "red",
      });
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      owner: "blue",
      admin: "grape",
      member: "gray",
    };
    return (
      <Badge color={colors[role] || "gray"} tt="capitalize">
        {role}
      </Badge>
    );
  };

  // Find the current user's role
  const currentMember = members.find((m) => m.userId === currentUserId);
  const isOwnerOrAdmin =
    currentMember?.role === "owner" || currentMember?.role === "admin";

  const pendingInvitations = invitations.filter(
    (inv) => inv.status === "pending"
  );

  if (loading) {
    return (
      <Stack align="center" justify="center" h={300}>
        <Loader />
        <Text c="dimmed">Loading team...</Text>
      </Stack>
    );
  }

  return (
    <>
      <Stack gap="lg">
        <Group justify="space-between">
          <div>
            <Title order={2}>Team</Title>
            <Text size="sm" c="dimmed" mt={4}>
              Manage who can access this organization
            </Text>
          </div>
          {isOwnerOrAdmin && (
            <Button leftSection={<IconPlus size={16} />} onClick={openInvite}>
              Invite Member
            </Button>
          )}
        </Group>

        {/* Current Members */}
        <Paper withBorder p="md" radius="md">
          <Text fw={600} size="lg" mb="md">
            Members ({members.length})
          </Text>
          {members.length === 0 ? (
            <Text c="dimmed" size="sm" ta="center" py="md">
              No members found
            </Text>
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Member</Table.Th>
                  <Table.Th>Role</Table.Th>
                  <Table.Th>Joined</Table.Th>
                  {isOwnerOrAdmin && <Table.Th />}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {members.map((member) => (
                  <Table.Tr key={member.id}>
                    <Table.Td>
                      <Group gap="sm">
                        <Avatar
                          color="blue"
                          radius="xl"
                          src={member.user.image}
                        >
                          {member.user.name?.charAt(0).toUpperCase() || "?"}
                        </Avatar>
                        <div>
                          <Text size="sm" fw={500}>
                            {member.user.name}
                            {member.userId === currentUserId && (
                              <Text span size="xs" c="dimmed" ml={4}>
                                (you)
                              </Text>
                            )}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {member.user.email}
                          </Text>
                        </div>
                      </Group>
                    </Table.Td>
                    <Table.Td>{getRoleBadge(member.role)}</Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {new Date(member.createdAt).toLocaleDateString()}
                      </Text>
                    </Table.Td>
                    {isOwnerOrAdmin && (
                      <Table.Td>
                        {member.role !== "owner" &&
                          member.userId !== currentUserId && (
                            <Menu shadow="md" width={180}>
                              <Menu.Target>
                                <ActionIcon variant="subtle" color="gray">
                                  <IconDots size={16} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Label>Change role</Menu.Label>
                                {member.role !== "admin" && (
                                  <Menu.Item
                                    leftSection={
                                      <IconUserMinus size={14} />
                                    }
                                    onClick={() =>
                                      handleUpdateRole(member.id, "admin")
                                    }
                                  >
                                    Make Admin
                                  </Menu.Item>
                                )}
                                {member.role !== "member" && (
                                  <Menu.Item
                                    leftSection={
                                      <IconUserMinus size={14} />
                                    }
                                    onClick={() =>
                                      handleUpdateRole(member.id, "member")
                                    }
                                  >
                                    Make Member
                                  </Menu.Item>
                                )}
                                <Menu.Divider />
                                <Menu.Item
                                  color="red"
                                  leftSection={<IconTrash size={14} />}
                                  onClick={() =>
                                    handleRemoveMember(member.id)
                                  }
                                >
                                  Remove
                                </Menu.Item>
                              </Menu.Dropdown>
                            </Menu>
                          )}
                      </Table.Td>
                    )}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Paper>

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <Paper withBorder p="md" radius="md">
            <Text fw={600} size="lg" mb="md">
              Pending Invitations ({pendingInvitations.length})
            </Text>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Role</Table.Th>
                  <Table.Th>Expires</Table.Th>
                  {isOwnerOrAdmin && <Table.Th />}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {pendingInvitations.map((invitation) => (
                  <Table.Tr key={invitation.id}>
                    <Table.Td>
                      <Group gap="sm">
                        <IconMail size={20} />
                        <Text size="sm">{invitation.email}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>{getRoleBadge(invitation.role)}</Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {new Date(invitation.expiresAt).toLocaleDateString()}
                      </Text>
                    </Table.Td>
                    {isOwnerOrAdmin && (
                      <Table.Td>
                        <Button
                          size="xs"
                          variant="subtle"
                          color="red"
                          onClick={() =>
                            handleCancelInvitation(invitation.id)
                          }
                        >
                          Cancel
                        </Button>
                      </Table.Td>
                    )}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        )}

        {/* Role Permissions Info */}
        <Paper withBorder p="md" radius="md">
          <Text fw={600} size="lg" mb="md">
            Role Permissions
          </Text>
          <Stack gap="sm">
            <Group justify="space-between">
              <div>
                <Text fw={500}>Owner</Text>
                <Text size="sm" c="dimmed">
                  Full access, can manage members and delete organization
                </Text>
              </div>
              {getRoleBadge("owner")}
            </Group>
            <Group justify="space-between">
              <div>
                <Text fw={500}>Admin</Text>
                <Text size="sm" c="dimmed">
                  Can manage finances, budgets, and invite members
                </Text>
              </div>
              {getRoleBadge("admin")}
            </Group>
            <Group justify="space-between">
              <div>
                <Text fw={500}>Member</Text>
                <Text size="sm" c="dimmed">
                  Can add transactions and view all data
                </Text>
              </div>
              {getRoleBadge("member")}
            </Group>
          </Stack>
        </Paper>
      </Stack>

      {/* Invite Modal */}
      <Modal
        opened={inviteOpened}
        onClose={closeInvite}
        title="Invite Member"
        centered
      >
        <form onSubmit={inviteForm.onSubmit(handleInvite)}>
          <Stack gap="md">
            <TextInput
              label="Email Address"
              placeholder="partner@example.com"
              required
              leftSection={<IconMail size={16} />}
              {...inviteForm.getInputProps("email")}
            />

            <Select
              label="Role"
              placeholder="Select role"
              required
              data={[
                {
                  value: "admin",
                  label: "Admin - Can manage finances and invite members",
                },
                {
                  value: "member",
                  label: "Member - Can add transactions and view data",
                },
              ]}
              {...inviteForm.getInputProps("role")}
            />

            <Text size="sm" c="dimmed">
              An email invitation will be sent to this address. The recipient
              must have an account or create one to accept the invitation.
            </Text>

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={closeInvite}>
                Cancel
              </Button>
              <Button type="submit" color="blue" loading={submitting}>
                Send Invitation
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
