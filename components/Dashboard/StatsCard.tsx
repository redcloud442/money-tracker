"use client";

import { Group, Paper, Text } from "@mantine/core";
import type { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export default function StatsCard({
  title,
  value,
  icon,
  color,
  trend,
}: StatsCardProps) {
  return (
    <Paper withBorder p="md" radius="md">
      <Group justify="space-between">
        <div>
          <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
            {title}
          </Text>
          <Text fw={700} size="xl" mt="xs" c={color}>
            {value}
          </Text>
          {trend && (
            <Text size="xs" c={trend.isPositive ? "teal" : "red"} mt={4}>
              {trend.isPositive ? "+" : "-"}
              {trend.value}% from last period
            </Text>
          )}
        </div>
        <div
          style={{
            color: `var(--mantine-color-${color}-6)`,
          }}
        >
          {icon}
        </div>
      </Group>
    </Paper>
  );
}
