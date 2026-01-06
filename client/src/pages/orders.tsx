import { useState } from "react";
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
import { Plus, ShoppingCart, CheckCircle, Layers } from "lucide-react";
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

export default function OrdersPage() {
  const { data: orders, isLoading } = useOrders();
  const { data: lots } = useLots();
  const { data: categories } = useCategories();
  const { data: varieties } = useVarieties();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState("");

  // Page level filters for cascading view
  const [pageCategoryId, setPageCategoryId] = useState<string>("all");
  const [pageVarietyId, setPageVarietyId] = useState<string>("all");
  const [pageLotId, setPageLotId] = useState<string>("all");

  const filteredVarietiesPage = varieties?.filter(v => 
    pageCategoryId === "all" || v.categoryId.toString() === pageCategoryId
  );

  const filteredLotsPage = lots?.filter(l => 
    (pageCategoryId === "all" || l.categoryId.toString() === pageCategoryId) &&
    (pageVarietyId === "all" || l.varietyId.toString() === pageVarietyId)
  );

  const filteredOrdersList = orders?.filter(o => {
    const matchesSearch = !search || 
      o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      o.phone?.toLowerCase().includes(search.toLowerCase()) ||
      lots?.find(l => l.id === o.lotId)?.lotNumber?.toLowerCase().includes(search.toLowerCase()) ||
      varieties?.find(v => v.id === (lots?.find(l => l.id === o.lotId)?.varietyId))?.name?.toLowerCase().includes(search.toLowerCase());
    
    // Strict hierarchical filtering:
    // 1. If lot is selected, filter by lot
    // 2. Else if variety is selected, filter by variety
    // 3. Else if category is selected, filter by category
    
    if (pageLotId !== "all") {
      return matchesSearch && o.lotId.toString() === pageLotId;
    }
    
    if (pageVarietyId !== "all") {
      const lot = lots?.find(l => l.id === o.lotId);
      return matchesSearch && lot?.varietyId.toString() === pageVarietyId;
    }
    
    if (pageCategoryId !== "all") {
      const lot = lots?.find(l => l.id === o.lotId);
      return matchesSearch && lot?.categoryId.toString() === pageCategoryId;
    }

    return matchesSearch;
  }) || [];

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

  const filteredVarieties = varieties?.filter(v => 
    !selectedCategoryId || v.categoryId.toString() === selectedCategoryId
  );

  const availableLots = lots?.filter(l => 
    (!selectedCategoryId || l.categoryId.toString() === selectedCategoryId) &&
    (!selectedVarietyId || l.varietyId.toString() === selectedVarietyId) &&
    l.available > 0
  );

  const selectedLot = lots?.find(l => l.id.toString() === selectedLotId);

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
    update({ id, status: "DELIVERED", deliveredQty: 0 });
  };

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
                              <Select onValueChange={(val) => {
                                field.onChange(val);
                                form.setValue("varietyId", "");
                                form.setValue("lotId", "");
                              }} value={field.value || ""}>
                                <FormControl>
                                  <SelectTrigger className="h-12">
                                    <SelectValue placeholder="Pick a Category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {categories?.map(c => (
                                    <SelectItem key={c.id} value={c.id.toString()}>
                                      <div className="flex items-center gap-4 py-2">
                                        {c.image ? (
                                          <img src={c.image} className="w-12 h-12 rounded-md object-cover border shadow-sm" alt="" />
                                        ) : (
                                          <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center border">
                                            <Layers className="w-6 h-6 text-muted-foreground" />
                                          </div>
                                        )}
                                        <span className="font-bold text-lg">{c.name}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="varietyId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Select Variety</FormLabel>
                              <Select onValueChange={(val) => {
                                field.onChange(val);
                                form.setValue("lotId", "");
                              }} value={field.value || ""} disabled={!selectedCategoryId}>
                                <FormControl>
                                  <SelectTrigger className="h-12">
                                    <SelectValue placeholder="Pick a Variety" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {filteredVarieties?.map(v => {
                                    const cat = categories?.find(c => c.id === v.categoryId);
                                    return (
                                      <SelectItem key={v.id} value={v.id.toString()}>
                                        <div className="flex items-center gap-4 py-2">
                                          {cat?.image ? (
                                            <img src={cat.image} className="w-12 h-12 rounded-md object-cover border shadow-sm" alt="" />
                                          ) : (
                                            <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center border">
                                              <Layers className="w-6 h-6 text-muted-foreground" />
                                            </div>
                                          )}
                                          <span className="font-bold text-lg">{v.name}</span>
                                        </div>
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
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
                         <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg flex justify-between items-center shadow-sm">
                           <div className="flex items-center gap-3">
                             {selectedLot.category?.image && (
                               <img src={selectedLot.category.image} className="w-10 h-10 rounded-md object-cover border" alt="" />
                             )}
                             <div>
                               <p className="font-bold text-sm leading-tight">{selectedLot.variety?.name}</p>
                               <p className="text-xs text-muted-foreground">{selectedLot.lotNumber}</p>
                             </div>
                           </div>
                           <Button variant="outline" size="sm" onClick={() => setStep(1)} className="h-8">Change</Button>
                         </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="customerName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Customer Name</FormLabel>
                              <FormControl><Input placeholder="Name" className="h-11" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mobile Number</FormLabel>
                              <FormControl><Input placeholder="Phone" className="h-11" {...field} /></FormControl>
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
                            <FormLabel>Village / Area</FormLabel>
                            <FormControl><Input placeholder="Address" className="h-11" {...field} /></FormControl>
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
                              <FormLabel>Quantity</FormLabel>
                              <FormControl>
                                <Input type="number" className="h-11" {...field} 
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
                              <FormLabel>Delivery Date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button variant={"outline"} className={`h-11 w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}>
                                      {field.value ? format(field.value, "dd MMM yyyy") : <span>Pick date</span>}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date()} initialFocus />
                                </PopoverContent>
                              </Popover>
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
                              <FormLabel>Advance (₹)</FormLabel>
                              <FormControl><Input type="number" className="h-11" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="paymentMode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Payment Mode</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || "Cash"}>
                                <FormControl><SelectTrigger className="h-11"><SelectValue /></SelectTrigger></FormControl>
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

                      <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" size="lg" onClick={() => setStep(1)} className="flex-1">Back</Button>
                        <Button type="submit" size="lg" className="flex-[2] text-lg" disabled={creating}>Confirm Order</Button>
                      </div>
                    </div>
                  )}
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="bg-muted/30 border-none shadow-none">
        <CardContent className="p-4 flex flex-wrap gap-4 items-end">
          <div className="space-y-1.5 flex-1 min-w-[200px]">
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
                <SelectItem value="all">All Categories</SelectItem>
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

          <div className="space-y-1.5 flex-1 min-w-[200px]">
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
                <SelectItem value="all">All Varieties</SelectItem>
                {filteredVarietiesPage?.map(v => (
                  <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 flex-1 min-w-[200px]">
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
                <SelectItem value="all">All Lots</SelectItem>
                {filteredLotsPage?.map(l => (
                  <SelectItem key={l.id} value={l.id.toString()}>{l.lotNumber}</SelectItem>
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
              className="h-11 px-4 text-muted-foreground hover:text-foreground"
            >
              Clear Filters
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-20">ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Plant Details</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Delivery Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center">Loading orders...</TableCell></TableRow>
            ) : filteredOrdersList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <ShoppingCart className="w-8 h-8 opacity-20" />
                    No orders found.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredOrdersList.map((order) => (
                <TableRow key={order.id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono text-muted-foreground text-xs">#{order.id}</TableCell>
                  <TableCell>
                    <div className="font-bold">{order.customerName}</div>
                    <div className="text-xs text-muted-foreground">{order.phone}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {order.lot?.category?.image ? (
                        <img src={order.lot.category.image} className="w-10 h-10 rounded-md object-cover border shadow-sm" alt="" />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center border">
                          <Layers className="w-4 h-4 text-muted-foreground/30" />
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-sm block leading-tight">{order.lot?.variety?.name}</span>
                        <p className="text-[10px] text-muted-foreground uppercase font-mono">{order.lot?.lotNumber}</p>
                      </div>
                    </div>
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
