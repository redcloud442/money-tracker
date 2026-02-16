"use client";

import { Wallet } from "@/app/generated/prisma/client";
import BudgetProgress from "@/components/Dashboard/BudgetProgress";
import { useSession } from "@/lib/better-auth/auth-client";
import {
  Button,
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
import { IconPlus } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";

interface Category {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
}

interface Budget {
  id: string;
  name: string;
  amount: number;
  spent: number;
  period: string;
  category?: { name: string; color?: string } | null;
}

export default function BudgetsPage() {
  const [opened, { open, close }] = useDisclosure(false);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { data: session } = useSession();

  const form = useForm({
    initialValues: {
      name: "",
      amount: 0,
      period: "MONTHLY",
      categoryId: "",
      walletId: "",
    },
  });

  const fetchBudgets = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/budgets");
      if (res.ok) {
        setBudgets(await res.json());
      }
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to fetch budgets",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  }, [session]);

  const fetchCategories = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/categories?type=EXPENSE");
      if (res.ok) {
        setCategories(await res.json());
      }
    } catch {
      /* ignore */
    }
  }, [session]);

  const fetchWallets = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/wallets");
      if (res.ok) {
        setWallets(await res.json());
      }
    } catch {
      /* ignore */
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      fetchBudgets();
      fetchCategories();
      fetchWallets();
    }
  }, [session, fetchBudgets, fetchCategories]);

  const handleSubmit = async (values: typeof form.values) => {
    if (!session) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          amount: values.amount,
          period: values.period,
          categoryId: values.categoryId || undefined,
          walletId: values.walletId || undefined,
        }),
      });

      if (res.ok) {
        notifications.show({
          title: "Success",
          message: "Budget added successfully",
          color: "teal",
        });
        form.reset();
        close();
        fetchBudgets();
      } else {
        const error = await res.json();
        notifications.show({
          title: "Error",
          message: error.error || "Failed to add budget",
          color: "red",
        });
      }
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to add budget",
        color: "red",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Map budgets to the format BudgetProgress expects
  const budgetProgressData = budgets.map((b) => ({
    id: b.id,
    name: b.name,
    spent: b.spent,
    total: b.amount,
    color: b.category?.color || "blue",
  }));

  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const remaining = totalBudget - totalSpent;

  if (loading) {
    return (
      <Stack align="center" justify="center" h={300}>
        <Loader />
        <Text c="dimmed">Loading budgets...</Text>
      </Stack>
    );
  }

  return (
    <>
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={2}>Budgets</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={open}>
            Add Budget
          </Button>
        </Group>

        <BudgetProgress budgets={budgetProgressData} />

        {budgets.length > 0 && (
          <Paper withBorder p="md" radius="md">
            <Text fw={600} size="lg" mb="md">
              Budget Summary
            </Text>
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">
                  Total Budget
                </Text>
                <Text size="xl" fw={700}>
                  ₱{totalBudget.toFixed(2)}
                </Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  Total Spent
                </Text>
                <Text size="xl" fw={700} c="red">
                  ₱{totalSpent.toFixed(2)}
                </Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  Remaining
                </Text>
                <Text size="xl" fw={700} c={remaining >= 0 ? "teal" : "red"}>
                  ₱{remaining.toFixed(2)}
                </Text>
              </div>
            </Group>
          </Paper>
        )}
      </Stack>

      <Modal opened={opened} onClose={close} title="Add Budget" centered>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Budget Name"
              placeholder="e.g., Food & Dining"
              required
              {...form.getInputProps("name")}
            />

            <NumberInput
              label="Budget Amount"
              placeholder="0.00"
              required
              prefix="₱"
              decimalScale={2}
              min={0.01}
              {...form.getInputProps("amount")}
            />

            <Select
              label="Period"
              placeholder="Select period"
              required
              data={[
                { value: "DAILY", label: "Daily" },
                { value: "WEEKLY", label: "Weekly" },
                { value: "MONTHLY", label: "Monthly" },
                { value: "YEARLY", label: "Yearly" },
              ]}
              {...form.getInputProps("period")}
            />

            <Select
              label="Category"
              placeholder="Select category (optional)"
              data={categories.map((c) => ({ value: c.id, label: c.name }))}
              {...form.getInputProps("categoryId")}
              clearable
            />

            <Select
              label="Wallet"
              placeholder="Select wallet (optional)"
              data={wallets.map((w) => ({ value: w.id, label: w.name }))}
              {...form.getInputProps("walletId")}
              clearable
            />

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" color="blue" loading={submitting}>
                Add Budget
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
