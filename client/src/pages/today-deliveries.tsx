import { useState, useMemo, useEffect } from "react";
import { useOrders, useUpdateOrder } from "@/hooks/use-orders";
import { useLots } from "@/hooks/use-lots";
import { useVarieties } from "@/hooks/use-varieties";
import { useCategories } from "@/hooks/use-categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, isSameDay, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { InvoicePrint } from "@/components/invoice-print";
import { generateInvoice } from "@/lib/invoice";
import { useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  CheckCircle,
  Clock,
  Calendar as CalendarIcon,
  Layers,
  Loader2,
  ChevronsUpDown,
  Check,
  Printer,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const { data: ordersData, isLoading } = useOrders(1, 10000);
  const orders = useMemo(() => {
    if (!ordersData) return [];
    if (Array.isArray(ordersData)) return ordersData;
    if (ordersData && typeof ordersData === 'object' && 'orders' in ordersData) {
      return ordersData.orders;
    }
    return [];
  }, [ordersData]);
  
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
    return sortedCategories.filter((c) =>
      c.name.toLowerCase().includes(categorySearch.toLowerCase()),
    );
  }, [sortedCategories, categorySearch]);

  const filteredVarietiesPage = varieties?.filter(
    (v) =>
      pageCategoryId === "all" || v.categoryId.toString() === pageCategoryId,
  );

  const filteredVarietiesDropdown = useMemo(() => {
    if (!filteredVarietiesPage) return [];
    return filteredVarietiesPage.filter((v) =>
      v.name.toLowerCase().includes(varietySearch.toLowerCase()),
    );
  }, [filteredVarietiesPage, varietySearch]);

  const filteredLotsPage = lots?.filter(
    (l) =>
      (pageCategoryId === "all" ||
        l.categoryId.toString() === pageCategoryId) &&
      (pageVarietyId === "all" || l.varietyId.toString() === pageVarietyId),
  );

  const filteredLotsDropdown = useMemo(() => {
    if (!filteredLotsPage) return [];
    return filteredLotsPage.filter((l) =>
      l.lotNumber.toLowerCase().includes(lotSearch.toLowerCase()),
    );
  }, [filteredLotsPage, lotSearch]);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];

    return orders.filter((order: any) => {
      if (!order) return false;
      try {
        const deliveryDateStr = order.deliveryDate;
        if (!deliveryDateStr) return false;
        const deliveryDate = parseISO(deliveryDateStr);
        const matchesDate = isSameDay(deliveryDate, selectedDate);
        if (!matchesDate) return false;

        // Only show Booked and Delivered orders on the delivery schedule
        if (order.status !== "BOOKED" && order.status !== "DELIVERED")
          return false;

        // If any filter is set to something other than "all", apply it
        if (pageCategoryId !== "all") {
          const lot = lots?.find((l) => l.id === order.lotId);
          if (lot?.categoryId?.toString() !== pageCategoryId) return false;
        }

        if (pageVarietyId !== "all") {
          const lot = lots?.find((l) => l.id === order.lotId);
          if (lot?.varietyId?.toString() !== pageVarietyId) return false;
        }

        if (pageLotId !== "all") {
          if (order.lotId?.toString() !== pageLotId) return false;
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
    currentPage * 25,
  );

  const markDelivered = (id: number) => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#10b981", "#3b82f6", "#f59e0b"],
    });

    const now = new Date();
    update(
      {
        id,
        status: "DELIVERED",
        deliveredQty: 0,
        actualDeliveryDate: format(now, "yyyy-MM-dd"),
        actualDeliveryTime: format(now, "HH:mm:ss"),
      },
      {
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
        },
      },
    );
  };

  const undoDelivery = (id: number) => {
    update(
      { id, status: "BOOKED", deliveredQty: 0 },
      {
        onSuccess: () => {
          toast({
            title: "Undo Successful",
            description: "The order has been reverted to Booked status.",
          });
        },
        onError: (error: Error) => {
          toast({
            title: "Undo Failed",
            description: error.message,
            variant: "destructive",
          });
        },
      },
    );
  };

  const [printingOrder, setPrintingOrder] = useState<any>(null);

  const handlePrint = (order: any) => {
    setPrintingOrder(order);
    setTimeout(() => {
      window.print();
    }, 100);
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

  const totalQuantityToDeliver = useMemo(() => {
    return filteredOrders.reduce((sum: number, order: any) => sum + (order.bookedQty || 0), 0);
  }, [filteredOrders]);

  return (
    <div className="space-y-8">
      {printingOrder && <div id="invoice-print" className="hidden print:block"><InvoicePrint order={printingOrder} /></div>}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">
            {isSameDay(selectedDate, new Date())
              ? "Today's Deliveries"
              : "Scheduled Deliveries"}
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
                !selectedDate && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-5 w-5" />
              {selectedDate ? (
                format(selectedDate, "PPP")
              ) : (
                <span>Pick a date</span>
              )}
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
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Category Filter
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between h-11 bg-background border-muted-foreground/20 font-normal"
                >
                  <div className="flex items-center gap-3 truncate">
                    {pageCategoryId === "all" ? (
                      <span className="font-bold text-primary">
                        All Categories
                      </span>
                    ) : (
                      <>
                        {categories?.find(
                          (c) => c.id.toString() === pageCategoryId,
                        )?.image ? (
                          <img
                            src={
                              categories?.find(
                                (c) => c.id.toString() === pageCategoryId,
                              )?.image ?? ""
                            }
                            className="w-6 h-6 rounded-sm object-cover border"
                            alt=""
                          />
                        ) : (
                          <Layers className="w-4 h-4 text-muted-foreground/40" />
                        )}
                        <span className="font-semibold text-base">
                          {
                            categories?.find(
                              (c) => c.id.toString() === pageCategoryId,
                            )?.name
                          }
                        </span>
                      </>
                    )}
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
              >
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
                        <span className="font-bold text-primary">
                          All Categories
                        </span>
                        {pageCategoryId === "all" && (
                          <Check className="ml-auto h-4 w-4 text-primary" />
                        )}
                      </CommandItem>
                      {filteredCategoriesDropdown.map((c) => (
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
                            <img
                              src={c.image}
                              className="w-10 h-10 rounded-md object-cover border"
                              alt=""
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center border">
                              <Layers className="w-5 h-5 text-muted-foreground/40" />
                            </div>
                          )}
                          <span className="font-semibold text-base">
                            {c.name}
                          </span>
                          {pageCategoryId === c.id.toString() && (
                            <Check className="ml-auto h-4 w-4 text-primary" />
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Variety Filter
            </label>
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
                        {
                          varieties?.find(
                            (v) => v.id.toString() === pageVarietyId,
                          )?.name
                        }
                      </span>
                    )}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
              >
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
                        {pageVarietyId === "all" && (
                          <Check className="ml-auto h-4 w-4 text-primary" />
                        )}
                      </CommandItem>
                      {filteredVarietiesDropdown.map((v) => (
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
                          {pageVarietyId === v.id.toString() && (
                            <Check className="ml-auto h-4 w-4 text-primary" />
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Lot Filter
            </label>
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
                        {
                          lots?.find((l) => l.id.toString() === pageLotId)
                            ?.lotNumber
                        }
                      </span>
                    )}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
              >
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
                        {pageLotId === "all" && (
                          <Check className="ml-auto h-4 w-4 text-primary" />
                        )}
                      </CommandItem>
                      {filteredLotsDropdown.map((l) => (
                        <CommandItem
                          key={l.id}
                          value={l.lotNumber}
                          onSelect={() => {
                            setPageLotId(l.id.toString());
                          }}
                          className="flex items-center gap-3 py-2 cursor-pointer"
                        >
                          <span className="font-semibold font-mono">
                            {l.lotNumber}
                          </span>
                          {pageLotId === l.id.toString() && (
                            <Check className="ml-auto h-4 w-4 text-primary" />
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {(pageCategoryId !== "all" ||
            pageVarietyId !== "all" ||
            pageLotId !== "all") && (
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
            <div className="text-4xl font-black text-primary">
              {filteredOrders.length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50/50 border-emerald-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Total Quantity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-emerald-600">
              {totalQuantityToDeliver.toLocaleString()}
            </div>
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
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Adv/Bal</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-32 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <CalendarIcon className="w-8 h-8 opacity-20" />
                    No deliveries scheduled for this date.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedOrders.map((order: any) => {
                const lot = lots?.find((l) => l.id === order.lotId);
                const variety = varieties?.find((v) => v.id === lot?.varietyId);
                const category = categories?.find(
                  (c) => c.id === lot?.categoryId,
                );

                return (
                  <TableRow key={order.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground">
                          {order.customerName}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {order.phone}
                        </span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          {order.village}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {category?.image ? (
                          <img
                            src={category.image}
                            className="w-10 h-10 rounded-lg object-cover border shadow-sm"
                            alt=""
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center border">
                            <Layers className="w-5 h-5 text-muted-foreground/40" />
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-bold text-sm">
                            {category?.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {variety?.name}
                          </span>
                          <span className="text-[10px] font-mono bg-muted px-1 rounded self-start mt-0.5">
                            {lot?.lotNumber}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-black text-primary">
                      {order.bookedQty}
                    </TableCell>
                    <TableCell className="text-right font-medium text-muted-foreground">
                      ₹{order.perUnitPrice}
                    </TableCell>
                    <TableCell className="text-right font-black">
                      ₹{Number(order.totalAmount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                          ₹{Number(order.advanceAmount).toLocaleString()}
                        </span>
                        <span className="text-xs font-bold text-orange-600 mt-1">
                          ₹{Number(order.remainingBalance).toLocaleString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handlePrint(order)}
                        >
                          <Printer className="h-4 w-4 text-primary" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => generateInvoice(order)}
                        >
                          <FileSpreadsheet className="h-4 w-4 text-green-600" />
                        </Button>
                        {order.status === "DELIVERED" ? (
                          <div className="flex items-center justify-end gap-2">
                            <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
                              <CheckCircle className="w-3 h-3 mr-1" /> Delivered
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => undoDelivery(order.id)}
                              className="h-8 text-[10px] uppercase font-bold text-muted-foreground hover:text-destructive"
                            >
                              Undo
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => markDelivered(order.id)}
                            className="bg-green-600 hover:bg-green-700 shadow-sm font-bold h-8"
                          >
                            Mark Delivered
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
            <CalendarIcon className="w-8 h-8 opacity-20 mb-2" />
            No deliveries scheduled.
          </div>
        ) : (
          paginatedOrders.map((order: any) => {
            const lot = lots?.find((l) => l.id === order.lotId);
            const variety = varieties?.find((v) => v.id === lot?.varietyId);
            const category = categories?.find((c) => c.id === lot?.categoryId);

            return (
              <Card key={order.id} className="overflow-hidden border-2">
                <CardContent className="p-0">
                  <div className="p-4 bg-muted/10 border-b flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {category?.image && (
                        <img
                          src={category.image}
                          className="w-10 h-10 rounded-md object-cover border shadow-sm"
                          alt=""
                        />
                      )}
                      <div>
                        <p className="font-bold text-sm leading-tight">
                          {order.customerName}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {order.phone}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-background font-mono">
                      #{order.id}
                    </Badge>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                          Plant Details
                        </p>
                        <p className="text-sm font-bold">{category?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {variety?.name}
                        </p>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                          Quantity
                        </p>
                        <p className="text-lg font-black text-primary">
                          {order.bookedQty}
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                          Balance
                        </span>
                        <span className="text-sm font-black text-orange-600">
                          ₹{Number(order.remainingBalance).toLocaleString()}
                        </span>
                      </div>
                      {order.status === "DELIVERED" ? (
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-100 text-green-700 border-green-200">
                            Delivered
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => undoDelivery(order.id)}
                            className="h-8 text-[10px] font-bold text-muted-foreground"
                          >
                            Undo
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => markDelivered(order.id)}
                          className="bg-green-600 hover:bg-green-700 font-bold"
                        >
                          Deliver Now
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-center space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        <div className="text-sm font-medium">
          Page {currentPage} of {totalPages || 1}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage >= totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
