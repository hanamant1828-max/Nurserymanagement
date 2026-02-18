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
import { Loader2, Plus, Trash2, Edit2 } from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";

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

  // Reset varietyId if it's not in the filtered list
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

  return (
    <div className="space-y-8 p-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Seed Inward</h1>
          <p className="text-muted-foreground">Manage incoming seed stocks</p>
        </div>
        <Button onClick={() => {
          if (editingItem) setEditingItem(null);
          setIsAdding(!isAdding);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          {isAdding ? "Cancel" : "Add Entry"}
        </Button>
      </div>

      {(isAdding || editingItem) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingItem ? "Edit Seed Inward Entry" : "New Seed Inward Entry"}</CardTitle>
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
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
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
                          <SelectTrigger>
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
                        <Input {...field} />
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
                        <Input type="date" {...field} />
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
                        <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
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
                        <Input {...field} placeholder="e.g. Box, Bag, Pouch" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="receivedFrom"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2 lg:col-span-3">
                      <FormLabel>Received From</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => {
                    setIsAdding(false);
                    setEditingItem(null);
                    form.reset({
                      categoryId: 0,
                      varietyId: 0,
                      lotNo: "",
                      expiryDate: "",
                      numberOfPackets: 0,
                      typeOfPackage: "",
                      receivedFrom: "",
                    });
                  }}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingItem ? "Update Entry" : "Save Entry"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Seed Inward History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Variety</TableHead>
                <TableHead>Lot No.</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {seedInwards?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{format(new Date(item.timestamp), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{item.category.name}</TableCell>
                  <TableCell>{item.variety.name}</TableCell>
                  <TableCell className="font-medium">{item.lotNo}</TableCell>
                  <TableCell>{item.expiryDate}</TableCell>
                  <TableCell>{item.numberOfPackets}</TableCell>
                  <TableCell>{item.typeOfPackage}</TableCell>
                  <TableCell>{item.receivedFrom}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingItem(item);
                          setIsAdding(false);
                        }}
                      >
                        <Edit2 className="h-4 w-4 text-primary" />
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
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {seedInwards?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No inward entries found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
