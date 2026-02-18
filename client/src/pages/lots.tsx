import { useState, useEffect, useMemo } from "react";
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
  DialogDescription,
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
import { Plus, Sprout, AlertTriangle, Eye, Calendar as CalendarIcon, Trash2, CheckCircle, Layers, CalendarDays, Edit2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { format, subDays, isAfter, isBefore, startOfDay, endOfDay, parseISO } from "date-fns";
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
import { DateRange } from "react-day-picker";
import { Pagination } from "@/components/pagination";

// Schema for create lot form
const formSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  varietyId: z.string().min(1, "Variety is required"),
  lotNumber: z.string().min(1, "Lot Number is required"),
  seedsSown: z.coerce.number().min(1, "Must be greater than 0"),
  packetsSown: z.coerce.number().min(0).default(0),
  damagePercentage: z.coerce.number().min(0).max(100).default(0),
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
  
  // Persistence key
  const PERSISTENCE_KEY = "lots_filters_state";

  // Initial state helper
  const getInitialState = () => {
    const saved = localStorage.getItem(PERSISTENCE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          search: parsed.search || "",
          selectedCategory: parsed.selectedCategory || "all",
          selectedVariety: parsed.selectedVariety || "all",
          dateRange: parsed.dateRange ? {
            from: parsed.dateRange.from ? new Date(parsed.dateRange.from) : undefined,
            to: parsed.dateRange.to ? new Date(parsed.dateRange.to) : undefined,
          } : {
            from: subDays(new Date(), 15),
            to: new Date(),
          },
          currentPage: parsed.currentPage || 1,
        };
      } catch (e) {
        console.error("Failed to parse saved filters", e);
      }
    }
    return {
      search: "",
      selectedCategory: "all",
      selectedVariety: "all",
      dateRange: {
        from: subDays(new Date(), 15),
        to: new Date(),
      },
      currentPage: 1,
    };
  };

  const initialState = getInitialState();
  const [open, setOpen] = useState(false);
  const [damageDialogOpen, setDamageDialogOpen] = useState(false);
  const [selectedLotId, setSelectedLotId] = useState<number | null>(null);
  const [search, setSearch] = useState(initialState.search);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialState.selectedCategory);
  const [selectedVariety, setSelectedVariety] = useState<string>(initialState.selectedVariety);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(initialState.dateRange);
  const [sortBy, setSortBy] = useState<string>("sowingDate-desc");

  const [editingLot, setEditingLot] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(initialState.currentPage);

  // Persist state changes
  useEffect(() => {
    const stateToSave = {
      search,
      selectedCategory,
      selectedVariety,
      dateRange,
      currentPage
    };
    localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(stateToSave));
  }, [search, selectedCategory, selectedVariety, dateRange, currentPage]);

  const handleClearFilters = () => {
    setSearch("");
    setSelectedCategory("all");
    setSelectedVariety("all");
    setDateRange({
      from: subDays(new Date(), 15),
      to: new Date(),
    });
    setCurrentPage(1);
  };
  const PAGE_SIZE = 15;

  const filteredLotsList = lots?.filter(l => {
    const matchesSearch = search === "" || search === "all-lots" || 
      l.lotNumber.toLowerCase().includes(search.toLowerCase()) ||
      l.variety?.name.toLowerCase().includes(search.toLowerCase()) ||
      l.category?.name.toLowerCase().includes(search.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || l.categoryId.toString() === selectedCategory;
    
    // Fix: Respect the selected variety filter when explicitly selected
    const matchesVariety = selectedVariety === "all" || l.varietyId.toString() === selectedVariety;

    const matchesDate = true;
    if (dateRange?.from) {
      const sowingDate = parseISO(l.sowingDate);
      const start = startOfDay(dateRange.from);
      const matchesFrom = isAfter(sowingDate, start) || sowingDate.getTime() === start.getTime();
      
      let matchesTo = true;
      if (dateRange.to) {
        const end = endOfDay(dateRange.to);
        matchesTo = isBefore(sowingDate, end) || sowingDate.getTime() === end.getTime();
      }
      return matchesSearch && matchesCategory && matchesVariety && matchesFrom && matchesTo;
    }

    return matchesSearch && matchesCategory && matchesVariety && matchesDate;
  }) || [];

  const sortedLots = useMemo(() => {
    return [...filteredLotsList].sort((a, b) => {
      if (sortBy === "sowingDate-desc") {
        return new Date(b.sowingDate).getTime() - new Date(a.sowingDate).getTime();
      }
      if (sortBy === "sowingDate-asc") {
        return new Date(a.sowingDate).getTime() - new Date(b.sowingDate).getTime();
      }
      if (sortBy === "lotNumber-asc") {
        return a.lotNumber.localeCompare(b.lotNumber);
      }
      if (sortBy === "lotNumber-desc") {
        return b.lotNumber.localeCompare(a.lotNumber);
      }
      return 0;
    });
  }, [filteredLotsList, sortBy]);

  const totalPages = Math.ceil(sortedLots.length / PAGE_SIZE);
  const paginatedLots = sortedLots.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

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

  const [availableSeedLots, setAvailableSeedLots] = useState<any[]>([]);
  const [loadingSeedLots, setLoadingSeedLots] = useState(false);

  const selectedCategoryId = form.watch("categoryId");
  const selectedVarietyId = form.watch("varietyId");

  useEffect(() => {
    if (selectedCategoryId && selectedVarietyId) {
      setLoadingSeedLots(true);
      fetch(`/api/seed-inward/lots?categoryId=${selectedCategoryId}&varietyId=${selectedVarietyId}`)
        .then(res => res.json())
        .then(data => {
          setAvailableSeedLots(data);
          setLoadingSeedLots(false);
        })
        .catch(err => {
          console.error("Error fetching seed lots:", err);
          setLoadingSeedLots(false);
        });
    } else {
      setAvailableSeedLots([]);
    }
  }, [selectedCategoryId, selectedVarietyId]);

  const handleEdit = (lot: any) => {
    setEditingLot(lot);
    form.reset({
      categoryId: lot.categoryId.toString(),
      varietyId: lot.varietyId.toString(),
      lotNumber: lot.lotNumber,
      seedsSown: lot.seedsSown,
      packetsSown: lot.packetsSown || 0,
      damagePercentage: lot.damagePercentage ? parseFloat(lot.damagePercentage) : 0,
      sowingDate: new Date(lot.sowingDate),
      expectedReadyDate: lot.expectedReadyDate ? new Date(lot.expectedReadyDate) : undefined,
      remarks: lot.remarks || "",
    });
    setOpen(true);
  };

  const resetForm = () => {
    setEditingLot(null);
    form.reset({
      categoryId: "",
      varietyId: "",
      lotNumber: "",
      seedsSown: 0,
      packetsSown: 0,
      damagePercentage: 0,
      sowingDate: new Date(),
      remarks: "",
    });
  };

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
  const filteredVarieties = varieties?.filter(v => v.categoryId.toString() === selectedCategoryId && v.active);

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const damageQty = Math.floor((data.seedsSown * (data.damagePercentage || 0)) / 100);
    const payload = {
      ...data,
      categoryId: Number(data.categoryId),
      varietyId: Number(data.varietyId),
      seedsSown: Number(data.seedsSown),
      packetsSown: Number(data.packetsSown || 0),
      damaged: damageQty,
      damagePercentage: data.damagePercentage?.toString() || "0.00",
      sowingDate: format(data.sowingDate, "yyyy-MM-dd"),
      expectedReadyDate: data.expectedReadyDate ? format(data.expectedReadyDate, "yyyy-MM-dd") : undefined,
    };
    
    if (editingLot) {
      setOpen(false); 
      update({ id: editingLot.id, ...payload }, { 
        onSuccess: () => { 
          resetForm(); 
          toast({ title: "Success", description: "Lot updated successfully" });
        },
        onError: (error: any) => {
          setOpen(true);
          toast({ 
            title: "Error", 
            description: error.message || "Failed to update lot",
            variant: "destructive"
          });
        }
      });
    } else {
      setOpen(false);
      create(payload, { 
        onSuccess: () => { 
          resetForm();
          toast({ title: "Success", description: "Lot created successfully" });
        },
        onError: (error: any) => {
          setOpen(true);
          toast({ 
            title: "Error", 
            description: error.message || "Failed to create lot",
            variant: "destructive"
          });
        }
      });
    }
  };
  
  const onSubmitDamage = (data: z.infer<typeof damageSchema>) => {
    if (selectedLotId) {
      const lot = lots?.find(l => l.id === selectedLotId);
      if (lot) {
        // Check if new total damage exceeds sown quantity
        const newDamage = lot.damaged + data.damaged;
        if (newDamage > lot.seedsSown) {
          damageForm.setError("damaged", {
            type: "manual",
            message: `Total damage (${newDamage}) cannot exceed sown quantity (${lot.seedsSown})`
          });
          return;
        }

        update({ id: selectedLotId, damaged: newDamage }, { 
          onSuccess: () => { 
            setDamageDialogOpen(false); 
            damageForm.reset(); 
            setSelectedLotId(null); 
            toast({
              title: "Success",
              description: "Damage recorded successfully",
            });
          } 
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
          <h1 className="text-3xl font-display font-bold">Lots & Stock ({filteredLotsList.length})</h1>
          <p className="text-muted-foreground">Monitor sowing lots, stock availability, and damages.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Input 
            placeholder="Search lot no, variety, category..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64"
          />
          <Dialog open={open} onOpenChange={(v) => {
            setOpen(v);
            if (!v) {
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-lg shadow-primary/20">
                <Plus className="w-5 h-5 mr-2" /> New Sowing Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingLot ? "Edit Sowing Lot" : "New Sowing Lot Entry"}</DialogTitle>
                <DialogDescription>
                  {editingLot ? "Update details for this sowing batch." : "Record a new batch of seeds sown in the nursery."}
                </DialogDescription>
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
                          <FormLabel>Category <span className="text-destructive">*</span></FormLabel>
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
                          <FormLabel>Variety <span className="text-destructive">*</span></FormLabel>
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
                          <FormLabel>Lot Number <span className="text-destructive">*</span></FormLabel>
                          <div className="relative">
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value} 
                              disabled={!selectedCategoryId || !selectedVarietyId || loadingSeedLots}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={loadingSeedLots ? "Loading lots..." : "Select Lot Number"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {availableSeedLots.length > 0 ? (
                                  availableSeedLots.map(lot => (
                                    <SelectItem key={lot.id} value={lot.lotNumber}>
                                      {lot.lotNumber} ({lot.availableQuantity} available)
                                    </SelectItem>
                                  ))
                                ) : (
                                  editingLot && availableSeedLots.find(l => l.lotNumber === editingLot.lotNumber) ? null : (
                                    editingLot ? (
                                      <SelectItem value={editingLot.lotNumber}>{editingLot.lotNumber}</SelectItem>
                                    ) : (
                                      <div className="p-2 text-sm text-muted-foreground text-center">
                                        No lots available for selected category & variety
                                      </div>
                                    )
                                  )
                                )}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-8 top-0 h-9 w-9 text-muted-foreground hover:text-primary"
                              onClick={() => {
                                const newLot = prompt("Enter custom lot number:");
                                if (newLot) field.onChange(newLot);
                              }}
                              title="Enter custom lot number"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </div>
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
                          <FormLabel>Seeds Sown Quantity <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Packets Sown */}
                    <FormField
                      control={form.control}
                      name="packetsSown"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Packets Sown</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Damage Percentage */}
                    <FormField
                      control={form.control}
                      name="damagePercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Damage Percentage (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="0.00"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                          {form.watch("seedsSown") > 0 && field.value > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Calculated Damage Qty: {Math.floor((form.watch("seedsSown") * field.value) / 100)}
                            </p>
                          )}
                        </FormItem>
                      )}
                    />

                    {/* Sowing Date */}
                    <FormField
                      control={form.control}
                      name="sowingDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Sowing Date <span className="text-destructive">*</span></FormLabel>
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

                  <Button type="submit" className="w-full" disabled={creating || updating}>
                    {editingLot ? "Update Lot Entry" : "Save Lot Entry"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 p-4 bg-muted/30 rounded-xl border border-border/50 relative">
        <Button 
          variant="ghost" 
          size="sm" 
          className="absolute -top-3 right-4 bg-background border h-7 text-[10px] font-bold uppercase hover:bg-destructive hover:text-destructive-foreground transition-colors z-10"
          onClick={handleClearFilters}
        >
          Clear Filters
        </Button>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Category Filter</label>
          <Select value={selectedCategory} onValueChange={(val) => {
            setSelectedCategory(val);
            setSelectedVariety("all");
          }}>
            <SelectTrigger className="bg-background h-12">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2 py-1">
                  <CheckCircle className="w-6 h-6 text-muted-foreground/40" />
                  <span className="font-medium">All Categories</span>
                </div>
              </SelectItem>
              {categories?.filter(c => c.active).map(c => (
                <SelectItem key={c.id} value={c.id.toString()}>
                  <div className="flex items-center gap-2 py-1">
                    {c.image ? (
                      <img src={c.image} className="w-8 h-8 rounded-md object-cover border" alt="" />
                    ) : (
                      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center border">
                        <Layers className="w-4 h-4 text-muted-foreground/30" />
                      </div>
                    )}
                    <span className="font-medium">{c.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Variety Filter</label>
          <Select value={selectedVariety} onValueChange={setSelectedVariety} disabled={selectedCategory === "all"}>
            <SelectTrigger className="bg-background h-12">
              <SelectValue placeholder="All Varieties" />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              <SelectItem value="all">All Varieties</SelectItem>
              {varieties?.filter(v => (selectedCategory === "all" || v.categoryId.toString() === selectedCategory) && v.active).map(v => (
                <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Lot Filter</label>
          <Select value={search} onValueChange={setSearch}>
            <SelectTrigger className="bg-background h-12">
              <SelectValue placeholder="All Lots" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-lots">All Lots</SelectItem>
              {lots?.filter(l => {
                const matchesCategory = selectedCategory === "all" || l.categoryId.toString() === selectedCategory;
                const matchesVariety = selectedVariety === "all" || l.varietyId.toString() === selectedVariety;
                return matchesCategory && matchesVariety;
              }).map(l => (
                <SelectItem key={l.id} value={l.lotNumber}>{l.lotNumber}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">From Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`w-full h-12 justify-start text-left font-normal bg-background ${!dateRange?.from && "text-muted-foreground"}`}
              >
                <CalendarDays className="mr-2 h-4 w-4 opacity-50" />
                {dateRange?.from ? format(dateRange.from, "LLL dd, y") : <span>From Date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange?.from}
                onSelect={(date) => setDateRange((prev: DateRange | undefined) => ({ from: date, to: prev?.to }))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">To Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`w-full h-12 justify-start text-left font-normal bg-background ${!dateRange?.to && "text-muted-foreground"}`}
              >
                <CalendarDays className="mr-2 h-4 w-4 opacity-50" />
                {dateRange?.to ? format(dateRange.to, "LLL dd, y") : <span>To Date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange?.to}
                onSelect={(date) => setDateRange((prev: DateRange | undefined) => ({ from: prev?.from || new Date(), to: date }))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Sort By</label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="bg-background h-12">
              <SelectValue placeholder="Sort order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sowingDate-desc">Sowing Date (Newest)</SelectItem>
              <SelectItem value="sowingDate-asc">Sowing Date (Oldest)</SelectItem>
              <SelectItem value="lotNumber-asc">Lot Number (A-Z)</SelectItem>
              <SelectItem value="lotNumber-desc">Lot Number (Z-A)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Damage Update Dialog */}
      <Dialog open={damageDialogOpen} onOpenChange={setDamageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Damage / Loss</DialogTitle>
            <DialogDescription>
              Record any plant losses or damage for this specific lot.
            </DialogDescription>
            {(() => {
              const lot = lots?.find(l => l.id === selectedLotId);
              if (lot) {
                return (
                  <div className="flex flex-col gap-1 mt-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Lot Number:</span>
                      <span className="font-mono font-medium">{lot.lotNumber}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Sown Quantity:</span>
                      <span className="font-semibold">{lot.seedsSown}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Current Damage:</span>
                      <span className="text-destructive font-medium">{lot.damaged}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-border/50 pt-1 mt-1">
                      <span className="text-muted-foreground">Available Stock:</span>
                      <span className="text-primary font-bold">{lot.available}</span>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
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
                      <Input 
                        type="number" 
                        {...field} 
                        max={(() => {
                          const lot = lots?.find(l => l.id === selectedLotId);
                          return lot ? lot.seedsSown - lot.damaged : undefined;
                        })()}
                      />
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

      <div className="hidden md:block rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Lot No</TableHead>
              <TableHead>Variety</TableHead>
              <TableHead>Sowing Date</TableHead>
              <TableHead>Ready Date</TableHead>
              <TableHead className="text-right">Sown</TableHead>
              <TableHead className="text-right">Packets</TableHead>
              <TableHead className="text-right text-destructive">Damaged</TableHead>
              <TableHead className="text-right text-primary font-bold">Available</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="h-24 text-center">Loading lots...</TableCell></TableRow>
            ) : filteredLotsList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Sprout className="w-8 h-8 opacity-20" />
                    No lots found.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedLots.map((lot) => {
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
                    <TableCell>
                      <span className="font-medium text-amber-600">{lot.expectedReadyDate || "-"}</span>
                    </TableCell>
                    <TableCell className="text-right">{lot.seedsSown}</TableCell>
                    <TableCell className="text-right font-medium text-muted-foreground">{lot.packetsSown || "-"}</TableCell>
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
                          size="icon" 
                          className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-all"
                          onClick={() => handleEdit(lot)}
                          title="Edit Lot"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          onClick={() => openDamageDialog(lot.id)}
                          title="Record Damage"
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button data-testid={`button-delete-lot-${lot.id}`} variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive transition-colors">
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

        <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalRecords={filteredLotsList.length}
          pageSize={PAGE_SIZE}
        />
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-4">
        {isLoading ? (
          <p className="text-center py-4">Loading lots...</p>
        ) : filteredLotsList.length === 0 ? (
          <p className="text-center py-4 text-muted-foreground">No lots found.</p>
        ) : (
          paginatedLots.map((lot) => {
            const isLowStock = lot.available < (lot.seedsSown * 0.1);
            return (
              <div key={lot.id} className="bg-card border rounded-lg p-4 space-y-3 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold font-mono">{lot.lotNumber}</h3>
                    <p className="text-sm font-medium">{lot.variety?.name || "Unknown Variety"}</p>
                    <p className="text-xs text-muted-foreground">{lot.category?.name || "Unknown Category"}</p>
                  </div>
                  {lot.available === 0 ? (
                    <Badge variant="outline">Empty</Badge>
                  ) : isLowStock ? (
                    <Badge variant="destructive">Low Stock</Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-green-100 text-green-700">Available</Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Sowing Date</p>
                    <p>{lot.sowingDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground text-xs">Ready Date</p>
                    <p className="font-medium text-amber-600">{lot.expectedReadyDate || "Not Set"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Sown Quantity</p>
                    <p>{lot.seedsSown} ({lot.packetsSown || 0} pkts)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground text-xs">Available Stock</p>
                    <p className="font-bold text-primary text-lg">{lot.available}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs">Damaged</p>
                    <p className="text-destructive">{lot.damaged || 0}</p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-destructive border-destructive/20 hover:bg-destructive/5"
                    onClick={() => openDamageDialog(lot.id)}
                  >
                    <AlertTriangle className="w-4 h-4 mr-1" /> Damage
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Lot</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this lot?
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
              </div>
            );
          })
        )}

        {filteredLotsList.length > 0 && (
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalRecords={filteredLotsList.length}
            pageSize={PAGE_SIZE}
          />
        )}
      </div>
    </div>
  );
}
