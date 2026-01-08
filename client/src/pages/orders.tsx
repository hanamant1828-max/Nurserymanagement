import { useState, useEffect, useMemo } from "react";
import { useOrders, useCreateOrder, useUpdateOrder } from "@/hooks/use-orders";
import { useLots } from "@/hooks/use-lots";
import { useCategories } from "@/hooks/use-categories";
import { useVarieties } from "@/hooks/use-varieties";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Plus, ShoppingCart, CheckCircle, Layers, Check, ChevronsUpDown, Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import confetti from "canvas-confetti";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const formSchema = z.object({
  categoryId: z.string().optional(),
  varietyId: z.string().optional(),
  lotId: z.string().min(1, "Please select a lot"),
  customerName: z.string().min(1, "Customer name is required"),
  phone: z.string().min(10, "Valid phone number required"),
  village: z.string().optional(),
  bookedQty: z.coerce.number().min(1, "Quantity must be > 0"),
  advanceAmount: z.coerce.number().min(0),
  paymentMode: z.enum(["Cash", "PhonePe"]),
  deliveryDate: z.date(),
});

function SearchableSelect({ 
  options, 
  value, 
  onValueChange, 
  placeholder, 
  emptyText = "No results found.",
  disabled = false,
  renderItem
}: {
  options: any[],
  value: string,
  onValueChange: (val: string) => void,
  placeholder: string,
  emptyText?: string,
  disabled?: boolean,
  renderItem: (item: any) => React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-12 text-left font-normal"
          disabled={disabled}
        >
          <div className="flex-1 truncate text-left">
            {value ? (
              <div className="flex items-center gap-2">
                {renderItem(options.find((opt) => opt.id.toString() === value))}
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} />
          <CommandList className="max-h-[300px] overflow-y-auto">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.name}
                  onSelect={() => {
                    onValueChange(option.id.toString())
                    setOpen(false)
                  }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    {renderItem(option)}
                  </div>
                  <Check
                    className={cn(
                      "h-4 w-4",
                      value === option.id.toString() ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default function OrdersPage() {
  const { toast } = useToast();
  const { data: orders, isLoading } = useOrders();
  const { data: lots } = useLots();
  const { data: categories } = useCategories();
  const { data: varieties } = useVarieties();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const [pageCategoryId, setPageCategoryId] = useState<string>("all");
  const [pageVarietyId, setPageVarietyId] = useState<string>("all");
  const [pageLotId, setPageLotId] = useState<string>("all");

  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => {
    const from = new Date();
    from.setDate(from.getDate() - 30);
    const to = new Date();
    to.setDate(to.getDate() + 30);
    return { from, to };
  });

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, pageCategoryId, pageVarietyId, pageLotId, dateRange]);

  const sortedCategories = useMemo(() => {
    if (!categories) return [];
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  const filteredVarietiesPage = varieties?.filter(v => 
    pageCategoryId === "all" || v.categoryId.toString() === pageCategoryId
  );

  const filteredLotsPage = lots?.filter(l => 
    (pageCategoryId === "all" || l.categoryId.toString() === pageCategoryId) &&
    (pageVarietyId === "all" || l.varietyId.toString() === pageVarietyId)
  );

  const filteredOrdersList = useMemo(() => {
    if (!orders) return [];
    
    // Only show BOOKED orders
    const bookedOrders = orders.filter(o => o.status === "BOOKED");

    return bookedOrders.filter(o => {
      // Date filter
      const deliveryDate = new Date(o.deliveryDate);
      const isWithinDateRange = deliveryDate >= dateRange.from && deliveryDate <= dateRange.to;
      if (!isWithinDateRange) return false;

      const matchesSearch = !search || 
        o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
        o.phone?.toLowerCase().includes(search.toLowerCase()) ||
        lots?.find(l => l.id === o.lotId)?.lotNumber?.toLowerCase().includes(search.toLowerCase()) ||
        varieties?.find(v => v.id === (lots?.find(l => l.id === o.lotId)?.varietyId))?.name?.toLowerCase().includes(search.toLowerCase());
      
      if (!matchesSearch) return false;

      // If any filter is set to something other than "all", apply it
      if (pageCategoryId !== "all") {
        const lot = lots?.find(l => l.id === o.lotId);
        if (lot?.categoryId.toString() !== pageCategoryId) return false;
      }

      if (pageVarietyId !== "all") {
        const lot = lots?.find(l => l.id === o.lotId);
        if (lot?.varietyId.toString() !== pageVarietyId) return false;
      }

      if (pageLotId !== "all") {
        if (o.lotId.toString() !== pageLotId) return false;
      }

      return true;
    });
  }, [orders, search, lots, varieties, pageLotId, pageVarietyId, pageCategoryId, dateRange]);

  const totalPages = Math.ceil(filteredOrdersList.length / itemsPerPage);
  const paginatedOrders = filteredOrdersList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bookedQty: 1,
      advanceAmount: 0,
      paymentMode: "Cash",
      deliveryDate: new Date(),
    },
  });

  const { mutate: create, isPending: creating } = useCreateOrder();
  const { mutate: update } = useUpdateOrder();

  const selectedCategoryId = form.watch("categoryId");
  const selectedVarietyId = form.watch("varietyId");
  const selectedLotId = form.watch("lotId");
  const bookedQty = form.watch("bookedQty") || 0;
  const advanceAmount = form.watch("advanceAmount") || 0;

  const filteredVarieties = varieties?.filter(v => 
    !selectedCategoryId || v.categoryId.toString() === selectedCategoryId
  );

  const availableLots = lots?.filter(l => 
    (!selectedCategoryId || l.categoryId.toString() === selectedCategoryId) &&
    (!selectedVarietyId || l.varietyId.toString() === selectedVarietyId) &&
    l.available > 0
  );

  const selectedLot = lots?.find(l => l.id.toString() === selectedLotId);
  const selectedCategory = categories?.find(c => c.id === selectedLot?.categoryId);
  const unitPrice = selectedCategory ? Number(selectedCategory.pricePerUnit) : 0;
  const totalAmount = bookedQty * unitPrice;
  const remainingBalance = totalAmount - advanceAmount;

  // Auto-set delivery date from lot's expected ready date
  useEffect(() => {
    if (selectedLot?.expectedReadyDate) {
      form.setValue("deliveryDate", new Date(selectedLot.expectedReadyDate));
    }
  }, [selectedLotId, selectedLot?.expectedReadyDate, form]);


  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (selectedLot && data.bookedQty > selectedLot.available) {
      form.setError("bookedQty", { message: `Only ${selectedLot.available} available` });
      return;
    }

    const payload = {
      lotId: parseInt(data.lotId),
      customerName: data.customerName,
      phone: data.phone,
      village: data.village || "",
      bookedQty: data.bookedQty,
      advanceAmount: data.advanceAmount.toString(),
      paymentMode: data.paymentMode,
      deliveryDate: format(data.deliveryDate, "yyyy-MM-dd"),
    };

    create(payload, { 
      onSuccess: () => { 
        setOpen(false); 
        form.reset(); 
        setStep(1); 
      } 
    });
  };

  const markDelivered = (id: number) => {
    // Trigger confetti immediately for better UX
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#3b82f6', '#f59e0b']
    });

    update({ id, status: "DELIVERED", deliveredQty: 0 }, {
      onSuccess: () => {
        toast({
          title: "Order Delivered",
          description: "The order has been successfully marked as delivered.",
        });
        // Count will automatically update because orders are re-fetched on success
      },
      onError: (error: Error) => {
        toast({
          title: "Update Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden border-2">
              <CardContent className="p-0">
                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-md" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Orders ({filteredOrdersList.length})</h1>
          <p className="text-muted-foreground">Book new orders and manage deliveries.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Input 
            placeholder="Search customer, phone, lot..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64"
          />
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if(!v) setOpen(false); }}>
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-lg shadow-primary/20">
                <Plus className="w-5 h-5 mr-2" /> Book Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Book Order</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-2">
                  {step === 1 && (
                    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="categoryId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Select Category</FormLabel>
                              <FormControl>
                                <SearchableSelect
                                  options={categories || []}
                                  value={field.value || ""}
                                  onValueChange={(val) => {
                                    field.onChange(val);
                                    form.setValue("varietyId", "");
                                    form.setValue("lotId", "");
                                  }}
                                  placeholder="Pick a Category"
                                  renderItem={(c) => (
                                    <div className="flex items-center gap-4 py-1">
                                      {c?.image ? (
                                        <img src={c.image} className="w-10 h-10 rounded-md object-cover border shadow-sm" alt="" />
                                      ) : (
                                        <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center border">
                                          <Layers className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                      )}
                                      <span className="font-bold text-lg">{c?.name}</span>
                                    </div>
                                  )}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="varietyId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Select Variety</FormLabel>
                              <FormControl>
                                <SearchableSelect
                                  options={filteredVarieties || []}
                                  value={field.value || ""}
                                  onValueChange={(val) => {
                                    field.onChange(val);
                                    form.setValue("lotId", "");
                                  }}
                                  placeholder="Pick a Variety"
                                  disabled={!selectedCategoryId}
                                  renderItem={(v) => {
                                    const cat = categories?.find(c => c.id === v.categoryId);
                                    return (
                                      <div className="flex items-center gap-4 py-1">
                                        {cat?.image ? (
                                          <img src={cat.image} className="w-10 h-10 rounded-md object-cover border shadow-sm" alt="" />
                                        ) : (
                                          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center border">
                                            <Layers className="w-5 h-5 text-muted-foreground" />
                                          </div>
                                        )}
                                        <span className="font-bold text-lg">{v?.name}</span>
                                      </div>
                                    );
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="lotId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex justify-between">
                              <span>Select Stock Lot</span>
                              <span className="text-destructive text-xs font-normal">Required</span>
                            </FormLabel>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-1 rounded-md bg-muted/20 border">
                              {availableLots?.map(lot => (
                                <Card 
                                  key={lot.id} 
                                  className={`cursor-pointer transition-all border-2 ${field.value === lot.id.toString() ? 'border-primary bg-primary/5 ring-2 ring-primary/10' : 'hover:border-primary/50'}`}
                                  onClick={() => field.onChange(lot.id.toString())}
                                >
                                  <CardContent className="p-4">
                                    <div className="flex justify-between items-start gap-4">
                                      <div className="flex items-center gap-4">
                                        {lot.category?.image ? (
                                          <img src={lot.category.image} className="w-14 h-14 rounded-md object-cover border" alt="" />
                                        ) : (
                                          <div className="w-14 h-14 rounded-md bg-muted flex items-center justify-center border">
                                            <Layers className="w-7 h-7 text-muted-foreground/30" />
                                          </div>
                                        )}
                                        <div className="overflow-hidden">
                                          <p className="font-extrabold text-base truncate">{lot.variety?.name}</p>
                                          <p className="text-xs text-muted-foreground font-mono">{lot.lotNumber}</p>
                                        </div>
                                      </div>
                                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 whitespace-nowrap text-sm px-2 py-1">
                                        {lot.available}
                                      </Badge>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                              {availableLots?.length === 0 && (
                                <div className="col-span-full py-8 text-center text-muted-foreground">
                                  {selectedVarietyId ? "No plants available for this variety." : "Select a variety to see available lots."}
                                </div>
                              )}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="button" 
                        size="lg"
                        className="w-full text-lg"
                        onClick={async () => { 
                          const isValid = await form.trigger(["lotId"]);
                          if(isValid) setStep(2); 
                        }} 
                      >
                        Next Step
                      </Button>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      {selectedLot && (
                         <div className="bg-primary/5 border border-primary/10 p-3 rounded-lg flex justify-between items-center shadow-sm mb-6">
                           <div className="flex items-center gap-4">
                             {selectedLot.category?.image && (
                               <img src={selectedLot.category.image} className="w-14 h-14 rounded-md object-cover border border-primary/20 shadow-sm" alt="" />
                             )}
                             <div className="space-y-0.5">
                               <p className="font-bold text-lg leading-tight text-foreground">{selectedLot.variety?.name}</p>
                               <p className="text-xs text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded inline-block">{selectedLot.lotNumber}</p>
                             </div>
                           </div>
                           <div className="flex items-center gap-4">
                             <div className="text-center">
                               <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider mb-1">Stock</p>
                               <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-black text-sm px-3 py-1 rounded-md shadow-sm border-none">
                                 {selectedLot.available}
                               </Badge>
                             </div>
                             <Button variant="outline" size="sm" onClick={() => setStep(1)} className="h-10 font-bold px-4 rounded-md border-primary/20 hover:bg-primary/5 shadow-sm">Change</Button>
                           </div>
                         </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="customerName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Customer Name</FormLabel>
                              <FormControl><Input placeholder="Name" className="h-12 text-lg bg-muted/30 border-muted focus-visible:ring-primary/20" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Mobile Number</FormLabel>
                              <FormControl><Input placeholder="Phone" className="h-12 text-lg bg-muted/30 border-muted focus-visible:ring-primary/20" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="village"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Village / Area</FormLabel>
                            <FormControl><Input placeholder="Address" className="h-12 text-lg bg-muted/30 border-muted focus-visible:ring-primary/20" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <FormField
                          control={form.control}
                          name="bookedQty"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Quantity</FormLabel>
                              <FormControl>
                                <Input type="number" className="h-12 text-lg bg-muted/30 border-muted focus-visible:ring-primary/20" {...field} 
                                  max={selectedLot?.available} 
                                  onChange={e => field.onChange(parseInt(e.target.value) || 0)} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="deliveryDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Expected Delivery Date (From Lot)</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Button 
                                    variant="outline" 
                                    disabled 
                                    className="h-12 w-full pl-10 text-left text-lg font-bold bg-muted/50 border-muted cursor-not-allowed"
                                  >
                                    {field.value ? format(field.value, "dd MMM yyyy") : <span>No date set</span>}
                                  </Button>
                                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground opacity-70" />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="advanceAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Advance (₹)</FormLabel>
                              <FormControl><Input type="number" className="h-12 text-lg bg-muted/30 border-primary focus-visible:ring-primary/20 border-2" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="paymentMode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Payment Mode</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || "Cash"}>
                                <FormControl><SelectTrigger className="h-12 text-lg bg-muted/30 border-muted focus:ring-primary/20"><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="Cash">Cash</SelectItem>
                                  <SelectItem value="PhonePe">PhonePe / UPI</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="bg-muted/30 p-4 rounded-lg border-2 border-dashed space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground font-medium">Total Amount</span>
                          <span className="text-lg font-black text-foreground">₹{totalAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground font-medium">Advance Paid</span>
                          <span className="text-lg font-black text-emerald-600">- ₹{advanceAmount.toLocaleString()}</span>
                        </div>
                        <div className="border-t pt-2 mt-2 flex justify-between items-center">
                          <span className="text-base font-bold text-foreground">Remaining Balance</span>
                          <span className="text-xl font-black text-destructive">₹{remainingBalance.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="flex gap-4 pt-4">
                        <Button type="button" variant="outline" size="lg" onClick={() => setStep(1)} className="flex-1 h-14 text-lg font-bold rounded-xl border-primary/20 hover:bg-primary/5">Back</Button>
                        <Button type="submit" size="lg" className="flex-[2] h-14 text-xl font-black rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200" disabled={creating}>Confirm Order</Button>
                      </div>
                    </div>
                  )}
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 bg-muted/30 p-4 rounded-xl mb-8">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">From Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal h-11 bg-background border-muted-foreground/20">
                <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                {dateRange.from ? format(dateRange.from, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange.from}
                onSelect={(date) => date && setDateRange(prev => ({ ...prev, from: date }))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">To Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal h-11 bg-background border-muted-foreground/20">
                <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                {dateRange.to ? format(dateRange.to, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange.to}
                onSelect={(date) => date && setDateRange(prev => ({ ...prev, to: date }))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Category Filter</label>
          <Select onValueChange={(val) => {
            setPageCategoryId(val);
            setPageVarietyId("all");
            setPageLotId("all");
          }} value={pageCategoryId}>
            <SelectTrigger className="h-11 bg-background border-muted-foreground/20">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span className="font-bold text-primary">All Categories</span>
              </SelectItem>
              {categories?.map(c => (
                <SelectItem key={c.id} value={c.id.toString()}>
                  <div className="flex items-center gap-3 py-1">
                    {c.image ? (
                      <img src={c.image} className="w-10 h-10 rounded-md object-cover border" alt="" />
                    ) : (
                      <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center border">
                        <Layers className="w-5 h-5 text-muted-foreground/40" />
                      </div>
                    )}
                    <span className="font-semibold text-base">{c.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Variety Filter</label>
          <Select 
            onValueChange={(val) => {
              setPageVarietyId(val);
              setPageLotId("all");
            }} 
            value={pageVarietyId}
            disabled={pageCategoryId === "all"}
          >
            <SelectTrigger className="h-11 bg-background border-muted-foreground/20">
              <SelectValue placeholder="All Varieties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span className="text-base font-bold py-1">All Varieties</span>
              </SelectItem>
              {filteredVarietiesPage?.map(v => (
                <SelectItem key={v.id} value={v.id.toString()}>
                  <span className="text-base font-bold py-1">{v.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Lot Filter</label>
          <Select 
            onValueChange={setPageLotId} 
            value={pageLotId}
            disabled={pageVarietyId === "all"}
          >
            <SelectTrigger className="h-11 bg-background border-muted-foreground/20">
              <SelectValue placeholder="All Lots" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span className="text-base font-bold py-1">All Lots</span>
              </SelectItem>
              {filteredLotsPage?.map(l => (
                <SelectItem key={l.id} value={l.id.toString()}>
                  <span className="text-base font-bold py-1">{l.lotNumber}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {(pageCategoryId !== "all" || pageVarietyId !== "all" || pageLotId !== "all") && (
          <Button 
            variant="ghost" 
            onClick={() => {
              setPageCategoryId("all");
              setPageVarietyId("all");
              setPageLotId("all");
            }}
            className="h-11 px-4 text-muted-foreground hover:text-foreground col-span-full lg:col-auto"
          >
            Clear Filters
          </Button>
        )}
      </div>

      <div className="hidden md:block rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-20">ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Plant Details</TableHead>
              <TableHead>Taken By</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Delivery Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="h-24 text-center">Loading orders...</TableCell></TableRow>
            ) : filteredOrdersList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <ShoppingCart className="w-8 h-8 opacity-20" />
                    No orders found.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedOrders.map((order) => {
                const lot = lots?.find(l => l.id === order.lotId);
                const variety = varieties?.find(v => v.id === lot?.varietyId);
                const category = categories?.find(c => c.id === lot?.categoryId);

                return (
                  <TableRow key={order.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-muted-foreground text-xs">#{order.id}</TableCell>
                    <TableCell>
                      <div className="font-bold">{order.customerName}</div>
                      <div className="text-xs text-muted-foreground">{order.phone}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {category?.image ? (
                          <img src={category.image} className="w-12 h-12 rounded-md object-cover border shadow-sm" alt="" />
                        ) : (
                          <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center border">
                            <Layers className="w-6 h-6 text-muted-foreground/30" />
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-sm block leading-tight">{variety?.name}</span>
                          <p className="text-[10px] text-muted-foreground uppercase font-mono">{lot?.lotNumber}</p>
                        </div>
                      </div>
                    </TableCell>
                  <TableCell>
                    {(() => {
                      const orderWithCreator = order as any;
                      return orderWithCreator.creator ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                            {orderWithCreator.creator.username.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium">{orderWithCreator.creator.username}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">System</span>
                      );
                    })()}
                  </TableCell>
                    <TableCell className="text-right font-black text-primary">{order.bookedQty}</TableCell>
                    <TableCell className="text-sm font-medium">{format(new Date(order.deliveryDate), "dd MMM yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant={order.status === 'DELIVERED' ? 'secondary' : order.status === 'CANCELLED' ? 'destructive' : 'default'} className={order.status === 'DELIVERED' ? 'bg-green-100 text-green-700 border-green-200' : ''}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {order.status === 'BOOKED' && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200 hover:border-green-300 transition-all"
                          onClick={() => markDelivered(order.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1.5" /> Delivered
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-4 border-t bg-card rounded-b-xl border-x border-b">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
            <span className="font-medium">
              {Math.min(currentPage * itemsPerPage, filteredOrdersList.length)}
            </span> of{" "}
            <span className="font-medium">{filteredOrdersList.length}</span> results
          </p>
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
              </PaginationItem>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  // Show current page, first, last, and neighbors
                  return (
                    page === 1 ||
                    page === totalPages ||
                    Math.abs(page - currentPage) <= 1
                  );
                })
                .map((page, index, array) => {
                  const items = [];
                  if (index > 0 && page - array[index - 1] > 1) {
                    items.push(
                      <PaginationItem key={`ellipsis-${page}`}>
                        <span className="px-2 text-muted-foreground">...</span>
                      </PaginationItem>
                    );
                  }
                  items.push(
                    <PaginationItem key={page}>
                      <Button
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        className="w-9"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    </PaginationItem>
                  );
                  return items;
                })}

              <PaginationItem>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <div className="md:hidden space-y-4 pb-12">
        {isLoading ? (
          <div className="h-24 flex items-center justify-center">Loading orders...</div>
        ) : filteredOrdersList.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground italic bg-muted/20 rounded-lg border-2 border-dashed">
            No orders found.
          </div>
        ) : (
          paginatedOrders.map((order) => {
            const lot = lots?.find(l => l.id === order.lotId);
            const variety = varieties?.find(v => v.id === lot?.varietyId);
            const category = categories?.find(c => c.id === lot?.categoryId);
            return (
              <Card key={order.id} className="overflow-hidden border-2 hover:border-primary/20 transition-all shadow-sm active:scale-[0.98]">
                <CardContent className="p-0">
                  <div className={`p-3 flex justify-between items-center ${order.status === 'BOOKED' ? 'bg-amber-500/10' : 'bg-emerald-500/10'}`}>
                    <div className="flex items-center gap-3">
                      <div className="bg-background p-2 rounded-lg shadow-sm">
                        <ShoppingCart className={`w-5 h-5 ${order.status === 'BOOKED' ? 'text-amber-600' : 'text-emerald-600'}`} />
                      </div>
                      <div>
                        <p className="font-black text-lg leading-tight">{order.customerName}</p>
                        <p className="text-sm font-mono text-muted-foreground">{order.phone}</p>
                      </div>
                    </div>
                    <Badge 
                      className={`font-black text-xs px-2 py-1 rounded-md shadow-sm border-none ${
                        order.status === 'BOOKED' 
                          ? 'bg-amber-500 text-white' 
                          : order.status === 'DELIVERED'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-destructive text-destructive-foreground'
                      }`}
                    >
                      {order.status}
                    </Badge>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    <div className="flex items-center gap-3">
                      {category?.image ? (
                        <img src={category.image} className="w-12 h-12 rounded-md object-cover border" alt="" />
                      ) : (
                        <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center border">
                          <Layers className="w-6 h-6 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Variety & Lot</p>
                        <p className="font-bold text-sm leading-tight">{variety?.name}</p>
                        <p className="text-xs font-mono text-muted-foreground bg-muted inline-block px-1 rounded">{lot?.lotNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Qty</p>
                        <p className="font-black text-2xl text-primary">{order.bookedQty}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-dashed">
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Delivery Date</p>
                        <p className="text-sm font-bold">{format(new Date(order.deliveryDate), "dd MMM yyyy")}</p>
                      </div>
                      {order.village && (
                        <div className="space-y-1 text-right">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Village</p>
                          <p className="text-sm font-medium text-muted-foreground truncate italic">{order.village}</p>
                        </div>
                      )}
                    </div>

                    {order.status === "BOOKED" && (
                      <Button 
                        size="lg"
                        onClick={() => markDelivered(order.id)}
                        className="w-full mt-2 font-black text-base h-12 rounded-xl shadow-md shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 active-elevate-2"
                      >
                        <CheckCircle className="w-5 h-5 mr-2" /> Mark Delivered
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
