"use client";

import { useSession } from "@/lib/better-auth/auth-client";
import {
  Button,
  Grid,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconPlus,
  IconWallet,
} from "@tabler/icons-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface Transaction {
  id: string;
  description?: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  date: string;
  category?: { name: string };
}

interface Wallet {
  id: string;
  name: string;
  balance: number;
}

const DashboardPage = () => {
  const params = useParams();
  const orgId = params.orgId as string;
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [hasBudgets, setHasBudgets] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    try {
      const [txRes, walletRes, budgetRes] = await Promise.all([
        fetch(`/api/transactions?userId=${userId}`),
        fetch(`/api/wallets?userId=${userId}`),
        fetch(`/api/budgets?userId=${userId}`),
      ]);

      if (txRes.ok) {
        const txData = await txRes.json();
        // Handle both { data: [...] } and [...] response formats
        setTransactions(Array.isArray(txData) ? txData : txData.data || []);
      }
      if (walletRes.ok) setWallets(await walletRes.json());
      if (budgetRes.ok) {
        const budgetData = await budgetRes.json();
        setHasBudgets(
          Array.isArray(budgetData) ? budgetData.length > 0 : false
        );
      }
    } catch {
      /* silently fail for dashboard */
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId, fetchData]);

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const totalIncome = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + t.amount, 0);

  const recentTransactions = transactions.slice(0, 5);

  const CHART_COLORS = [
    "#4C6EF5",
    "#7950F2",
    "#BE4BDB",
    "#E64980",
    "#FA5252",
    "#FD7E14",
    "#FAB005",
    "#40C057",
    "#12B886",
    "#15AABF",
  ];

  const categoryChartData = useMemo(() => {
    const expenseTransactions = transactions.filter(
      (t) => t.type === "EXPENSE"
    );
    const categoryMap = new Map<string, number>();
    for (const t of expenseTransactions) {
      const name = t.category?.name || "Uncategorized";
      categoryMap.set(name, (categoryMap.get(name) || 0) + t.amount);
    }
    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  if (loading) {
    return (
      <Stack align="center" justify="center" h={300}>
        <Loader />
        <Text c="dimmed">Loading dashboard...</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={1}>Dashboard</Title>
        <Button
          component={Link}
          href={`/${orgId}/transactions`}
          leftSection={<IconPlus size={16} />}
        >
          Add Transaction
        </Button>
      </Group>

      {/* Stats Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
        <Paper shadow="xs" p="md" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text c="dimmed" size="sm" tt="uppercase" fw={700}>
                Total Balance
              </Text>
              <Text fw={700} size="xl" mt="xs">
                ₱
                {totalBalance.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </Text>
            </div>
            <IconWallet size={32} color="gray" />
          </Group>
        </Paper>

        <Paper shadow="xs" p="md" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text c="dimmed" size="sm" tt="uppercase" fw={700}>
                Total Income
              </Text>
              <Text fw={700} size="xl" mt="xs" c="teal">
                ₱
                {totalIncome.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </Text>
            </div>
            <IconArrowUpRight size={32} color="teal" />
          </Group>
        </Paper>

        <Paper shadow="xs" p="md" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text c="dimmed" size="sm" tt="uppercase" fw={700}>
                Total Expenses
              </Text>
              <Text fw={700} size="xl" mt="xs" c="red">
                ₱
                {totalExpenses.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </Text>
            </div>
            <IconArrowDownRight size={32} color="red" />
          </Group>
        </Paper>
      </SimpleGrid>

      {/* Charts & Recent Activity */}
      <Grid gutter="lg">
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper shadow="xs" p="md" radius="md" withBorder>
            <Title order={3} mb="md">
              Spending Overview
            </Title>
            {categoryChartData.length === 0 ? (
              <Stack align="center" justify="center" h={300}>
                <Text c="dimmed" size="sm">
                  No expense data
                </Text>
              </Stack>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {categoryChartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number | undefined) =>
                      value
                        ? `₱${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                        : ""
                    }
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper shadow="xs" p="md" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={3}>Recent Transactions</Title>
              <Button
                component={Link}
                href={`/${orgId}/transactions`}
                variant="subtle"
                size="xs"
              >
                View All
              </Button>
            </Group>
            {recentTransactions.length === 0 ? (
              <Text c="dimmed" size="sm" ta="center" py="xl">
                No transactions yet
              </Text>
            ) : (
              <Stack gap="sm">
                {recentTransactions.map((transaction) => (
                  <Paper key={transaction.id} p="sm" withBorder>
                    <Group justify="space-between">
                      <div>
                        <Text fw={500} size="sm">
                          {transaction.description || "No description"}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {transaction.category?.name || "Uncategorized"}
                        </Text>
                      </div>
                      <Text
                        fw={600}
                        c={transaction.type === "INCOME" ? "teal" : "red"}
                      >
                        {transaction.type === "INCOME" ? "+" : "-"}₱
                        {transaction.amount.toFixed(2)}
                      </Text>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid.Col>
      </Grid>

      {/* Quick Actions */}
      <Paper shadow="xs" p="md" radius="md" withBorder>
        <Title order={3} mb="md">
          Quick Actions
        </Title>
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
          <Button
            component={Link}
            href={`/${orgId}/transactions`}
            variant="light"
            fullWidth
          >
            View Transactions
          </Button>
          <Button
            component={Link}
            href={`/${orgId}/wallets`}
            variant="light"
            fullWidth
          >
            Manage Wallets
          </Button>
          <Button
            component={Link}
            href={`/${orgId}/budgets`}
            variant="light"
            fullWidth
          >
            Set Budgets
          </Button>
          <Button
            component={Link}
            href={`/${orgId}/reports`}
            variant="light"
            fullWidth
          >
            View Reports
          </Button>
        </SimpleGrid>
      </Paper>
    </Stack>
  );
};

export default DashboardPage;
