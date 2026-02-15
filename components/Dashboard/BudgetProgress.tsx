"use client";

import { Group, Paper, Progress, Stack, Text } from "@mantine/core";

interface Budget {
  id: string;
  name: string;
  spent: number;
  total: number;
  color: string;
}

interface BudgetProgressProps {
  budgets: Budget[];
}

export default function BudgetProgress({ budgets }: BudgetProgressProps) {
  if (budgets.length === 0) {
    return (
      <Paper withBorder p="xl" radius="md" ta="center">
        <Text c="dimmed">No budgets yet</Text>
      </Paper>
    );
  }

  return (
    <Stack gap="md">
      {budgets.map((budget) => {
        const percentage = Math.min((budget.spent / budget.total) * 100, 100);
        const isOverBudget = budget.spent > budget.total;

        return (
          <Paper key={budget.id} withBorder p="md" radius="md">
            <Group justify="space-between" mb="xs">
              <Text fw={500} size="sm">
                {budget.name}
              </Text>
              <Text size="sm" c={isOverBudget ? "red" : "dimmed"}>
                ₱{budget.spent.toFixed(2)} / ₱{budget.total.toFixed(2)}
              </Text>
            </Group>
            <Progress
              value={percentage}
              color={isOverBudget ? "red" : budget.color}
              size="lg"
              radius="xl"
            />
            {isOverBudget && (
              <Text size="xs" c="red" mt={4}>
                Over budget by ₱{(budget.spent - budget.total).toFixed(2)}
              </Text>
            )}
          </Paper>
        );
      })}
    </Stack>
  );
}
