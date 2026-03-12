import { useQuery, useMutation } from "@tanstack/react-query";
import { SeedInward, Category, Variety, insertSeedInwardSchema } from "@shared/schema";
import { api, buildUrl } from "@shared/routes";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Edit2, Calendar, Package, Search } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";

export default function SeedInwardPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<(SeedInward & { category: Category; variety: Variety }) | null>(null);
  const [search, setSearch] = useState("");

  const { data: seedInwards, isLoading } = useQuery<(SeedInward & { category: Category; variety: Variety })[]>({
    queryKey: [api.seedInward.list.path],
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: [api.categories.list.path],
  });

  const { data: varieties } = useQuery<Variety[]>({
    queryKey: [api.varieties.list.path],
  });

  const form = useForm({
    resolver: zodResolver(insertSeedInwardSchema),
    defaultValues: {
      categoryId: 0,
      varietyId: 0,
      lotNo: "",
      expiryDate: "",
      numberOfPackets: 0,
      totalQuantity: 0,
      availableQuantity: 0,
      typeOfPackage: "",
      receivedFrom: "",
    },
  });

  const selectedCategoryId = form.watch("categoryId");

  const filteredVarieties = useMemo(() => {
    return varieties?.filter((v) => v.categoryId === Number(selectedCategoryId)) || [];
  }, [varieties, selectedCategoryId]);

  const numberOfPackets = form.watch("numberOfPackets");
  useEffect(() => {
    form.setValue("totalQuantity", numberOfPackets);
    if (!editingItem) {
      form.setValue("availableQuantity", numberOfPackets);
    }
  }, [numberOfPackets, editingItem, form]);

  useEffect(() => {
    const currentVarietyId = form.getValues("varietyId");
    if (!editingItem && selectedCategoryId !== 0 && currentVarietyId !== 0 && filteredVarieties.length > 0) {
      const isVarietyValid = filteredVarieties.some((v) => v.id === currentVarietyId);
      if (!isVarietyValid) {
        form.setValue("varietyId", 0);
      }
    }
  }, [selectedCategoryId, filteredVarieties, form, editingItem]);

  const createMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await apiRequest(api.seedInward.create.method, api.seedInward.create.path, values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.seedInward.list.path] });
      toast({ title: "Success", description: "Seed inward entry created successfully" });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: any }) => {
      const { id: _, category, variety, timestamp, ...updateValues } = values;
      const res = await apiRequest("PUT", `/api/seed-inward/${id}`, updateValues);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update entry");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.seedInward.list.path] });
      toast({ title: "Success", description: "Seed inward entry updated successfully" });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(api.seedInward.delete.method, buildUrl(api.seedInward.delete.path, { id }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.seedInward.list.path] });
      toast({ title: "Success", description: "Entry deleted successfully" });
    },
  });

  useEffect(() => {
    if (editingItem) {
      form.setValue("categoryId", editingItem.categoryId);
      form.setValue("lotNo", editingItem.lotNo);
      form.setValue("expiryDate", editingItem.expiryDate);
      form.setValue("numberOfPackets", editingItem.numberOfPackets);
      form.setValue("totalQuantity", editingItem.totalQuantity);
      form.setValue("availableQuantity", editingItem.availableQuantity);
      form.setValue("typeOfPackage", editingItem.typeOfPackage);
      form.setValue("receivedFrom", editingItem.receivedFrom);
      const timer = setTimeout(() => {
        form.setValue("varietyId", editingItem.varietyId);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [editingItem, form]);

  const resetForm = () => {
    setEditingItem(null);
    setOpen(false);
    form.reset({
      categoryId: 0,
      varietyId: 0,
      lotNo: "",
      expiryDate: "",
      numberOfPackets: 0,
      totalQuantity: 0,
      availableQuantity: 0,
      typeOfPackage: "",
      receivedFrom: "",
    });
  };

  const handleEdit = (item: SeedInward & { category: Category; variety: Variety }) => {
    setEditingItem(item);
    setOpen(true);
  };

  const filteredInwards = useMemo(() => {
    if (!seedInwards) return [];
    if (!search) return seedInwards;
    const lower = search.toLowerCase();
    return seedInwards.filter(
      (item) =>
        item.category?.name?.toLowerCase().includes(lower) ||
        item.variety?.name?.toLowerCase().includes(lower) ||
        item.lotNo?.toLowerCase().includes(lower) ||
        item.receivedFrom?.toLowerCase().includes(lower)
    );
  }, [seedInwards, search]);

  // Stat calculations
  const totalEntries = seedInwards?.length || 0;
  const totalQty = seedInwards?.reduce((s, i) => s + (Number(i.totalQuantity) || 0), 0) || 0;
  const usedQty = seedInwards?.reduce((s, i) => s + (Number(i.usedQuantity) || 0), 0) || 0;
  const availableQty = seedInwards?.reduce((s, i) => s + (Number(i.availableQuantity) || 0), 0) || 0;

  return (
    <div className="space-y-6 px-4 md:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Seed Inward</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage incoming seed stocks for your nursery.</p>
        </div>
        <Button
          className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
          onClick={() => { resetForm(); setOpen(true); }}
        >
          <Plus className="mr-2 h-4 w-4" /> Add New Entry
        </Button>
      </div>

      {/* Dialog Form */}
      <Dialog open={open} onOpenChange={(val) => { if (!val) resetForm(); else setOpen(true); }}>
        <DialogContent className="sm:max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {editingItem ? "Edit Entry" : "New Seed Inward Entry"}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? "Update the details for this seed inward entry." : "Enter the details of the incoming seed stock below."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => {
                if (editingItem) {
                  updateMutation.mutate({ id: editingItem.id, values: data });
                } else {
                  createMutation.mutate(data);
                }
              })}
              className="space-y-5 py-2"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Category</FormLabel>
                      <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value === 0 ? "" : field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-lg">
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map((c) => (
                            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="varietyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Variety</FormLabel>
                      <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value === 0 ? "" : field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-lg">
                            <SelectValue placeholder="Select Variety" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredVarieties.map((v) => (
                            <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lotNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Lot No.</FormLabel>
                      <FormControl>
                        <Input className="h-11 rounded-lg" placeholder="Enter lot number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Expiry Date</FormLabel>
                      <FormControl>
                        <Input className="h-11 rounded-lg" type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="numberOfPackets"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Number of Packets</FormLabel>
                      <FormControl>
                        <Input className="h-11 rounded-lg" type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="typeOfPackage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Type of Package</FormLabel>
                      <FormControl>
                        <Input className="h-11 rounded-lg" placeholder="e.g. Box, Bag, Pouch" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="receivedFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Received From</FormLabel>
                    <FormControl>
                      <Input className="h-11 rounded-lg" placeholder="Enter supplier name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={resetForm} className="flex-1 h-11 rounded-xl">Cancel</Button>
                <Button
                  type="submit"
                  data-testid="button-save-seed-inward"
                  className="flex-[2] h-11 rounded-xl font-bold"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingItem ? "Update Entry" : "Save Entry"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-blue-50/50 dark:from-blue-950/30 dark:to-blue-950/20 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">{totalEntries}</div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-semibold uppercase tracking-wider">Total Entries</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-green-50/50 dark:from-green-950/30 dark:to-green-950/20 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="text-3xl font-bold text-green-700 dark:text-green-300">{availableQty}</div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-semibold uppercase tracking-wider">Available Qty</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-amber-50/50 dark:from-amber-950/30 dark:to-amber-950/20 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="text-3xl font-bold text-amber-700 dark:text-amber-300">{usedQty}</div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-semibold uppercase tracking-wider">Used Qty</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-purple-50/50 dark:from-purple-950/30 dark:to-purple-950/20 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">{totalQty}</div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-2 font-semibold uppercase tracking-wider">Total Qty</p>
          </CardContent>
        </Card>
      </div>

      {/* Search Card */}
      <Card className="border shadow-sm">
        <CardContent className="p-5">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Search</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by category, variety, lot no. or supplier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Desktop Table */}
      <div className="hidden lg:block">
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="py-4 pl-6 font-bold text-xs uppercase tracking-wider">Date</TableHead>
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider">Item Details</TableHead>
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider">Lot Details</TableHead>
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider">Total Qty</TableHead>
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider">Used Qty</TableHead>
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider">Available Qty</TableHead>
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider">Source</TableHead>
                <TableHead className="py-4 pr-6 text-right font-bold text-xs uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [1, 2, 3].map((i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-6"><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell>
                      <div className="h-4 w-24 bg-muted animate-pulse rounded mb-1" />
                      <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                    </TableCell>
                    <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-10 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-10 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-10 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell className="pr-6"><div className="h-9 w-20 ml-auto bg-muted animate-pulse rounded-xl" /></TableCell>
                  </TableRow>
                ))
              ) : filteredInwards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <Package className="w-12 h-12 opacity-10" />
                      <p className="text-sm font-medium">No entries found</p>
                      {search && (
                        <Button variant="ghost" onClick={() => setSearch("")} className="text-primary h-auto p-0">
                          Clear search
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInwards.map((item) => (
                  <TableRow key={item.id} className="group hover:bg-muted/10 transition-colors">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(item.timestamp), "dd/MM/yyyy")}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="font-bold text-sm text-primary">{item.category?.name}</div>
                      <div className="text-xs text-muted-foreground">{item.variety?.name}</div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="outline" className="font-mono mb-1">{item.lotNo}</Badge>
                      <div className="text-xs text-muted-foreground">Exp: {item.expiryDate}</div>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="font-bold">{item.totalQuantity}</span>
                      <div className="text-xs text-muted-foreground capitalize">{item.typeOfPackage}</div>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="font-medium text-orange-600">{item.usedQuantity}</span>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="font-bold text-green-600">{item.availableQuantity}</span>
                    </TableCell>
                    <TableCell className="py-4 max-w-[150px] truncate" title={item.receivedFrom}>
                      <span className="text-sm">{item.receivedFrom}</span>
                    </TableCell>
                    <TableCell className="py-4 pr-6 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-2xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-xl">Delete Entry?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove this seed inward entry. This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2">
                              <AlertDialogCancel className="rounded-xl mt-0">Keep Entry</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(item.id)}
                                className="bg-destructive hover:bg-destructive/90 rounded-xl"
                              >
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

      {/* Mobile / Tablet Card View */}
      <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
        {isLoading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="h-52 bg-muted animate-pulse rounded-2xl border" />
          ))
        ) : filteredInwards.length === 0 ? (
          <div className="col-span-full py-20 text-center border-2 border-dashed rounded-2xl border-muted-foreground/10">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-5" />
            <p className="text-muted-foreground font-medium">No entries found</p>
          </div>
        ) : (
          filteredInwards.map((item) => (
            <div
              key={item.id}
              className="group relative bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-primary/20 transition-all"
            >
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <Badge variant="secondary" className="mb-1 text-[10px]">{item.category?.name}</Badge>
                    <h3 className="font-bold text-base leading-tight">{item.variety?.name}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(item.timestamp), "dd MMM yyyy")}
                    </p>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs bg-background shadow-sm flex-shrink-0">
                    {item.lotNo}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-muted/40 rounded-xl p-2.5 text-center">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Total</p>
                    <p className="font-bold text-sm">{item.totalQuantity}</p>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-950/20 rounded-xl p-2.5 text-center">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Used</p>
                    <p className="font-bold text-sm text-orange-600">{item.usedQuantity}</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-2.5 text-center">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Avail</p>
                    <p className="font-bold text-sm text-green-600">{item.availableQuantity}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate max-w-[60%]">{item.receivedFrom}</span>
                  <span className="text-muted-foreground">Exp: {item.expiryDate}</span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-10 rounded-xl bg-muted/20 border-transparent hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-none"
                    onClick={() => handleEdit(item)}
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 w-10 min-w-10 rounded-xl bg-destructive/5 border-transparent text-destructive hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all shadow-none"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="w-[90vw] max-w-[340px] rounded-2xl p-6">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-lg">Delete this entry?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm">
                          This will permanently remove this seed inward entry.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex flex-col gap-2 mt-4 sm:flex-row">
                        <AlertDialogCancel className="rounded-xl w-full sm:w-auto order-2 sm:order-1">Keep it</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(item.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl w-full sm:w-auto order-1 sm:order-2"
                        >
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
