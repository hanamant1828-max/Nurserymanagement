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
  const [search, setSearch] = useState("");

  const filteredVarietiesList = varieties?.filter(v => {
    const categoryName = categories?.find(c => c.id === v.categoryId)?.name || "";
    return v.name.toLowerCase().includes(search.toLowerCase()) || 
           categoryName.toLowerCase().includes(search.toLowerCase());
  }) || [];

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

  const getCategory = (id: number) => categories?.find(c => c.id === id);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Varieties ({filteredVarietiesList.length})</h1>
          <p className="text-muted-foreground">Manage specific plant varieties under categories.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Input 
            placeholder="Search varieties or categories..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64"
          />
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
                                <div className="flex items-center gap-2">
                                  {category.image && (
                                    <img 
                                      src={category.image} 
                                      alt={category.name} 
                                      className="w-6 h-6 rounded-full object-cover border"
                                    />
                                  )}
                                  {category.name}
                                </div>
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
            ) : filteredVarietiesList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Flower2 className="w-8 h-8 opacity-20" />
                    No varieties found.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredVarietiesList.map((variety) => {
                const category = getCategory(variety.categoryId);
                return (
                  <TableRow key={variety.id} className="group">
                    <TableCell className="text-muted-foreground font-medium">
                      <div className="flex items-center gap-3">
                        {category?.image && (
                          <img 
                            src={category.image} 
                            alt={category.name} 
                            className="w-10 h-10 rounded-full object-cover border"
                          />
                        )}
                        {category?.name || "Unknown"}
                      </div>
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
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile View */}
      <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
        {loadingVarieties ? (
          [1, 2, 3, 4].map(i => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />
          ))
        ) : filteredVarietiesList.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground col-span-full">No varieties found.</p>
        ) : (
          filteredVarietiesList.map((variety) => {
            const category = getCategory(variety.categoryId);
            return (
              <div key={variety.id} className="bg-card border rounded-xl overflow-hidden shadow-sm flex flex-col">
                <div className="aspect-video w-full bg-muted relative">
                  {category?.image ? (
                    <img 
                      src={category.image} 
                      alt={category.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Flower2 className="w-12 h-12 text-muted-foreground/20" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge variant={variety.active ? "default" : "secondary"} className="shadow-sm">
                      {variety.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-lg leading-tight">{variety.name}</h3>
                      <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 bg-muted rounded">#{variety.id}</span>
                    </div>
                    <p className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      {category?.name || "Unknown Category"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 h-9" onClick={() => handleEdit(variety)}>
                      <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1 h-9 text-destructive border-destructive/20 hover:bg-destructive/5">
                          <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="w-[90vw] max-w-sm rounded-xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Variety</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this variety?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                          <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(variety.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
