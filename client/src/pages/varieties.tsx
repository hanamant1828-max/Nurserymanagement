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
import { Plus, Edit2, Flower2, Trash2, Layers } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { api } from "@shared/routes";
import { type Variety } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Pagination } from "@/components/pagination";

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
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;

  const filteredVarietiesList = varieties?.filter(v => {
    const categoryName = categories?.find(c => c.id === v.categoryId)?.name || "";
    const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase()) || 
                         categoryName.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "all" || v.categoryId.toString() === selectedCategory;
    return matchesSearch && matchesCategory;
  }) || [];

  const totalPages = Math.ceil(filteredVarietiesList.length / PAGE_SIZE);
  const paginatedVarieties = filteredVarietiesList.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-bold tracking-tight">Varieties ({filteredVarietiesList.length})</h1>
          <p className="text-muted-foreground text-sm">Manage plant varieties for your nursery categories.</p>
        </div>
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          <Select value={selectedCategory} onValueChange={(val) => {
            setSelectedCategory(val);
            setCurrentPage(1);
          }}>
            <SelectTrigger className="w-full lg:w-48 h-11 rounded-xl bg-muted/30 border-muted-foreground/10 focus:ring-primary/20">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="py-2.5">All Categories</SelectItem>
              {categories?.filter(c => c.active).map(c => (
                <SelectItem key={c.id} value={c.id.toString()} className="py-2.5">
                  <div className="flex items-center gap-3">
                    {c.image ? (
                      <img 
                        src={c.image} 
                        alt={c.name} 
                        className="w-6 h-6 rounded-md object-cover border shadow-sm"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center border shadow-sm">
                        <Layers className="w-3 h-3 text-muted-foreground/30" />
                      </div>
                    )}
                    <span className="font-medium">{c.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1 sm:min-w-[250px]">
            <Flower2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search varieties..." 
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 h-11 rounded-xl bg-muted/30 border-muted-foreground/10 focus-visible:ring-primary/20 transition-all"
            />
          </div>
          <Dialog open={open} onOpenChange={(val) => { setOpen(val); if(!val) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="lg" className="h-11 px-6 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95">
                <Plus className="w-5 h-5 mr-2" /> Add Variety
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">{editingId ? "Edit Variety" : "New Variety"}</DialogTitle>
                <DialogDescription>
                  {editingId ? "Update the details for this plant variety." : "Add a new plant variety to your nursery catalog."}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-4">
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-lg">
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl">
                            {categories?.filter(c => c.active).map(category => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                <div className="flex items-center gap-2 py-1">
                                  {category.image && (
                                    <img 
                                      src={category.image} 
                                      alt={category.name} 
                                      className="w-6 h-6 rounded-lg object-cover border"
                                    />
                                  )}
                                  <span className="font-medium">{category.name}</span>
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
                        <FormLabel className="font-semibold">Variety Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Hybrid Rose, Cherry Tomato" className="h-11 rounded-lg" {...field} />
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
                            Enable for new lot entries
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
                      {editingId ? "Update Variety" : "Save Variety"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block">
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="py-4 pl-6 font-bold text-xs uppercase tracking-wider">Category</TableHead>
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider">Variety Name</TableHead>
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider">Status</TableHead>
                <TableHead className="py-4 pr-6 text-right font-bold text-xs uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingVarieties ? (
                [1, 2, 3, 4, 5].map(i => (
                  <TableRow key={i}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-muted animate-pulse rounded-full" />
                        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                      </div>
                    </TableCell>
                    <TableCell><div className="h-5 w-48 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-6 w-16 bg-muted animate-pulse rounded-full" /></TableCell>
                    <TableCell className="pr-6"><div className="h-9 w-9 ml-auto bg-muted animate-pulse rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : filteredVarietiesList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <Flower2 className="w-12 h-12 opacity-10" />
                      <p className="text-sm font-medium">No varieties matching your search</p>
                      <Button variant="ghost" onClick={() => { setSearch(""); setSelectedCategory("all"); }} className="text-primary h-auto p-0">Clear filters</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedVarieties.map((variety) => {
                  const category = getCategory(variety.categoryId);
                  return (
                    <TableRow key={variety.id} className="group hover:bg-muted/10 transition-colors">
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden border bg-muted flex-shrink-0">
                            {category?.image ? (
                              <img src={category.image} alt={category.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                                <Layers className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <span className="font-medium text-muted-foreground">{category?.name || "Unknown"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="font-bold text-lg tracking-tight">{variety.name}</span>
                        <span className="ml-2 text-[10px] font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">#{variety.id}</span>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant={variety.active ? "default" : "secondary"} className={`rounded-full px-3 py-0.5 font-medium ${variety.active ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20" : ""}`}>
                          {variety.active ? "Active" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 pr-6 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary" onClick={() => handleEdit(variety)}>
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
                                <AlertDialogTitle className="text-xl">Delete Variety?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will remove <span className="font-bold text-foreground">"{variety.name}"</span> from the catalog. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="gap-2">
                                <AlertDialogCancel className="rounded-xl mt-0">Keep it</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(variety.id)} className="bg-destructive hover:bg-destructive/90 rounded-xl">
                                  Delete Variety
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
        
        <div className="mt-6 flex justify-between items-center bg-card border rounded-2xl px-6 py-4 shadow-sm">
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalRecords={filteredVarietiesList.length}
            pageSize={PAGE_SIZE}
          />
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden flex flex-col gap-4">
        {loadingVarieties ? (
          [1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-2xl border" />
          ))
        ) : filteredVarietiesList.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed rounded-2xl border-muted-foreground/10 bg-muted/5">
            <Flower2 className="w-16 h-16 mx-auto mb-4 opacity-5" />
            <p className="text-muted-foreground font-medium">No varieties found</p>
          </div>
        ) : (
          paginatedVarieties.map((variety) => {
            const category = getCategory(variety.categoryId);
            return (
              <div key={variety.id} className="bg-card border rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition-all">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border bg-muted flex-shrink-0 shadow-sm">
                      {category?.image ? (
                        <img src={category.image} alt={category.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
                          <Layers className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-lg leading-tight truncate">{variety.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 bg-muted rounded">#{variety.id}</span>
                        <span className="text-xs text-muted-foreground truncate">{category?.name}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={variety.active ? "default" : "secondary"} className={`rounded-full text-[10px] uppercase h-5 px-2 flex-shrink-0 ${variety.active ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : ""}`}>
                    {variety.active ? "Active" : "Off"}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2 border-t pt-4">
                  <Button variant="outline" size="sm" className="flex-1 h-10 rounded-xl bg-muted/20 border-transparent hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-none font-semibold" onClick={() => handleEdit(variety)}>
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
                        <AlertDialogTitle className="text-lg font-bold">Delete this variety?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm">
                          This will permanently remove the variety from your nursery records.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex flex-col gap-2 mt-4 sm:flex-row">
                        <AlertDialogCancel className="rounded-xl w-full sm:w-auto order-2 sm:order-1">Keep Variety</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(variety.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl w-full sm:w-auto order-1 sm:order-2 font-bold">
                          Yes, Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })
        )}
        
        {filteredVarietiesList.length > PAGE_SIZE && (
          <div className="mt-4 flex justify-center bg-card border rounded-2xl p-4 shadow-sm">
            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalRecords={filteredVarietiesList.length}
              pageSize={PAGE_SIZE}
            />
          </div>
        )}
      </div>
    </div>
  );
}
