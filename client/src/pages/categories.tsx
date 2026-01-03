import { useState } from "react";
import { useCategories, useCreateCategory, useUpdateCategory } from "@/hooks/use-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit2, Layers } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { api, type Category } from "@shared/routes";

const formSchema = api.categories.create.input;

export default function CategoriesPage() {
  const { data: categories, isLoading } = useCategories();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", active: true },
  });

  const { mutate: create, isPending: creating } = useCreateCategory();
  const { mutate: update, isPending: updating } = useUpdateCategory();

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (editingId) {
      update({ id: editingId, ...data }, { onSuccess: () => { setOpen(false); resetForm(); } });
    } else {
      create(data, { onSuccess: () => { setOpen(false); resetForm(); } });
    }
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    form.reset({ name: category.name, active: category.active });
    setOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    form.reset({ name: "", active: true });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Categories</h1>
          <p className="text-muted-foreground">Manage crop categories for your nursery.</p>
        </div>
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if(!val) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="lg" className="shadow-lg shadow-primary/20">
              <Plus className="w-5 h-5 mr-2" /> Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Category" : "New Category"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Vegetables, Flowers" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Status</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Visible in selection menus
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={creating || updating}>
                  {editingId ? "Save Changes" : "Create Category"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Category Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [1, 2, 3].map(i => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 w-8 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-8 w-8 ml-auto bg-muted animate-pulse rounded" /></TableCell>
                </TableRow>
              ))
            ) : categories?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Layers className="w-8 h-8 opacity-20" />
                    No categories found. Create one to get started.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              categories?.map((category) => (
                <TableRow key={category.id} className="group">
                  <TableCell className="font-mono text-muted-foreground">#{category.id}</TableCell>
                  <TableCell className="font-medium text-lg">{category.name}</TableCell>
                  <TableCell>
                    <Badge variant={category.active ? "default" : "secondary"}>
                      {category.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>
                      <Edit2 className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
