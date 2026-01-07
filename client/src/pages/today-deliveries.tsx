import { useState, useMemo, useEffect } from "react";
import { useOrders } from "@/hooks/use-orders";
import { useLots } from "@/hooks/use-lots";
import { useVarieties } from "@/hooks/use-varieties";
import { useCategories } from "@/hooks/use-categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, isSameDay, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, ShoppingCart, CheckCircle, Clock, Calendar as CalendarIcon, Layers, Loader2, ChevronsUpDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useUpdateOrder } from "@/hooks/use-orders";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import confetti from "canvas-confetti";

export default function TodayDeliveriesPage() {
  const { toast } = useToast();
  const { data: orders, isLoading } = useOrders();
  const { data: lots } = useLots();
  const { data: varieties } = useVarieties();
  const { data: categories } = useCategories();
  const { mutate: update } = useUpdateOrder();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [pageCategoryId, setPageCategoryId] = useState<string>("all");
  const [pageVarietyId, setPageVarietyId] = useState<string>("all");
  const [pageLotId, setPageLotId] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Search states for dropdowns
  const [categorySearch, setCategorySearch] = useState("");
  const [varietySearch, setVarietySearch] = useState("");
  const [lotSearch, setLotSearch] = useState("");

  const sortedCategories = useMemo(() => {
    if (!categories) return [];
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  const filteredCategoriesDropdown = useMemo(() => {
    if (!sortedCategories) return [];
    return sortedCategories.filter(c => 
      c.name.toLowerCase().includes(categorySearch.toLowerCase())
    );
  }, [sortedCategories, categorySearch]);

  const filteredVarietiesPage = varieties?.filter(v => 
    pageCategoryId === "all" || v.categoryId.toString() === pageCategoryId
  );

  const filteredVarietiesDropdown = useMemo(() => {
    if (!filteredVarietiesPage) return [];
    return filteredVarietiesPage.filter(v => 
      v.name.toLowerCase().includes(varietySearch.toLowerCase())
    );
  }, [filteredVarietiesPage, varietySearch]);

  const filteredLotsPage = lots?.filter(l => 
    (pageCategoryId === "all" || l.categoryId.toString() === pageCategoryId) &&
    (pageVarietyId === "all" || l.varietyId.toString() === pageVarietyId)
  );

  const filteredLotsDropdown = useMemo(() => {
    if (!filteredLotsPage) return [];
    return filteredLotsPage.filter(l => 
      l.lotNumber.toLowerCase().includes(lotSearch.toLowerCase())
    );
  }, [filteredLotsPage, lotSearch]);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    
    return orders.filter(order => {
      try {
        const deliveryDate = parseISO(order.deliveryDate);
        const matchesDate = isSameDay(deliveryDate, selectedDate) && order.status === "BOOKED";
        if (!matchesDate) return false;

        // If any filter is set to something other than "all", apply it
        if (pageCategoryId !== "all") {
          const lot = lots?.find(l => l.id === order.lotId);
          if (lot?.categoryId.toString() !== pageCategoryId) return false;
        }

        if (pageVarietyId !== "all") {
          const lot = lots?.find(l => l.id === order.lotId);
          if (lot?.varietyId.toString() !== pageVarietyId) return false;
        }

        if (pageLotId !== "all") {
          if (order.lotId.toString() !== pageLotId) return false;
        }

        return true;
      } catch (e) {
        return false;
      }
    });
  }, [orders, selectedDate, lots, pageLotId, pageVarietyId, pageCategoryId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, pageCategoryId, pageVarietyId, pageLotId]);

  const totalPages = Math.ceil(filteredOrders.length / 25);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * 25,
    currentPage * 25
  );

  const markDelivered = (id: number) => {
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
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-12 w-full md:w-[280px]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">
            {isSameDay(selectedDate, new Date()) ? "Today's Deliveries" : "Scheduled Deliveries"}
          </h1>
          <p className="text-muted-foreground">
            Orders for {format(selectedDate, "eeee, dd MMMM yyyy")}.
          </p>
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full md:w-[280px] justify-start text-left font-normal h-12 text-lg border-primary/20 hover:bg-primary/5",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-5 w-5" />
              {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <Card className="bg-muted/30 border-none shadow-none">
        <CardContent className="p-4 flex flex-wrap gap-4 items-end">
          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Category Filter</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between h-11 bg-background border-muted-foreground/20 font-normal"
                >
                  <div className="flex items-center gap-3 truncate">
                    {pageCategoryId === "all" ? (
                      <span className="font-bold text-primary">All Categories</span>
                    ) : (
                      <>
                        {categories?.find(c => c.id.toString() === pageCategoryId)?.image ? (
                          <img 
                            src={categories.find(c => c.id.toString() === pageCategoryId)?.image ?? ""} 
                            className="w-6 h-6 rounded-sm object-cover border" 
                            alt="" 
                          />
                        ) : (
                          <Layers className="w-4 h-4 text-muted-foreground/40" />
                        )}
                        <span className="font-semibold text-base">
                          {categories?.find(c => c.id.toString() === pageCategoryId)?.name}
                        </span>
                      </>
                    )}
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Search category..." 
                    onValueChange={setCategorySearch}
                  />
                  <CommandList className="max-h-[300px] overflow-y-auto">
                    <CommandEmpty>No category found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          setPageCategoryId("all");
                          setPageVarietyId("all");
                          setPageLotId("all");
                        }}
                        className="flex items-center gap-3 py-2 cursor-pointer"
                      >
                        <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center border border-primary/20">
                          <Layers className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-bold text-primary">All Categories</span>
                        {pageCategoryId === "all" && <Check className="ml-auto h-4 w-4 text-primary" />}
                      </CommandItem>
                      {filteredCategoriesDropdown.map(c => (
                        <CommandItem
                          key={c.id}
                          value={c.name}
                          onSelect={() => {
                            setPageCategoryId(c.id.toString());
                            setPageVarietyId("all");
                            setPageLotId("all");
                          }}
                          className="flex items-center gap-3 py-2 cursor-pointer"
                        >
                          {c.image ? (
                            <img src={c.image} className="w-10 h-10 rounded-md object-cover border" alt="" />
                          ) : (
                            <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center border">
                              <Layers className="w-5 h-5 text-muted-foreground/40" />
                            </div>
                          )}
                          <span className="font-semibold text-base">{c.name}</span>
                          {pageCategoryId === c.id.toString() && <Check className="ml-auto h-4 w-4 text-primary" />}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Variety Filter</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  disabled={pageCategoryId === "all"}
                  className="w-full justify-between h-11 bg-background border-muted-foreground/20 font-normal disabled:opacity-50"
                >
                  <span className="truncate">
                    {pageVarietyId === "all" ? (
                      <span className="font-bold">All Varieties</span>
                    ) : (
                      <span className="font-semibold">
                        {varieties?.find(v => v.id.toString() === pageVarietyId)?.name}
                      </span>
                    )}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Search variety..." 
                    onValueChange={setVarietySearch}
                  />
                  <CommandList className="max-h-[300px] overflow-y-auto">
                    <CommandEmpty>No variety found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          setPageVarietyId("all");
                          setPageLotId("all");
                        }}
                        className="flex items-center gap-3 py-2 cursor-pointer"
                      >
                        <span className="font-bold">All Varieties</span>
                        {pageVarietyId === "all" && <Check className="ml-auto h-4 w-4 text-primary" />}
                      </CommandItem>
                      {filteredVarietiesDropdown.map(v => (
                        <CommandItem
                          key={v.id}
                          value={v.name}
                          onSelect={() => {
                            setPageVarietyId(v.id.toString());
                            setPageLotId("all");
                          }}
                          className="flex items-center gap-3 py-2 cursor-pointer"
                        >
                          <span className="font-semibold">{v.name}</span>
                          {pageVarietyId === v.id.toString() && <Check className="ml-auto h-4 w-4 text-primary" />}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Lot Filter</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  disabled={pageVarietyId === "all"}
                  className="w-full justify-between h-11 bg-background border-muted-foreground/20 font-normal disabled:opacity-50"
                >
                  <span className="truncate">
                    {pageLotId === "all" ? (
                      <span className="font-bold">All Lots</span>
                    ) : (
                      <span className="font-semibold">
                        {lots?.find(l => l.id.toString() === pageLotId)?.lotNumber}
                      </span>
                    )}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Search lot..." 
                    onValueChange={setLotSearch}
                  />
                  <CommandList className="max-h-[300px] overflow-y-auto">
                    <CommandEmpty>No lot found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          setPageLotId("all");
                        }}
                        className="flex items-center gap-3 py-2 cursor-pointer"
                      >
                        <span className="font-bold">All Lots</span>
                        {pageLotId === "all" && <Check className="ml-auto h-4 w-4 text-primary" />}
                      </CommandItem>
                      {filteredLotsDropdown.map(l => (
                        <CommandItem
                          key={l.id}
                          value={l.lotNumber}
                          onSelect={() => {
                            setPageLotId(l.id.toString());
                          }}
                          className="flex items-center gap-3 py-2 cursor-pointer"
                        >
                          <span className="font-semibold font-mono">{l.lotNumber}</span>
                          {pageLotId === l.id.toString() && <Check className="ml-auto h-4 w-4 text-primary" />}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" /> Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-primary">{filteredOrders.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="hidden md:block rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Plant Details</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Advance</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <CalendarIcon className="w-8 h-8 opacity-20" />
                    No deliveries scheduled for this date.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedOrders.map((order) => {
                const lot = lots?.find(l => l.id === order.lotId);
                const variety = varieties?.find(v => v.id === lot?.varietyId);
                const category = categories?.find(c => c.id === lot?.categoryId);

                return (
                  <TableRow key={order.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="font-bold">{order.customerName}</div>
                      <div className="text-xs text-muted-foreground font-mono">{order.phone}</div>
                      {order.village && <div className="text-[10px] text-muted-foreground italic truncate">({order.village})</div>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {category?.image ? (
                          <img src={category.image} className="w-10 h-10 rounded-md object-cover border" alt="" />
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center border">
                            <Layers className="w-5 h-5 text-muted-foreground/30" />
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-sm block leading-tight">{variety?.name}</span>
                          <p className="text-[10px] text-muted-foreground uppercase font-mono">{lot?.lotNumber}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-black text-primary text-lg">{order.bookedQty}</TableCell>
                    <TableCell className="text-right">
                      <div className="font-bold">₹{order.advanceAmount}</div>
                      <div className="text-[9px] uppercase font-bold text-muted-foreground">{order.paymentMode}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                        onClick={() => markDelivered(order.id)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1.5" /> Delivered
                      </Button>
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
            Showing <span className="font-medium">{(currentPage - 1) * 25 + 1}</span> to{" "}
            <span className="font-medium">
              {Math.min(currentPage * 25, filteredOrders.length)}
            </span> of{" "}
            <span className="font-medium">{filteredOrders.length}</span> results
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
        {filteredOrders.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground italic bg-muted/20 rounded-lg border-2 border-dashed">
            No deliveries scheduled for this date.
          </div>
        ) : (
          paginatedOrders.map((order) => {
            const lot = lots?.find(l => l.id === order.lotId);
            const variety = varieties?.find(v => v.id === lot?.varietyId);
            const category = categories?.find(c => c.id === lot?.categoryId);

            return (
              <Card key={order.id} className="overflow-hidden border-2 shadow-sm">
                <CardContent className="p-0">
                  <div className="p-3 bg-primary/5 flex justify-between items-center border-b">
                    <div>
                      <p className="font-black text-lg leading-tight">{order.customerName}</p>
                      <p className="text-sm font-mono text-muted-foreground">{order.phone}</p>
                    </div>
                    <Badge className="bg-primary text-white font-bold">
                      {isSameDay(selectedDate, new Date()) ? "TODAY" : format(selectedDate, "MMM dd")}
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
                        <p className="font-bold text-sm">{variety?.name}</p>
                        <p className="text-xs font-mono text-muted-foreground">{lot?.lotNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Qty</p>
                        <p className="font-black text-2xl text-primary">{order.bookedQty}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-dashed">
                       <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Advance</p>
                        <p className="font-bold">₹{order.advanceAmount} <span className="text-[9px] opacity-70">({order.paymentMode})</span></p>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => markDelivered(order.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 h-10 px-4 font-bold"
                      >
                        <CheckCircle className="w-4 h-4 mr-1.5" /> Deliver
                      </Button>
                    </div>
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

