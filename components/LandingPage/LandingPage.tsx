"use client";

import {
  Badge,
  Button,
  Card,
  Container,
  Grid,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconBell,
  IconChartBar,
  IconPigMoney,
  IconWallet,
} from "@tabler/icons-react";
import Link from "next/link";

const LandingPage = () => {
  const features = [
    {
      icon: IconWallet,
      title: "Multiple Wallets",
      description:
        "Track cash, bank accounts, credit cards, and investments all in one place",
    },
    {
      icon: IconChartBar,
      title: "Visual Reports",
      description:
        "Get insights with beautiful charts and analytics of your spending patterns",
    },
    {
      icon: IconPigMoney,
      title: "Budget Planning",
      description:
        "Set budgets for different categories and track your progress",
    },
    {
      icon: IconBell,
      title: "Smart Notifications",
      description:
        "Get alerts when you're close to exceeding your budget limits",
    },
  ];
  return (
    <Container size="lg" py={80}>
      <Stack align="center" gap="xl">
        <Badge
          size="lg"
          variant="gradient"
          gradient={{ from: "blue", to: "cyan" }}
        >
          Free Forever
        </Badge>

        <Title
          order={1}
          size={48}
          ta="center"
          fw={900}
          style={{ lineHeight: 1.2 }}
        >
          Track Every Dollar,
          <br />
          <Text
            component="span"
            variant="gradient"
            gradient={{ from: "blue", to: "cyan" }}
            inherit
          >
            Master Your Money
          </Text>
        </Title>

        <Text size="xl" c="dimmed" ta="center" maw={600}>
          Take control of your finances with our simple and powerful money
          tracking app. Monitor income, expenses, and savings all in one place.
        </Text>

        <Group>
          <Button component={Link} href="/register" size="lg" variant="filled">
            Get Started Free
          </Button>
          <Button component={Link} href="/login" size="lg" variant="outline">
            Sign In
          </Button>
        </Group>

        <Grid mt={60} gutter="lg">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Grid.Col key={feature.title} span={{ base: 12, sm: 6 }}>
                <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
                  <Group mb="md">
                    <Icon size={32} color="var(--mantine-color-blue-6)" />
                    <Text fw={600} size="lg">
                      {feature.title}
                    </Text>
                  </Group>
                  <Text size="sm" c="dimmed">
                    {feature.description}
                  </Text>
                </Card>
              </Grid.Col>
            );
          })}
        </Grid>
      </Stack>
    </Container>
  );
};

export default LandingPage;
