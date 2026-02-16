"use client";

import { useSession } from "@/lib/better-auth/auth-client";
import {
  Button,
  ColorInput,
  Grid,
  Group,
  Loader,
  Modal,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconPlus, IconWallet } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";

interface Wallet {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  color: string | null;
}

export default function WalletsPage() {
  const [opened, { open, close }] = useDisclosure(false);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { data: session } = useSession();

  const form = useForm({
    initialValues: {
      name: "",
      type: "CASH",
      balance: 0,
      currency: "PHP",
      color: "#3b82f6",
    },
  });

  const fetchWallets = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/wallets");
      if (res.ok) {
        setWallets(await res.json());
      }
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to fetch wallets",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      fetchWallets();
    }
  }, [session, fetchWallets]);

  const handleSubmit = async (values: typeof form.values) => {
    if (!session) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (res.ok) {
        notifications.show({
          title: "Success",
          message: "Wallet added successfully",
          color: "teal",
        });
        form.reset();
        close();
        fetchWallets();
      } else {
        const error = await res.json();
        notifications.show({
          title: "Error",
          message: error.error || "Failed to add wallet",
          color: "red",
        });
      }
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to add wallet",
        color: "red",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);

  if (loading) {
    return (
      <Stack align="center" justify="center" h={300}>
        <Loader />
        <Text c="dimmed">Loading wallets...</Text>
      </Stack>
    );
  }

  return (
    <>
      <Stack gap="lg">
        <Group justify="space-between">
          <div>
            <Title order={2}>Wallets</Title>
            <Text size="sm" c="dimmed" mt={4}>
              Total Balance: ₱{totalBalance.toFixed(2)}
            </Text>
          </div>
          <Button leftSection={<IconPlus size={16} />} onClick={open}>
            Add Wallet
          </Button>
        </Group>

        {wallets.length === 0 ? (
          <Paper withBorder p="xl" radius="md" ta="center">
            <Text c="dimmed">No wallets yet. Create your first wallet!</Text>
          </Paper>
        ) : (
          <Grid>
            {wallets.map((wallet) => (
              <Grid.Col key={wallet.id} span={{ base: 12, sm: 6, md: 4 }}>
                <Paper withBorder p="lg" radius="md">
                  <Group justify="space-between" mb="md">
                    <div
                      style={{
                        backgroundColor: (wallet.color || "#3b82f6") + "20",
                        color: wallet.color || "#3b82f6",
                        padding: "10px",
                        borderRadius: "8px",
                      }}
                    >
                      <IconWallet size={24} />
                    </div>
                    <Text size="xs" c="dimmed" tt="uppercase">
                      {wallet.type.replace("_", " ")}
                    </Text>
                  </Group>
                  <Text fw={600} size="lg">
                    {wallet.name}
                  </Text>
                  <Text
                    size="xl"
                    fw={700}
                    c={wallet.balance >= 0 ? "teal" : "red"}
                    mt="xs"
                  >
                    ₱{wallet.balance.toFixed(2)}
                  </Text>
                  <Text size="xs" c="dimmed" mt="xs">
                    {wallet.currency}
                  </Text>
                </Paper>
              </Grid.Col>
            ))}
          </Grid>
        )}
      </Stack>

      <Modal opened={opened} onClose={close} title="Add Wallet" centered>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Wallet Name"
              placeholder="My Wallet"
              required
              {...form.getInputProps("name")}
            />

            <Select
              label="Wallet Type"
              placeholder="Select type"
              required
              data={[
                { value: "CASH", label: "Cash" },
                { value: "BANK", label: "Bank Account" },
                { value: "CREDIT_CARD", label: "Credit Card" },
                { value: "DEBIT_CARD", label: "Debit Card" },
                { value: "SAVINGS", label: "Savings" },
                { value: "INVESTMENT", label: "Investment" },
                { value: "OTHER", label: "Other" },
              ]}
              {...form.getInputProps("type")}
            />

            <NumberInput
              label="Initial Balance"
              placeholder="0.00"
              required
              prefix="₱"
              decimalScale={2}
              {...form.getInputProps("balance")}
            />

            <Select
              label="Currency"
              placeholder="Select currency"
              required
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
              {...form.getInputProps("currency")}
            />

            <ColorInput
              label="Color"
              placeholder="Pick color"
              {...form.getInputProps("color")}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" color="blue" loading={submitting}>
                Add Wallet
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
