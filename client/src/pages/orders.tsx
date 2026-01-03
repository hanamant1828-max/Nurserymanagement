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
import { Plus, ShoppingCart, CheckCircle, Truck } from "lucide-react";
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
  // Selection
  categoryId: z.string().optional(), // Helper for filtering
  varietyId: z.string().optional(),  // Helper for filtering
  lotId: z.string().min(1, "Lot selection is required"),
  
  // Customer
  customerName: z.string().min(1, "Customer name is required"),
  phone: z.string().min(10, "Valid phone number required"),
  village: z.string().optional(),
  
  // Order
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

  // Watch filters for lot selection
  const selectedCategoryId = form.watch("categoryId");
  const selectedVarietyId = form.watch("varietyId");
  const selectedLotId = form.watch("lotId");
  const bookedQty = form.watch("bookedQty");

  // Filtering Logic
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
    // Validate quantity against stock one last time
    if (selectedLot && data.bookedQty > selectedLot.available) {
      form.setError("bookedQty", { message: `Only ${selectedLot.available} available` });
      return;
    }

    const payload = {
      lotId: data.lotId,
      customerName: data.customerName,
      phone: data.phone,
      village: data.village || "",
      bookedQty: data.bookedQty,
      advanceAmount: data.advanceAmount,
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
    update({ id, status: "DELIVERED", deliveredQty: 0 }); // Quantity will be set in backend logic if complex, or pass bookedQty
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Orders</h1>
          <p className="text-muted-foreground">Book new orders and manage deliveries.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if(!v) setStep(1); }}>
          <DialogTrigger asChild>
            <Button size="lg" className="shadow-lg shadow-primary/20">
              <Plus className="w-5 h-5 mr-2" /> Book Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>New Order Booking (Step {step}/2)</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
                
                {step === 1 && (
                  <div className="space-y-4 animate-in slide-in-from-left-4">
                    <div className="grid grid-cols-2 gap-4">
                       <FormField
                        control={form.control}
                        name="categoryId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category Filter</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
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
                            <FormLabel>Variety Filter</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="All Varieties" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {filteredVarieties?.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>)}
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
                          <FormLabel>Select Lot (Required)</FormLabel>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1">
                            {availableLots?.map(lot => (
                              <Card 
                                key={lot.id} 
                                className={`cursor-pointer hover:border-primary transition-all ${field.value === lot.id.toString() ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : ''}`}
                                onClick={() => field.onChange(lot.id.toString())}
                              >
                                <CardContent className="p-3">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-bold text-sm">{lot.variety.name}</p>
                                      <p className="text-xs text-muted-foreground">{lot.lotNumber}</p>
                                    </div>
                                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                                      {lot.available} Avail
                                    </Badge>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            {availableLots?.length === 0 && <p className="text-sm text-muted-foreground col-span-2 text-center py-4">No available lots found matching filters.</p>}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="button" onClick={() => { 
                      form.trigger(["lotId"]).then(isValid => { if(isValid) setStep(2); });
                    }} className="w-full">
                      Next: Customer & Payment
                    </Button>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4 animate-in slide-in-from-right-4">
                    {selectedLot && (
                       <div className="bg-muted/30 p-3 rounded-lg flex justify-between items-center text-sm">
                         <span>Selected: <strong>{selectedLot.variety.name}</strong> ({selectedLot.lotNumber})</span>
                         <Button variant="link" size="sm" onClick={() => setStep(1)}>Change</Button>
                       </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="customerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer Name</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
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
                          <FormLabel>Village / Address</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="border-t pt-4 mt-4">
                      <h3 className="font-semibold mb-3">Order Details</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="bookedQty"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantity</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} 
                                  max={selectedLot?.available} 
                                  onChange={e => field.onChange(parseInt(e.target.value))} 
                                />
                              </FormControl>
                              {selectedLot && (
                                <p className="text-xs text-muted-foreground">Max: {selectedLot.available}</p>
                              )}
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
                                    <Button variant={"outline"} className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}>
                                      {field.value ? format(field.value, "PPP") : <span>Pick date</span>}
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
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <FormField
                          control={form.control}
                          name="advanceAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Advance Amount (₹)</FormLabel>
                              <FormControl><Input type="number" {...field} /></FormControl>
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
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
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
                    </div>

                    <div className="flex gap-3">
                      <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                      <Button type="submit" className="flex-[2]" disabled={creating}>Confirm Order</Button>
                    </div>
                  </div>
                )}
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Delivery Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center">Loading orders...</TableCell></TableRow>
            ) : orders?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <ShoppingCart className="w-8 h-8 opacity-20" />
                    No orders found.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              orders?.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-muted-foreground">#{order.id}</TableCell>
                  <TableCell>
                    <div className="font-medium">{order.customerName}</div>
                    <div className="text-xs text-muted-foreground">{order.phone}</div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{order.lot.variety.name}</span>
                    <p className="text-xs text-muted-foreground">Lot: {order.lot.lotNumber}</p>
                  </TableCell>
                  <TableCell className="text-right font-bold">{order.bookedQty}</TableCell>
                  <TableCell>{format(new Date(order.deliveryDate), "dd MMM yyyy")}</TableCell>
                  <TableCell>
                    <Badge variant={order.status === 'DELIVERED' ? 'secondary' : order.status === 'CANCELLED' ? 'destructive' : 'default'} className={order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : ''}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {order.status === 'BOOKED' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => markDelivered(order.id)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" /> Delivered
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
