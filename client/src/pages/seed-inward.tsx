import { useQuery, useMutation } from "@tanstack/react-query";
import { SeedInward, Category, Variety, insertSeedInwardSchema } from "@shared/schema";
import { api, buildUrl } from "@shared/routes";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Loader2, Plus, Trash2, Edit2, Calendar, Package, ArrowLeft, History } from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function SeedInwardPage() {
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<(SeedInward & { category: Category; variety: Variety }) | null>(null);

  const { data: seedInwards, isLoading: isLoadingInwards } = useQuery<(SeedInward & { category: Category; variety: Variety })[]>({
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
      typeOfPackage: "",
      receivedFrom: "",
    },
  });

  const selectedCategoryId = form.watch("categoryId");
  const filteredVarieties = varieties?.filter(v => v.categoryId === Number(selectedCategoryId)) || [];

  useEffect(() => {
    const currentVarietyId = form.getValues("varietyId");
    if (currentVarietyId !== 0 && !filteredVarieties.some(v => v.id === currentVarietyId)) {
      form.setValue("varietyId", 0);
    }
  }, [selectedCategoryId, filteredVarieties, form]);

  const createMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await apiRequest(api.seedInward.create.method, api.seedInward.create.path, values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.seedInward.list.path] });
      toast({ title: "Success", description: "Seed inward entry created successfully" });
      form.reset();
      setIsAdding(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: any }) => {
      const res = await apiRequest(api.seedInward.update.method, buildUrl(api.seedInward.update.path, { id }), values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.seedInward.list.path] });
      toast({ title: "Success", description: "Seed inward entry updated successfully" });
      form.reset();
      setEditingItem(null);
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
      form.reset({
        categoryId: editingItem.categoryId,
        varietyId: editingItem.varietyId,
        lotNo: editingItem.lotNo,
        expiryDate: editingItem.expiryDate,
        numberOfPackets: editingItem.numberOfPackets,
        typeOfPackage: editingItem.typeOfPackage,
        receivedFrom: editingItem.receivedFrom,
      });
    }
  }, [editingItem, form]);

  if (isLoadingInwards) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const showForm = isAdding || editingItem;

  return (
    <div className="flex flex-col min-h-full">
      {/* Header Section */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b p-4 md:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              {showForm && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    setIsAdding(false);
                    setEditingItem(null);
                  }}
                  className="md:hidden -ml-2"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Seed Inward</h1>
            </div>
            <p className="text-muted-foreground text-sm md:text-base">Manage incoming seed stocks</p>
          </div>
          {!showForm && (
            <Button 
              onClick={() => setIsAdding(true)}
              className="w-full sm:w-auto shadow-sm"
              size="lg"
            >
              <Plus className="mr-2 h-5 w-5" />
              Add New Entry
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
        {showForm ? (
          <Card className="max-w-4xl mx-auto border-primary/10 shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl md:text-2xl">
                {editingItem ? "Edit Entry" : "New Entry"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Enter the details of the incoming seed stock below.
              </p>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form 
                  onSubmit={form.handleSubmit((data) => {
                    if (editingItem) {
                      updateMutation.mutate({ id: editingItem.id, values: data });
                    } else {
                      createMutation.mutate(data);
                    }
                  })} 
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger className="h-11">
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
                          <FormLabel>Variety</FormLabel>
                          <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger className="h-11">
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
                          <FormLabel>Lot No.</FormLabel>
                          <FormControl>
                            <Input className="h-11" placeholder="Enter lot number" {...field} />
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
                          <FormLabel>Expiry Date</FormLabel>
                          <FormControl>
                            <Input className="h-11" type="date" {...field} />
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
                          <FormLabel>Number of Packets</FormLabel>
                          <FormControl>
                            <Input className="h-11" type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
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
                          <FormLabel>Type of Package</FormLabel>
                          <FormControl>
                            <Input className="h-11" {...field} placeholder="e.g. Box, Bag, Pouch" />
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
                        <FormLabel>Received From</FormLabel>
                        <FormControl>
                          <Input className="h-11" placeholder="Enter supplier name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="h-11 sm:w-32"
                      onClick={() => {
                        setIsAdding(false);
                        setEditingItem(null);
                        form.reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="h-11 sm:w-32 shadow-sm"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editingItem ? "Update" : "Save"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Desktop Table View */}
            <div className="hidden lg:block">
              <Card className="border-primary/5 shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/30 border-b py-4">
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Inward History</CardTitle>
                  </div>
                </CardHeader>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/10">
                      <TableHead className="w-[120px]">Date</TableHead>
                      <TableHead>Item Details</TableHead>
                      <TableHead>Lot Details</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {seedInwards?.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/5">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(item.timestamp), "dd/MM/yyyy")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-semibold text-primary">{item.category?.name}</div>
                            <div className="text-sm text-muted-foreground">{item.variety?.name}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant="outline" className="font-mono">{item.lotNo}</Badge>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              Exp: {item.expiryDate}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold">{item.numberOfPackets} Packets</span>
                            <span className="text-xs text-muted-foreground capitalize">{item.typeOfPackage}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate" title={item.receivedFrom}>
                          {item.receivedFrom}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingItem(item)}
                              className="h-9 w-9 text-primary hover:text-primary hover:bg-primary/10"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this entry?")) {
                                  deleteMutation.mutate(item.id);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                              className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {seedInwards?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <Package className="h-10 w-10 opacity-20" />
                            <p>No inward entries found.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>

            {/* Mobile & Tablet Grid View */}
            <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
              {seedInwards?.map((item) => (
                <Card key={item.id} className="border-primary/5 shadow-sm overflow-hidden active:scale-[0.98] transition-transform">
                  <div className="p-4 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <Badge variant="secondary" className="mb-1">{item.category?.name}</Badge>
                        <h3 className="font-bold text-lg leading-tight">{item.variety?.name}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(item.timestamp), "dd MMM yyyy")}
                        </p>
                      </div>
                      <Badge variant="outline" className="font-mono bg-background shadow-sm">
                        {item.lotNo}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 py-3 border-y border-dashed">
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Quantity</p>
                        <p className="font-bold text-primary">{item.numberOfPackets} <span className="text-xs font-normal text-muted-foreground">pkts</span></p>
                        <p className="text-xs text-muted-foreground truncate">{item.typeOfPackage}</p>
                      </div>
                      <div className="space-y-1 border-l pl-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Expiry</p>
                        <p className="font-bold text-orange-600">{item.expiryDate || "N/A"}</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Source</p>
                      <p className="text-sm font-medium line-clamp-1">{item.receivedFrom}</p>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="secondary"
                        className="flex-1 h-10 gap-2"
                        onClick={() => setEditingItem(item)}
                      >
                        <Edit2 className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 text-destructive border-destructive/20 hover:bg-destructive/5"
                        onClick={() => {
                          if (confirm("Are you sure?")) {
                            deleteMutation.mutate(item.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              {seedInwards?.length === 0 && (
                <div className="col-span-full py-20 flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
                  <Package className="h-12 w-12 mb-3 opacity-20 text-primary" />
                  <p className="font-medium">No entries yet</p>
                  <Button variant="link" onClick={() => setIsAdding(true)}>Click here to add first entry</Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
