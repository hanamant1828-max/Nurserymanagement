import { useState } from "react";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/use-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit2, Layers, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { api } from "@shared/routes";
import { type Category } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const formSchema = api.categories.create.input;

export default function CategoriesPage() {
  const { data: categories, isLoading } = useCategories();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const filteredCategories = categories?.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", active: true, image: "" },
  });

  const { mutate: create, isPending: creating } = useCreateCategory();
  const { mutate: update, isPending: updating } = useUpdateCategory();
  const { mutate: deleteCategory } = useDeleteCategory();

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (editingId) {
      update({ id: editingId, ...data }, { onSuccess: () => { setOpen(false); resetForm(); } });
    } else {
      create(data, { onSuccess: () => { setOpen(false); resetForm(); } });
    }
  };

  const handleDelete = (id: number) => {
    deleteCategory(id, {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Category deleted successfully",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to delete category",
          variant: "destructive",
        });
      },
    });
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    form.reset({ 
      name: category.name, 
      active: category.active,
      image: category.image || "" 
    });
    setOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    form.reset({ name: "", active: true, image: "" });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue("image", reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-bold tracking-tight">Categories ({filteredCategories.length})</h1>
          <p className="text-muted-foreground text-sm">Manage crop categories for your nursery organization.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 sm:min-w-[300px]">
            <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-11 rounded-xl bg-muted/30 border-muted-foreground/10 focus-visible:ring-primary/20 transition-all"
            />
          </div>
          <Dialog open={open} onOpenChange={(val) => { setOpen(val); if(!val) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="lg" className="h-11 px-6 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95">
                <Plus className="w-5 h-5 mr-2" /> Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">{editingId ? "Edit Category" : "New Category"}</DialogTitle>
                <DialogDescription>
                  {editingId ? "Update the details for this plant category." : "Define a new category to group your nursery varieties."}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Category Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Vegetables, Fruit Plants" className="h-11 rounded-lg" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="image"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Visual Identity</FormLabel>
                        <FormControl>
                          <div className="space-y-4">
                            <div className="flex items-center gap-4">
                              <div className="relative flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden border-2 border-dashed border-muted-foreground/20 bg-muted/30 flex items-center justify-center group hover:border-primary/50 transition-colors">
                                {field.value ? (
                                  <img src={field.value} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                  <Plus className="w-6 h-6 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                                )}
                                <Input 
                                  type="file" 
                                  accept="image/*" 
                                  onChange={handleImageChange}
                                  className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                              </div>
                              <div className="flex-1 text-xs text-muted-foreground">
                                <p className="font-medium text-foreground mb-1">Upload Photo</p>
                                <p>Square images work best. Max size 2MB.</p>
                              </div>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-xl border bg-muted/20 p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-medium">Availability</FormLabel>
                          <p className="text-xs text-muted-foreground leading-none">
                            Enable to show in variety selection
                          </p>
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
                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="flex-1 h-11 rounded-xl">Cancel</Button>
                    <Button type="submit" className="flex-[2] h-11 rounded-xl font-bold" disabled={creating || updating}>
                      {editingId ? "Update Category" : "Save Category"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block">
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[80px] py-4 pl-6 font-bold text-xs uppercase tracking-wider">ID</TableHead>
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider">Category</TableHead>
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider">Status</TableHead>
                <TableHead className="py-4 pr-6 text-right font-bold text-xs uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [1, 2, 3].map(i => (
                  <TableRow key={i}>
                    <TableCell className="pl-6"><div className="h-4 w-8 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 bg-muted animate-pulse rounded-xl" />
                        <div className="h-5 w-40 bg-muted animate-pulse rounded" />
                      </div>
                    </TableCell>
                    <TableCell><div className="h-6 w-16 bg-muted animate-pulse rounded-full" /></TableCell>
                    <TableCell className="pr-6"><div className="h-9 w-9 ml-auto bg-muted animate-pulse rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : filteredCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <Layers className="w-12 h-12 opacity-10" />
                      <p className="text-sm font-medium">No categories matching your search</p>
                      <Button variant="ghost" onClick={() => setSearch("")} className="text-primary h-auto p-0">Clear filters</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCategories.map((category) => (
                  <TableRow key={category.id} className="group hover:bg-muted/10 transition-colors">
                    <TableCell className="pl-6 py-4 font-mono text-sm text-muted-foreground">#{category.id}</TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl overflow-hidden border bg-muted flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                          {category.image ? (
                            <img src={category.image} alt={category.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                              <Layers className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                        <span className="font-bold text-lg tracking-tight">{category.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant={category.active ? "default" : "secondary"} className={`rounded-full px-3 py-0.5 font-medium ${category.active ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20" : ""}`}>
                        {category.active ? "Active" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 pr-6 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary" onClick={() => handleEdit(category)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-2xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-xl">Delete Category?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove <span className="font-bold text-foreground">"{category.name}"</span> and all associated varieties. This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2">
                              <AlertDialogCancel className="rounded-xl mt-0">Keep Category</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(category.id)} className="bg-destructive hover:bg-destructive/90 rounded-xl">
                                Yes, Delete
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
      </div>

      {/* Mobile/Tablet Card View */}
      <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          [1, 2, 3, 4].map(i => (
            <div key={i} className="h-44 bg-muted animate-pulse rounded-2xl border" />
          ))
        ) : filteredCategories.length === 0 ? (
          <div className="col-span-full py-20 text-center border-2 border-dashed rounded-2xl border-muted-foreground/10">
            <Layers className="w-16 h-16 mx-auto mb-4 opacity-5" />
            <p className="text-muted-foreground font-medium">No results found for your search</p>
          </div>
        ) : (
          filteredCategories.map((category) => (
            <div key={category.id} className="group relative bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-primary/20 transition-all flex flex-col sm:flex-row">
              <div className="sm:w-32 aspect-[4/3] sm:aspect-square bg-muted relative overflow-hidden flex-shrink-0">
                {category.image ? (
                  <img src={category.image} alt={category.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                    <Layers className="w-10 h-10 text-muted-foreground/20" />
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <span className="text-[10px] font-mono font-bold bg-black/50 backdrop-blur-md text-white px-1.5 py-0.5 rounded shadow-sm">#{category.id}</span>
                </div>
              </div>
              
              <div className="p-4 flex-1 flex flex-col justify-between min-w-0">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <h3 className="font-bold text-lg leading-tight truncate pr-2">{category.name}</h3>
                  <Badge variant={category.active ? "default" : "secondary"} className={`rounded-full text-[10px] uppercase tracking-wider h-5 flex-shrink-0 ${category.active ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : ""}`}>
                    {category.active ? "Active" : "Off"}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2 mt-auto">
                  <Button variant="outline" size="sm" className="flex-1 h-10 rounded-xl bg-muted/20 border-transparent hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-none" onClick={() => handleEdit(category)}>
                    <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-10 w-10 min-w-10 rounded-xl bg-destructive/5 border-transparent text-destructive hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all shadow-none">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="w-[90vw] max-w-[340px] rounded-2xl p-6">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-lg">Delete this category?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm">
                          This will permanently remove the category and all linked plant data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex flex-col gap-2 mt-4 sm:flex-row">
                        <AlertDialogCancel className="rounded-xl w-full sm:w-auto order-2 sm:order-1">Keep it</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(category.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl w-full sm:w-auto order-1 sm:order-2">
                          Delete Now
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
