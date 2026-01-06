import { useState } from "react";
import { useVarieties, useCreateVariety, useUpdateVariety, useDeleteVariety } from "@/hooks/use-varieties";
import { useCategories } from "@/hooks/use-categories";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit2, Flower2, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { api } from "@shared/routes";
import { type Variety } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// Extend schema for form usage (categoryId needs to be string for Select)
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  categoryId: z.string().min(1, "Category is required"),
  active: z.boolean().default(true),
});

export default function VarietiesPage() {
  const { data: varieties, isLoading: loadingVarieties } = useVarieties();
  const { data: categories } = useCategories();
  
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", categoryId: "", active: true },
  });

  const { mutate: create, isPending: creating } = useCreateVariety();
  const { mutate: update, isPending: updating } = useUpdateVariety();
  const { mutate: deleteVariety } = useDeleteVariety();
  const { toast } = useToast();

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    // API expects number for categoryId
    const payload = { ...data, categoryId: parseInt(data.categoryId) };
    
    if (editingId) {
      update({ id: editingId, ...payload }, { onSuccess: () => { setOpen(false); resetForm(); } });
    } else {
      create(payload, { onSuccess: () => { setOpen(false); resetForm(); } });
    }
  };

  const handleDelete = (id: number) => {
    deleteVariety(id, {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Variety deleted successfully",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to delete variety",
          variant: "destructive",
        });
      },
    });
  };

  const handleEdit = (variety: Variety) => {
    setEditingId(variety.id);
    form.reset({ 
      name: variety.name, 
      categoryId: variety.categoryId.toString(), 
      active: variety.active 
    });
    setOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    form.reset({ name: "", categoryId: "", active: true });
  };

  const getCategoryName = (id: number) => categories?.find(c => c.id === id)?.name || "Unknown";

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Varieties</h1>
          <p className="text-muted-foreground">Manage specific plant varieties under categories.</p>
        </div>
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if(!val) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="lg" className="shadow-lg shadow-primary/20">
              <Plus className="w-5 h-5 mr-2" /> Add Variety
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Variety" : "New Variety"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.filter(c => c.active).map(category => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Variety Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Cherry Tomato, Hybrid Rose" {...field} />
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
                  {editingId ? "Save Changes" : "Create Variety"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="hidden md:block rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Variety Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingVarieties ? (
              [1, 2, 3].map(i => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-8 w-8 ml-auto bg-muted animate-pulse rounded" /></TableCell>
                </TableRow>
              ))
            ) : varieties?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Flower2 className="w-8 h-8 opacity-20" />
                    No varieties found.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              varieties?.map((variety) => (
                <TableRow key={variety.id} className="group">
                  <TableCell className="text-muted-foreground font-medium">
                    {getCategoryName(variety.categoryId)}
                  </TableCell>
                  <TableCell className="font-semibold text-lg">{variety.name}</TableCell>
                  <TableCell>
                    <Badge variant={variety.active ? "default" : "secondary"}>
                      {variety.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(variety)}>
                        <Edit2 className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive transition-colors" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Variety</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this variety? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(variety.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-4">
        {loadingVarieties ? (
          <p className="text-center py-4">Loading varieties...</p>
        ) : varieties?.length === 0 ? (
          <p className="text-center py-4 text-muted-foreground">No varieties found.</p>
        ) : (
          varieties?.map((variety) => (
            <div key={variety.id} className="bg-card border rounded-lg p-4 space-y-3 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg">{variety.name}</h3>
                  <p className="text-sm text-muted-foreground font-medium">
                    {getCategoryName(variety.categoryId)}
                  </p>
                </div>
                <Badge variant={variety.active ? "default" : "secondary"}>
                  {variety.active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => handleEdit(variety)}>
                  <Edit2 className="w-4 h-4 mr-1" /> Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive border-destructive/20">
                      <Trash2 className="w-4 h-4 mr-1" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Variety</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this variety?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(variety.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
