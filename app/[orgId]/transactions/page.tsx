"use client";

import { useSession } from "@/lib/better-auth/auth-client";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Modal,
  NumberInput,
  Pagination,
  Paper,
  Select,
  Skeleton,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconDownload,
  IconEdit,
  IconPlus,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  date: string;
  category: string;
  wallet?: { name: string };
  categoryRel?: { name: string };
  walletId?: string;
  categoryId?: string;
  recurring?: boolean;
  recurringInterval?: string | null;
}

interface Wallet {
  id: string;
  name: string;
  type: string;
}

interface Category {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
}

interface PaginatedResponse {
  data: Transaction[];
  total: number;
  page: number;
  limit: number;
}

const LIMIT = 20;

const RECURRING_INTERVALS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export default function TransactionsPage() {
  const { data: session } = useSession();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 400);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterCategoryId, setFilterCategoryId] = useState<string | null>(null);
  const [filterWalletId, setFilterWalletId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [page, setPage] = useState(1);

  const [addOpened, { open: openAdd, close: closeAdd }] = useDisclosure(false);
  const [editOpened, { open: openEdit, close: closeEdit }] =
    useDisclosure(false);
  const [transactionType, setTransactionType] = useState<"INCOME" | "EXPENSE">(
    "EXPENSE"
  );
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<string | null>(
    null
  );

  const [deleteOpened, { open: openDelete, close: closeDelete }] =
    useDisclosure(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const form = useForm({
    initialValues: {
      description: "",
      amount: 0,
      walletId: "",
      categoryId: "",
      date: new Date().toISOString().split("T")[0],
    },
  });

  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const fetchTransactions = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(LIMIT));

      if (debouncedSearch) params.set("search", debouncedSearch);
      if (filterType) params.set("type", filterType);
      if (filterCategoryId) params.set("categoryId", filterCategoryId);
      if (filterWalletId) params.set("walletId", filterWalletId);
      if (startDate) params.set("startDate", fmt(startDate));
      if (endDate) params.set("endDate", fmt(endDate));

      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (res.ok) {
        const json: PaginatedResponse = await res.json();
        const mapped: Transaction[] = json.data.map((t) => ({
          id: t.id,
          description: t.description || "No description",
          amount: t.amount,
          type: t.type,
          date: t.date,
          category:
            (
              t as unknown as Record<string, unknown> & {
                category?: { name: string };
              }
            ).category?.name || "Uncategorized",
          walletId: t.walletId,
          categoryId: t.categoryId,
          wallet: t.wallet,
          categoryRel: t.categoryRel,
          recurring: t.recurring,
          recurringInterval: t.recurringInterval,
        }));
        setTransactions(mapped);
        setTotal(json.total);
      }
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to fetch transactions",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  }, [
    session,
    page,
    debouncedSearch,
    filterType,
    filterCategoryId,
    filterWalletId,
    startDate,
    endDate,
  ]);

  const fetchWallets = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/wallets");
      if (res.ok) setWallets(await res.json());
    } catch {
      /* ignore */
    }
  }, [session]);

  const fetchCategories = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/categories");
      if (res.ok) setCategories(await res.json());
    } catch {
      /* ignore */
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      fetchWallets();
      fetchCategories();
    }
  }, [session, fetchWallets, fetchCategories]);

  useEffect(() => {
    if (session) {
      fetchTransactions();
    }
  }, [session, fetchTransactions]);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    filterType,
    filterCategoryId,
    filterWalletId,
    startDate,
    endDate,
  ]);

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === transactionType),
    [categories, transactionType]
  );

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const handleAdd = async (values: typeof form.values) => {
    if (!session) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: values.amount,
          type: transactionType,
          description: values.description,
          walletId: values.walletId,
          categoryId: values.categoryId || undefined,
          date: values.date,
          recurring: isRecurring,
          recurringInterval: isRecurring ? recurringInterval : null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        notifications.show({
          title: "Success",
          message: "Transaction added successfully",
          color: "teal",
        });
        if (data.budgetAlerts?.length) {
          for (const alert of data.budgetAlerts) {
            const isExceeded = alert.level === "exceeded";
            notifications.show({
              title: isExceeded ? "Budget Exceeded!" : "Budget Warning",
              message: isExceeded
                ? `Budget "${alert.name}" exceeded! ₱${alert.spent.toLocaleString(undefined, { minimumFractionDigits: 2 })} / ₱${alert.limit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                : `Budget "${alert.name}" is at ${alert.percentage}% (₱${alert.spent.toLocaleString(undefined, { minimumFractionDigits: 2 })} / ₱${alert.limit.toLocaleString(undefined, { minimumFractionDigits: 2 })})`,
              color: isExceeded ? "red" : "yellow",
              autoClose: 8000,
            });
          }
        }
        form.reset();
        setIsRecurring(false);
        setRecurringInterval(null);
        closeAdd();
        fetchTransactions();
        fetchWallets();
        localStorage.setItem(
          "money-tracker-last-activity",
          new Date().toISOString()
        );
      } else {
        const error = await res.json();
        notifications.show({
          title: "Error",
          message: error.error || "Failed to add transaction",
          color: "red",
        });
      }
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to add transaction",
        color: "red",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
    setTransactionType(tx.type);
    setIsRecurring(!!tx.recurring);
    setRecurringInterval(tx.recurringInterval ?? null);
    form.setValues({
      description: tx.description,
      amount: tx.amount,
      walletId: tx.walletId || "",
      categoryId: tx.categoryId || "",
      date: tx.date
        ? tx.date.split("T")[0]
        : new Date().toISOString().split("T")[0],
    });
    openEdit();
  };

  const handleEdit = async (values: typeof form.values) => {
    if (!session || !editingTransaction) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingTransaction.id,
          amount: values.amount,
          type: transactionType,
          description: values.description,
          walletId: values.walletId,
          categoryId: values.categoryId || undefined,
          date: values.date,
          recurring: isRecurring,
          recurringInterval: isRecurring ? recurringInterval : null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        notifications.show({
          title: "Success",
          message: "Transaction updated successfully",
          color: "teal",
        });
        if (data.budgetAlerts?.length) {
          for (const alert of data.budgetAlerts) {
            const isExceeded = alert.level === "exceeded";
            notifications.show({
              title: isExceeded ? "Budget Exceeded!" : "Budget Warning",
              message: isExceeded
                ? `Budget "${alert.name}" exceeded! ₱${alert.spent.toLocaleString(undefined, { minimumFractionDigits: 2 })} / ₱${alert.limit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                : `Budget "${alert.name}" is at ${alert.percentage}% (₱${alert.spent.toLocaleString(undefined, { minimumFractionDigits: 2 })} / ₱${alert.limit.toLocaleString(undefined, { minimumFractionDigits: 2 })})`,
              color: isExceeded ? "red" : "yellow",
              autoClose: 8000,
            });
          }
        }
        form.reset();
        setIsRecurring(false);
        setRecurringInterval(null);
        setEditingTransaction(null);
        closeEdit();
        fetchTransactions();
        fetchWallets();
        localStorage.setItem(
          "money-tracker-last-activity",
          new Date().toISOString()
        );
      } else {
        const error = await res.json();
        notifications.show({
          title: "Error",
          message: error.error || "Failed to update transaction",
          color: "red",
        });
      }
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to update transaction",
        color: "red",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/transactions?id=${deletingId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        notifications.show({
          title: "Deleted",
          message: "Transaction deleted successfully",
          color: "teal",
        });
        closeDelete();
        setDeletingId(null);
        fetchTransactions();
        fetchWallets();
      } else {
        const error = await res.json();
        notifications.show({
          title: "Error",
          message: error.error || "Failed to delete transaction",
          color: "red",
        });
      }
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to delete transaction",
        color: "red",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleExportCsv = async () => {
    if (!session) return;
    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("limit", String(total || 10000));

      if (debouncedSearch) params.set("search", debouncedSearch);
      if (filterType) params.set("type", filterType);
      if (filterCategoryId) params.set("categoryId", filterCategoryId);
      if (filterWalletId) params.set("walletId", filterWalletId);
      if (startDate) params.set("startDate", fmt(startDate));
      if (endDate) params.set("endDate", fmt(endDate));

      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (!res.ok) throw new Error("Fetch failed");

      const json: PaginatedResponse = await res.json();
      const rows = json.data;

      if (rows.length === 0) {
        notifications.show({
          title: "No data",
          message: "There are no transactions to export",
          color: "yellow",
        });
        return;
      }

      const csvHeader =
        "Date,Description,Type,Category,Wallet,Amount,Recurring,Interval";
      const csvRows = rows.map((t) => {
        const cat =
          (
            t as unknown as Record<string, unknown> & {
              category?: { name: string };
            }
          ).category?.name ||
          t.categoryRel?.name ||
          "";
        const wall = t.wallet?.name || "";
        const desc = `"${(t.description || "").replace(/"/g, '""')}"`;
        const dateStr = t.date ? t.date.split("T")[0] : "";
        return `${dateStr},${desc},${t.type},${cat},${wall},${t.amount},${t.recurring ? "Yes" : "No"},${t.recurringInterval || ""}`;
      });

      const csv = [csvHeader, ...csvRows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `transactions_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      notifications.show({
        title: "Exported",
        message: `${rows.length} transaction(s) exported to CSV`,
        color: "teal",
      });
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to export transactions",
        color: "red",
      });
    }
  };

  const renderTransactionForm = (mode: "add" | "edit") => {
    const onSubmit = mode === "add" ? handleAdd : handleEdit;
    return (
      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack gap="md">
          <Select
            label="Transaction Type"
            required
            data={[
              { value: "INCOME", label: "Income" },
              { value: "EXPENSE", label: "Expense" },
            ]}
            value={transactionType}
            onChange={(value) =>
              setTransactionType(value as "INCOME" | "EXPENSE")
            }
          />

          <TextInput
            label="Description"
            placeholder="Enter description"
            required
            {...form.getInputProps("description")}
          />

          <NumberInput
            label="Amount"
            placeholder="0.00"
            required
            prefix=""
            decimalScale={2}
            min={0.01}
            {...form.getInputProps("amount")}
          />

          <Select
            label="Wallet"
            placeholder="Select wallet"
            required
            data={wallets.map((w) => ({ value: w.id, label: w.name }))}
            {...form.getInputProps("walletId")}
          />

          <Select
            label="Category"
            placeholder="Select category"
            data={filteredCategories.map((c) => ({
              value: c.id,
              label: c.name,
            }))}
            {...form.getInputProps("categoryId")}
            clearable
          />

          <TextInput
            label="Date"
            type="date"
            required
            {...form.getInputProps("date")}
          />

          <Switch
            label="Recurring transaction"
            checked={isRecurring}
            onChange={(event) => setIsRecurring(event.currentTarget.checked)}
          />

          {isRecurring && (
            <Select
              label="Recurring Interval"
              placeholder="Select interval"
              required
              data={RECURRING_INTERVALS}
              value={recurringInterval}
              onChange={setRecurringInterval}
            />
          )}

          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={mode === "add" ? closeAdd : closeEdit}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              color={transactionType === "INCOME" ? "teal" : "red"}
              loading={submitting}
            >
              {mode === "add" ? "Add Transaction" : "Save Changes"}
            </Button>
          </Group>
        </Stack>
      </form>
    );
  };

  const skeletonRows = Array.from({ length: 8 }).map((_, i) => (
    <Table.Tr key={`skeleton-${i}`}>
      <Table.Td>
        <Skeleton height={16} width="80%" />
      </Table.Td>
      <Table.Td>
        <Skeleton height={16} width={60} />
      </Table.Td>
      <Table.Td>
        <Skeleton height={16} width={90} />
      </Table.Td>
      <Table.Td>
        <Skeleton height={16} width={80} />
      </Table.Td>
      <Table.Td>
        <Skeleton height={16} width={80} />
      </Table.Td>
      <Table.Td>
        <Skeleton height={16} width={70} />
      </Table.Td>
      <Table.Td>
        <Skeleton height={16} width={60} />
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <>
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={2}>All Transactions</Title>
          <Group>
            <Button
              variant="light"
              leftSection={<IconDownload size={16} />}
              onClick={handleExportCsv}
            >
              Export CSV
            </Button>
            <Button leftSection={<IconPlus size={16} />} onClick={openAdd}>
              Add Transaction
            </Button>
          </Group>
        </Group>

        <Paper withBorder p="md" radius="md">
          <Stack gap="sm">
            <TextInput
              placeholder="Search by description..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
            />

            <Group grow>
              <Select
                label="Type"
                placeholder="All types"
                clearable
                data={[
                  { value: "INCOME", label: "Income" },
                  { value: "EXPENSE", label: "Expense" },
                ]}
                value={filterType}
                onChange={setFilterType}
              />

              <Select
                label="Category"
                placeholder="All categories"
                clearable
                data={categories.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
                value={filterCategoryId}
                onChange={setFilterCategoryId}
              />

              <Select
                label="Wallet"
                placeholder="All wallets"
                clearable
                data={wallets.map((w) => ({
                  value: w.id,
                  label: w.name,
                }))}
                value={filterWalletId}
                onChange={setFilterWalletId}
              />

              <DatePickerInput
                label="Start date"
                placeholder="From"
                clearable
                value={startDate}
                onChange={(value) =>
                  setStartDate(value ? new Date(value) : null)
                }
              />

              <DatePickerInput
                label="End date"
                placeholder="To"
                clearable
                value={endDate}
                onChange={(value) => setEndDate(value ? new Date(value) : null)}
              />
            </Group>
          </Stack>
        </Paper>
        <Paper withBorder radius="md" p="0" style={{ overflow: "hidden" }}>
          <Table.ScrollContainer minWidth={500}>
            <Table striped highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Description</Table.Th>
                  {/* Hide Type on mobile as color already indicates it */}
                  <Table.Th visibleFrom="xs">Type</Table.Th>
                  <Table.Th>Amount</Table.Th>
                  <Table.Th visibleFrom="sm">Category</Table.Th>
                  <Table.Th visibleFrom="md">Wallet</Table.Th>
                  <Table.Th>Date</Table.Th>
                  <Table.Th ta="right">Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {loading ? (
                  skeletonRows
                ) : transactions.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={7}>
                      <Text ta="center" c="dimmed" py="xl">
                        No transactions found
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  transactions.map((tx) => (
                    <Table.Tr
                      key={tx.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => handleOpenEdit(tx)}
                    >
                      <Table.Td>
                        <Box>
                          <Text
                            size="sm"
                            fw={500}
                            truncate="end"
                            style={{ maxWidth: 150 }}
                          >
                            {tx.description}
                          </Text>
                          {tx.recurring && (
                            <Badge size="xs" variant="light" color="violet">
                              {tx.recurringInterval || "recurring"}
                            </Badge>
                          )}
                        </Box>
                      </Table.Td>

                      <Table.Td visibleFrom="xs">
                        <Badge
                          variant="light"
                          color={tx.type === "INCOME" ? "teal" : "red"}
                          size="sm"
                        >
                          {tx.type}
                        </Badge>
                      </Table.Td>

                      <Table.Td>
                        <Text
                          fw={700}
                          size="sm"
                          c={tx.type === "INCOME" ? "teal" : "red"}
                        >
                          {tx.type === "INCOME" ? "+" : "-"}
                          {"\u20B1"}
                          {tx.amount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </Text>
                      </Table.Td>

                      <Table.Td visibleFrom="sm">
                        <Text size="xs" c="dimmed">
                          {tx.category}
                        </Text>
                      </Table.Td>

                      <Table.Td visibleFrom="md">
                        <Text size="xs">{tx.wallet?.name || "-"}</Text>
                      </Table.Td>

                      <Table.Td>
                        <Text size="xs" style={{ whiteSpace: "nowrap" }}>
                          {new Date(tx.date).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </Text>
                      </Table.Td>

                      <Table.Td onClick={(e) => e.stopPropagation()}>
                        <Group gap={4} justify="flex-end" wrap="nowrap">
                          <ActionIcon
                            variant="subtle"
                            color="blue"
                            onClick={() => handleOpenEdit(tx)}
                            size="sm"
                          >
                            <IconEdit size={16} />
                          </ActionIcon>

                          <ActionIcon
                            variant="subtle"
                            color="red"
                            size="sm"
                            onClick={() => {
                              setDeletingId(tx.id);
                              openDelete();
                            }}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Paper>

        {!loading && totalPages > 1 && (
          <Group justify="center">
            <Pagination total={totalPages} value={page} onChange={setPage} />
            <Text size="sm" c="dimmed">
              {total} transaction{total !== 1 ? "s" : ""} total
            </Text>
          </Group>
        )}
      </Stack>

      <Modal
        opened={addOpened}
        onClose={() => {
          closeAdd();
          form.reset();
          setIsRecurring(false);
          setRecurringInterval(null);
        }}
        title="Add Transaction"
        centered
      >
        {renderTransactionForm("add")}
      </Modal>

      <Modal
        opened={editOpened}
        onClose={() => {
          closeEdit();
          form.reset();
          setEditingTransaction(null);
          setIsRecurring(false);
          setRecurringInterval(null);
        }}
        title="Edit Transaction"
        centered
      >
        {renderTransactionForm("edit")}
      </Modal>

      <Modal
        opened={deleteOpened}
        onClose={() => {
          closeDelete();
          setDeletingId(null);
        }}
        title="Delete Transaction"
        centered
        size="sm"
      >
        <Stack gap="md">
          <Text>
            Are you sure you want to delete this transaction? This action cannot
            be undone.
          </Text>
          <Group justify="flex-end">
            <Button
              variant="subtle"
              onClick={() => {
                closeDelete();
                setDeletingId(null);
              }}
            >
              Cancel
            </Button>
            <Button color="red" loading={deleting} onClick={handleDelete}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
