"use client";

import { Badge, Group, Paper, Stack, Text } from "@mantine/core";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  type: "INCOME" | "EXPENSE";
}

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export default function RecentTransactions({
  transactions,
}: RecentTransactionsProps) {
  if (transactions.length === 0) {
    return (
      <Paper withBorder p="xl" radius="md" ta="center">
        <Text c="dimmed">No transactions yet</Text>
      </Paper>
    );
  }

  return (
    <Stack gap="sm">
      {transactions.map((transaction) => (
        <Paper key={transaction.id} withBorder p="md" radius="md">
          <Group justify="space-between">
            <div>
              <Text fw={500} size="sm">
                {transaction.description || "No description"}
              </Text>
              <Group gap="xs" mt={4}>
                <Badge
                  size="sm"
                  variant="light"
                  color={transaction.type === "INCOME" ? "teal" : "red"}
                >
                  {transaction.type}
                </Badge>
                <Text size="xs" c="dimmed">
                  {transaction.category}
                </Text>
                <Text size="xs" c="dimmed">
                  {new Date(transaction.date).toLocaleDateString()}
                </Text>
              </Group>
            </div>
            <Text
              fw={600}
              size="lg"
              c={transaction.type === "INCOME" ? "teal" : "red"}
            >
              {transaction.type === "INCOME" ? "+" : "-"}₱
              {transaction.amount.toFixed(2)}
            </Text>
          </Group>
        </Paper>
      ))}
    </Stack>
  );
}
