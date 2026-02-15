"use client";

import StatsCard from "@/components/Dashboard/StatsCard";
import { useSession } from "@/lib/better-auth/auth-client";
import {
  Card,
  Grid,
  Group,
  Loader,
  Paper,
  Progress,
  Select,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconTrendingDown,
  IconTrendingUp,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Transaction {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  date: string;
  category?: { name: string } | null;
}

export default function ReportsPage() {
  const [period, setPeriod] = useState("month");
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const { data: session } = useSession();
  const userId = session?.user?.id;

  const fetchTransactions = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/transactions?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setAllTransactions(data.data);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchTransactions();
    }
  }, [userId, fetchTransactions]);

  // Filter transactions by selected period
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return allTransactions.filter((t) => {
      const date = new Date(t.date);
      switch (period) {
        case "week": {
          const weekAgo = new Date(now);
          weekAgo.setDate(now.getDate() - 7);
          return date >= weekAgo && date <= now;
        }
        case "month":
          return (
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear()
          );
        case "year":
          return date.getFullYear() === now.getFullYear();
        default:
          return true;
      }
    });
  }, [allTransactions, period]);

  // Compute stats
  const stats = useMemo(() => {
    const totalIncome = filteredTransactions
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = filteredTransactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + t.amount, 0);
    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    return { totalIncome, totalExpenses, netSavings, savingsRate };
  }, [filteredTransactions]);

  // Category breakdown for expenses
  const categoryExpenses = useMemo(() => {
    const expenseTransactions = filteredTransactions.filter(
      (t) => t.type === "EXPENSE"
    );
    const totalExpenses = expenseTransactions.reduce(
      (sum, t) => sum + t.amount,
      0
    );

    const categoryMap = new Map<string, number>();
    for (const t of expenseTransactions) {
      const name = t.category?.name || "Uncategorized";
      categoryMap.set(name, (categoryMap.get(name) || 0) + t.amount);
    }

    return Array.from(categoryMap.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions]);

  // Monthly comparison (for current year)
  const monthlyData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const yearTransactions = allTransactions.filter(
      (t) => new Date(t.date).getFullYear() === currentYear
    );

    const monthMap = new Map<number, { income: number; expenses: number }>();

    for (const t of yearTransactions) {
      const month = new Date(t.date).getMonth();
      const existing = monthMap.get(month) || { income: 0, expenses: 0 };
      if (t.type === "INCOME") {
        existing.income += t.amount;
      } else {
        existing.expenses += t.amount;
      }
      monthMap.set(month, existing);
    }

    return Array.from(monthMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([monthIndex, data]) => ({
        month: months[monthIndex],
        income: data.income,
        expenses: data.expenses,
      }));
  }, [allTransactions]);

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

  const categoryPieData = useMemo(
    () =>
      categoryExpenses.map((cat) => ({
        name: cat.category,
        value: cat.amount,
      })),
    [categoryExpenses]
  );

  if (loading) {
    return (
      <Stack align="center" justify="center" h={300}>
        <Loader />
        <Text c="dimmed">Loading reports...</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Reports & Analytics</Title>
        <Select
          value={period}
          onChange={(value) => setPeriod(value || "month")}
          data={[
            { value: "week", label: "This Week" },
            { value: "month", label: "This Month" },
            { value: "year", label: "This Year" },
          ]}
          w={150}
        />
      </Group>

      {/* Stats Overview */}
      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="Total Income"
            value={`₱${stats.totalIncome.toFixed(2)}`}
            icon={<IconArrowUpRight size={24} />}
            color="teal"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="Total Expenses"
            value={`₱${stats.totalExpenses.toFixed(2)}`}
            icon={<IconArrowDownRight size={24} />}
            color="red"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="Net Savings"
            value={`₱${stats.netSavings.toFixed(2)}`}
            icon={<IconTrendingUp size={24} />}
            color="green"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="Savings Rate"
            value={`${stats.savingsRate.toFixed(1)}%`}
            icon={<IconTrendingDown size={24} />}
            color="blue"
          />
        </Grid.Col>
      </Grid>

      {/* Category Breakdown */}
      <Paper withBorder p="md" radius="md">
        <Text fw={600} size="lg" mb="md">
          Expenses by Category
        </Text>
        {categoryExpenses.length === 0 ? (
          <Text c="dimmed" size="sm" ta="center" py="md">
            No expense data for this period
          </Text>
        ) : (
          <Stack gap="md">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={categoryPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                >
                  {categoryPieData.map((_, index) => (
                    <Cell
                      key={`cat-cell-${index}`}
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
            {categoryExpenses.map((cat) => (
              <div key={cat.category}>
                <Group justify="space-between" mb={4}>
                  <Text size="sm" fw={500}>
                    {cat.category}
                  </Text>
                  <Group gap="md">
                    <Text size="sm" c="dimmed">
                      ₱{cat.amount.toFixed(2)}
                    </Text>
                    <Text size="sm" fw={600} c="blue" w={50} ta="right">
                      {cat.percentage.toFixed(1)}%
                    </Text>
                  </Group>
                </Group>
                <Progress
                  value={cat.percentage}
                  color="blue"
                  size="sm"
                  radius="xl"
                />
              </div>
            ))}
          </Stack>
        )}
      </Paper>

      {/* Monthly Comparison */}
      <Paper withBorder p="md" radius="md">
        <Text fw={600} size="lg" mb="md">
          Monthly Comparison
        </Text>
        {monthlyData.length === 0 ? (
          <Text c="dimmed" size="sm" ta="center" py="md">
            No transaction data this year
          </Text>
        ) : (
          <Stack gap="md">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis
                  tickFormatter={(value: number) =>
                    `₱${value.toLocaleString()}`
                  }
                />
                <Tooltip
                  formatter={(value: number | undefined) =>
                    value
                      ? `₱${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                      : ""
                  }
                />
                <Legend />
                <Bar
                  dataKey="income"
                  name="Income"
                  fill="#12B886"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="expenses"
                  name="Expenses"
                  fill="#FA5252"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
            <Stack gap="sm">
              {monthlyData.map((data) => (
                <Card key={data.month} withBorder p="md">
                  <Group justify="space-between">
                    <Text fw={600}>{data.month}</Text>
                    <Group gap="xl">
                      <div>
                        <Text size="xs" c="dimmed">
                          Income
                        </Text>
                        <Text fw={600} c="teal">
                          ₱{data.income.toFixed(2)}
                        </Text>
                      </div>
                      <div>
                        <Text size="xs" c="dimmed">
                          Expenses
                        </Text>
                        <Text fw={600} c="red">
                          ₱{data.expenses.toFixed(2)}
                        </Text>
                      </div>
                      <div>
                        <Text size="xs" c="dimmed">
                          Savings
                        </Text>
                        <Text
                          fw={600}
                          c={data.income - data.expenses >= 0 ? "blue" : "red"}
                        >
                          ₱{(data.income - data.expenses).toFixed(2)}
                        </Text>
                      </div>
                    </Group>
                  </Group>
                </Card>
              ))}
            </Stack>
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}
