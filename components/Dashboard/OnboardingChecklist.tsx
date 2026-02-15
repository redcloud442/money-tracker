"use client";

import {
  ActionIcon,
  Group,
  Paper,
  Progress,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
import {
  IconCheck,
  IconCircle,
  IconCreditCard,
  IconReceipt,
  IconWallet,
  IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";

interface OnboardingChecklistProps {
  orgId: string;
  hasWallets: boolean;
  hasTransactions: boolean;
  hasBudgets: boolean;
}

export default function OnboardingChecklist({
  orgId,
  hasWallets,
  hasTransactions,
  hasBudgets,
}: OnboardingChecklistProps) {
  const [dismissed, setDismissed] = useState(false);

  const steps = [
    {
      label: "Create your first wallet",
      done: hasWallets,
      href: `/${orgId}/wallets`,
      icon: IconWallet,
    },
    {
      label: "Add a transaction",
      done: hasTransactions,
      href: `/${orgId}/transactions`,
      icon: IconReceipt,
    },
    {
      label: "Set up a budget",
      done: hasBudgets,
      href: `/${orgId}/budgets`,
      icon: IconCreditCard,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;

  if (dismissed || allDone) return null;

  const progress = (completedCount / steps.length) * 100;

  return (
    <Paper shadow="xs" p="md" radius="md" withBorder>
      <Group justify="space-between" mb="sm">
        <div>
          <Text fw={600} size="lg">
            Getting Started
          </Text>
          <Text size="sm" c="dimmed">
            {completedCount} of {steps.length} completed
          </Text>
        </div>
        <ActionIcon variant="subtle" color="gray" onClick={() => setDismissed(true)}>
          <IconX size={16} />
        </ActionIcon>
      </Group>

      <Progress value={progress} size="sm" radius="xl" mb="md" color="blue" />

      <Stack gap="xs">
        {steps.map((step) => (
          <UnstyledButton
            key={step.label}
            component={Link}
            href={step.href}
            style={{ borderRadius: 8 }}
          >
            <Group
              gap="sm"
              p="xs"
              style={{
                borderRadius: 8,
                backgroundColor: step.done
                  ? "var(--mantine-color-teal-light)"
                  : undefined,
              }}
            >
              <ThemeIcon
                size="sm"
                variant={step.done ? "filled" : "light"}
                color={step.done ? "teal" : "gray"}
                radius="xl"
              >
                {step.done ? <IconCheck size={12} /> : <IconCircle size={12} />}
              </ThemeIcon>
              <step.icon
                size={16}
                style={{
                  color: step.done
                    ? "var(--mantine-color-teal-6)"
                    : "var(--mantine-color-dimmed)",
                }}
              />
              <Text
                size="sm"
                fw={500}
                c={step.done ? "teal" : undefined}
                td={step.done ? "line-through" : undefined}
              >
                {step.label}
              </Text>
            </Group>
          </UnstyledButton>
        ))}
      </Stack>
    </Paper>
  );
}
