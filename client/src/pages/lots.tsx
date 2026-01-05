import { useState } from "react";
import { useLots, useCreateLot, useUpdateLot } from "@/hooks/use-lots";
import { useCategories } from "@/hooks/use-categories";
import { useVarieties } from "@/hooks/use-varieties";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Sprout, AlertTriangle, Eye, Calendar as CalendarIcon, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { useDeleteLot } from "@/hooks/use-lots";
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

// Schema for create lot form
const formSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  varietyId: z.string().min(1, "Variety is required"),
  lotNumber: z.string().min(1, "Lot Number is required"),
  seedsSown: z.coerce.number().min(1, "Must be greater than 0"),
  sowingDate: z.date(),
  expectedReadyDate: z.date().optional(),
  remarks: z.string().optional(),
});

// Schema for damage update
const damageSchema = z.object({
  damaged: z.coerce.number().min(1),
  reason: z.string().optional(),
});

export default function LotsPage() {
  const { data: lots, isLoading } = useLots();
  const { data: categories } = useCategories();
  const { data: varieties } = useVarieties();
  
  const [open, setOpen] = useState(false);
  const [damageDialogOpen, setDamageDialogOpen] = useState(false);
  const [selectedLotId, setSelectedLotId] = useState<number | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      lotNumber: "",
      seedsSown: 0,
      sowingDate: new Date(),
      remarks: "",
    },
  });
  
  const damageForm = useForm<z.infer<typeof damageSchema>>({
    resolver: zodResolver(damageSchema),
    defaultValues: { damaged: 0 },
  });

  const { mutate: create, isPending: creating } = useCreateLot();
  const { mutate: update, isPending: updating } = useUpdateLot();
  const { mutate: deleteLot } = useDeleteLot();
  const { toast } = useToast();

  const handleDelete = (id: number) => {
    deleteLot(id, {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Lot deleted successfully",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to delete lot",
          variant: "destructive",
        });
      },
    });
  };

  // Filter varieties based on selected category
  const selectedCategoryId = form.watch("categoryId");
  const filteredVarieties = varieties?.filter(v => v.categoryId.toString() === selectedCategoryId && v.active);

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const payload = {
      ...data,
      categoryId: Number(data.categoryId),
      varietyId: Number(data.varietyId),
      sowingDate: format(data.sowingDate, "yyyy-MM-dd"),
      expectedReadyDate: data.expectedReadyDate ? format(data.expectedReadyDate, "yyyy-MM-dd") : undefined,
    };
    
    create(payload, { onSuccess: () => { setOpen(false); form.reset(); } });
  };
  
  const onSubmitDamage = (data: z.infer<typeof damageSchema>) => {
    if (selectedLotId) {
      const lot = lots?.find(l => l.id === selectedLotId);
      if (lot) {
        // Add to existing damage
        const newDamage = lot.damaged + data.damaged;
        update({ id: selectedLotId, damaged: newDamage }, { 
          onSuccess: () => { setDamageDialogOpen(false); damageForm.reset(); setSelectedLotId(null); } 
        });
      }
    }
  };

  const openDamageDialog = (lotId: number) => {
    setSelectedLotId(lotId);
    setDamageDialogOpen(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Lots & Stock</h1>
          <p className="text-muted-foreground">Monitor sowing lots, stock availability, and damages.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="shadow-lg shadow-primary/20">
              <Plus className="w-5 h-5 mr-2" /> New Sowing Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>New Sowing Lot Entry</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Category Selection */}
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories?.filter(c => c.active).map(c => (
                              <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Variety Selection */}
                  <FormField
                    control={form.control}
                    name="varietyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Variety</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedCategoryId}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Variety" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredVarieties?.map(v => (
                              <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Lot Number */}
                  <FormField
                    control={form.control}
                    name="lotNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lot Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Auto or Manual (e.g. L-101)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Seeds Sown */}
                  <FormField
                    control={form.control}
                    name="seedsSown"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seeds Sown Quantity</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Sowing Date */}
                  <FormField
                    control={form.control}
                    name="sowingDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Sowing Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                              >
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Expected Ready Date */}
                  <FormField
                    control={form.control}
                    name="expectedReadyDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Expected Ready Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                              >
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                              disabled={(date) => date < new Date()}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="remarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Remarks</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Any additional notes..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={creating}>Save Lot Entry</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Damage Update Dialog */}
        <Dialog open={damageDialogOpen} onOpenChange={setDamageDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Damage / Loss</DialogTitle>
              </DialogHeader>
              <Form {...damageForm}>
                <form onSubmit={damageForm.handleSubmit(onSubmitDamage)} className="space-y-4">
                  <FormField
                    control={damageForm.control}
                    name="damaged"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity Damaged (Add to existing)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={damageForm.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason</FormLabel>
                        <FormControl>
                          <Textarea placeholder="e.g. Pest attack, Rain damage" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" variant="destructive" className="w-full" disabled={updating}>
                    Record Damage
                  </Button>
                </form>
              </Form>
            </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Lot No</TableHead>
              <TableHead>Variety</TableHead>
              <TableHead>Sowing Date</TableHead>
              <TableHead className="text-right">Sown</TableHead>
              <TableHead className="text-right text-destructive">Damaged</TableHead>
              <TableHead className="text-right text-primary font-bold">Available</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="h-24 text-center">Loading lots...</TableCell></TableRow>
            ) : lots?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Sprout className="w-8 h-8 opacity-20" />
                    No sowing lots recorded yet.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              lots?.map((lot) => {
                const isLowStock = lot.available < (lot.seedsSown * 0.1);
                return (
                  <TableRow key={lot.id}>
                    <TableCell className="font-mono font-medium">{lot.lotNumber}</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{lot.variety?.name || "Unknown Variety"}</span>
                        <p className="text-xs text-muted-foreground">{lot.category?.name || "Unknown Category"}</p>
                      </div>
                    </TableCell>
                    <TableCell>{lot.sowingDate}</TableCell>
                    <TableCell className="text-right">{lot.seedsSown}</TableCell>
                    <TableCell className="text-right text-destructive">{lot.damaged > 0 ? lot.damaged : '-'}</TableCell>
                    <TableCell className="text-right font-bold text-primary text-lg">
                      {lot.available}
                    </TableCell>
                    <TableCell className="text-center">
                      {lot.available === 0 ? (
                        <Badge variant="outline" className="border-muted-foreground text-muted-foreground">Empty</Badge>
                      ) : isLowStock ? (
                        <Badge variant="destructive">Low Stock</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">Available</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => openDamageDialog(lot.id)}
                          title="Record Damage"
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Lot</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this sowing lot? This action cannot be undone and will fail if there are active orders for this lot.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(lot.id)}
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
    </div>
  );
}
