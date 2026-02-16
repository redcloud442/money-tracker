"use client";

import { useSession } from "@/lib/better-auth/auth-client";
import {
  ActionIcon,
  Badge,
  Button,
  ColorInput,
  Grid,
  Group,
  Modal,
  Paper,
  Select,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";

interface Category {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  color: string | null;
  _count?: {
    transactions: number;
  };
}

export default function CategoriesPage() {
  const [addOpened, { open: openAdd, close: closeAdd }] = useDisclosure(false);
  const [editOpened, { open: openEdit, close: closeEdit }] =
    useDisclosure(false);
  const [deleteOpened, { open: openDelete, close: closeDelete }] =
    useDisclosure(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );

  const { data: session } = useSession();

  const addForm = useForm({
    initialValues: {
      name: "",
      type: "EXPENSE",
      color: "#3b82f6",
    },
  });

  const editForm = useForm({
    initialValues: {
      name: "",
      color: "#3b82f6",
    },
  });

  const fetchCategories = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        setCategories(await res.json());
      }
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to fetch categories",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      fetchCategories();
    }
  }, [session, fetchCategories]);

  const handleAdd = async (values: typeof addForm.values) => {
    if (!session) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (res.ok) {
        notifications.show({
          title: "Success",
          message: "Category added successfully",
          color: "teal",
        });
        addForm.reset();
        closeAdd();
        fetchCategories();
      } else {
        const error = await res.json();
        notifications.show({
          title: "Error",
          message: error.error || "Failed to add category",
          color: "red",
        });
      }
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to add category",
        color: "red",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (values: typeof editForm.values) => {
    if (!selectedCategory) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedCategory.id,
          name: values.name,
          color: values.color,
        }),
      });

      if (res.ok) {
        notifications.show({
          title: "Success",
          message: "Category updated successfully",
          color: "teal",
        });
        closeEdit();
        setSelectedCategory(null);
        fetchCategories();
      } else {
        const error = await res.json();
        notifications.show({
          title: "Error",
          message: error.error || "Failed to update category",
          color: "red",
        });
      }
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to update category",
        color: "red",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/categories?id=${selectedCategory.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        notifications.show({
          title: "Success",
          message: "Category deleted successfully",
          color: "teal",
        });
        closeDelete();
        setSelectedCategory(null);
        fetchCategories();
      } else {
        const error = await res.json();
        notifications.show({
          title: "Error",
          message: error.error || "Failed to delete category",
          color: "red",
        });
      }
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to delete category",
        color: "red",
      });
    } finally {
      setDeleting(false);
    }
  };

  const openEditModal = (category: Category) => {
    setSelectedCategory(category);
    editForm.setValues({
      name: category.name,
      color: category.color || "#3b82f6",
    });
    openEdit();
  };

  const openDeleteModal = (category: Category) => {
    setSelectedCategory(category);
    openDelete();
  };

  const incomeCategories = categories.filter((c) => c.type === "INCOME");
  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");

  if (loading) {
    return (
      <Stack gap="lg">
        <Group justify="space-between">
          <Skeleton height={32} width={200} />
          <Skeleton height={36} width={140} />
        </Group>
        <Skeleton height={24} width={160} />
        <Grid>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid.Col key={i} span={{ base: 12, sm: 6, md: 4 }}>
              <Skeleton height={100} radius="md" />
            </Grid.Col>
          ))}
        </Grid>
        <Skeleton height={24} width={160} mt="md" />
        <Grid>
          {[1, 2, 3].map((i) => (
            <Grid.Col key={i} span={{ base: 12, sm: 6, md: 4 }}>
              <Skeleton height={100} radius="md" />
            </Grid.Col>
          ))}
        </Grid>
      </Stack>
    );
  }

  const renderCategoryGroup = (
    title: string,
    cats: Category[],
    badgeColor: string
  ) => (
    <>
      <Group gap="sm" mt="md">
        <Title order={4}>{title}</Title>
        <Badge color={badgeColor} variant="light" size="lg">
          {cats.length}
        </Badge>
      </Group>

      {cats.length === 0 ? (
        <Paper withBorder p="xl" radius="md" ta="center">
          <Text c="dimmed">No {title.toLowerCase()} categories yet.</Text>
        </Paper>
      ) : (
        <Grid>
          {cats.map((category) => (
            <Grid.Col key={category.id} span={{ base: 12, sm: 6, md: 4 }}>
              <Paper
                withBorder
                p="lg"
                radius="md"
                style={{ cursor: "pointer" }}
                onClick={() => openEditModal(category)}
              >
                <Group justify="space-between" mb="sm">
                  <Group gap="sm">
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        backgroundColor: category.color || "#6b7280",
                        flexShrink: 0,
                      }}
                    />
                    <Text fw={600} size="md">
                      {category.name}
                    </Text>
                  </Group>
                  <Group gap={4}>
                    <ActionIcon
                      variant="subtle"
                      color="blue"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(category);
                      }}
                    >
                      <IconEdit size={14} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteModal(category);
                      }}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                </Group>
                <Text size="sm" c="dimmed">
                  {category._count?.transactions ?? 0} transaction
                  {(category._count?.transactions ?? 0) !== 1 ? "s" : ""}
                </Text>
              </Paper>
            </Grid.Col>
          ))}
        </Grid>
      )}
    </>
  );

  return (
    <>
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={2}>Categories</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={openAdd}>
            Add Category
          </Button>
        </Group>

        {renderCategoryGroup("Expense Categories", expenseCategories, "red")}
        {renderCategoryGroup("Income Categories", incomeCategories, "teal")}
      </Stack>

      {/* Add Category Modal */}
      <Modal
        opened={addOpened}
        onClose={closeAdd}
        title="Add Category"
        centered
      >
        <form onSubmit={addForm.onSubmit(handleAdd)}>
          <Stack gap="md">
            <TextInput
              label="Category Name"
              placeholder="e.g., Food & Dining"
              required
              {...addForm.getInputProps("name")}
            />

            <Select
              label="Type"
              placeholder="Select type"
              required
              data={[
                { value: "EXPENSE", label: "Expense" },
                { value: "INCOME", label: "Income" },
              ]}
              {...addForm.getInputProps("type")}
            />

            <ColorInput
              label="Color"
              placeholder="Pick color"
              {...addForm.getInputProps("color")}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={closeAdd}>
                Cancel
              </Button>
              <Button type="submit" color="blue" loading={submitting}>
                Add Category
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Edit Category Modal */}
      <Modal
        opened={editOpened}
        onClose={() => {
          closeEdit();
          setSelectedCategory(null);
        }}
        title="Edit Category"
        centered
      >
        <form onSubmit={editForm.onSubmit(handleEdit)}>
          <Stack gap="md">
            {selectedCategory && (
              <Badge
                color={selectedCategory.type === "INCOME" ? "teal" : "red"}
                variant="light"
                size="lg"
              >
                {selectedCategory.type}
              </Badge>
            )}

            <TextInput
              label="Category Name"
              placeholder="e.g., Food & Dining"
              required
              {...editForm.getInputProps("name")}
            />

            <ColorInput
              label="Color"
              placeholder="Pick color"
              {...editForm.getInputProps("color")}
            />

            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => {
                  closeEdit();
                  setSelectedCategory(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" color="blue" loading={submitting}>
                Save Changes
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteOpened}
        onClose={() => {
          closeDelete();
          setSelectedCategory(null);
        }}
        title="Delete Category"
        centered
        size="sm"
      >
        <Stack gap="md">
          <Text>
            Are you sure you want to delete{" "}
            <Text span fw={700}>
              {selectedCategory?.name}
            </Text>
            ?
          </Text>
          {selectedCategory &&
            (selectedCategory._count?.transactions ?? 0) > 0 && (
              <Text size="sm" c="red">
                This category has {selectedCategory._count?.transactions}{" "}
                transaction(s) linked to it. You must reassign or remove those
                transactions before deleting.
              </Text>
            )}
          <Group justify="flex-end">
            <Button
              variant="subtle"
              onClick={() => {
                closeDelete();
                setSelectedCategory(null);
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
