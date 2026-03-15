import { useState, useMemo, useEffect } from "react";
import { useOrders, useUpdateOrder } from "@/hooks/use-orders";
import { useLots } from "@/hooks/use-lots";
import { useVarieties } from "@/hooks/use-varieties";
import { useCategories } from "@/hooks/use-categories";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, isSameDay, parseISO, addDays, subDays } from "date-fns";
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
  Printer,
  FileSpreadsheet,
  Package,
  TrendingUp,
  Wallet,
  AlertCircle,
  Filter,
  Truck,
  IndianRupee,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import confetti from "canvas-confetti";

export default function TodayDeliveriesPage() {
  const { toast } = useToast();
  const { data: ordersData, isLoading } = useOrders(1, 10000);
  const orders = useMemo(() => {
    if (!ordersData) return [];
    if (Array.isArray(ordersData)) return ordersData;
    if (ordersData && typeof ordersData === "object" && "orders" in ordersData) {
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

  const filteredVarietiesPage = varieties?.filter(
    (v) =>
      pageCategoryId === "all" || v.categoryId.toString() === pageCategoryId,
  );

  const filteredLotsPage = lots?.filter(
    (l) =>
      (pageCategoryId === "all" ||
        l.categoryId.toString() === pageCategoryId) &&
      (pageVarietyId === "all" || l.varietyId.toString() === pageVarietyId),
  );

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter((order: any) => {
      if (!order) return false;
      try {
        const deliveryDateStr = order.deliveryDate;
        if (!deliveryDateStr) return false;
        const deliveryDate = parseISO(deliveryDateStr);
        if (!isSameDay(deliveryDate, selectedDate)) return false;
        if (order.status !== "BOOKED" && order.status !== "DELIVERED") return false;
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
      } catch {
        return false;
      }
    });
  }, [orders, selectedDate, lots, pageLotId, pageVarietyId, pageCategoryId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, pageCategoryId, pageVarietyId, pageLotId]);

  const ITEMS_PER_PAGE = 25;
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const deliveredOrders = useMemo(
    () => filteredOrders.filter((o: any) => o.status === "DELIVERED"),
    [filteredOrders],
  );
  const pendingOrders = useMemo(
    () => filteredOrders.filter((o: any) => o.status === "BOOKED"),
    [filteredOrders],
  );
  const deliveryProgress =
    filteredOrders.length > 0
      ? Math.round((deliveredOrders.length / filteredOrders.length) * 100)
      : 0;

  const totalQuantityToDeliver = useMemo(
    () =>
      filteredOrders.reduce(
        (sum: number, o: any) => sum + (Number(o.bookedQty) || 0),
        0,
      ),
    [filteredOrders],
  );
  const totalAmount = useMemo(
    () =>
      filteredOrders.reduce(
        (sum: number, o: any) => sum + (Number(o.totalAmount) || 0),
        0,
      ),
    [filteredOrders],
  );
  const totalPending = useMemo(
    () =>
      filteredOrders.reduce(
        (sum: number, o: any) => sum + (Number(o.remainingBalance) || 0),
        0,
      ),
    [filteredOrders],
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
        deliveredQty: "0",
        actualDeliveryDate: format(now, "yyyy-MM-dd"),
        actualDeliveryTime: format(now, "HH:mm:ss"),
      },
      {
        onSuccess: () => {
          toast({
            title: "Order Delivered",
            description: "Order successfully marked as delivered.",
          });
        },
        onError: (error: Error) => {
          toast({ title: "Update Failed", description: error.message, variant: "destructive" });
        },
      },
    );
  };

  const undoDelivery = (id: number) => {
    update(
      { id, status: "BOOKED", deliveredQty: "0" },
      {
        onSuccess: () => {
          toast({ title: "Undo Successful", description: "Order reverted to Booked." });
        },
        onError: (error: Error) => {
          toast({ title: "Undo Failed", description: error.message, variant: "destructive" });
        },
      },
    );
  };

  const [printingOrder, setPrintingOrder] = useState<any>(null);
  const handlePrint = (order: any) => {
    setPrintingOrder(order);
    setTimeout(() => window.print(), 100);
  };

  const isToday = isSameDay(selectedDate, new Date());
  const hasActiveFilters =
    pageCategoryId !== "all" || pageVarietyId !== "all" || pageLotId !== "all";

  if (isLoading) {
    return (
      <div className="space-y-6 px-4 md:px-8 py-6 animate-pulse">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-10 w-72" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4 md:px-8 py-6">
      {printingOrder && (
        <div id="invoice-print" className="hidden print:block">
          <InvoicePrint order={printingOrder} />
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Truck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight leading-none">
              {isToday ? "Today's Deliveries" : "Scheduled Deliveries"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {format(selectedDate, "eeee, dd MMMM yyyy")}
            </p>
          </div>
        </div>

        {/* Date navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => setSelectedDate((d) => subDays(d, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[200px] justify-start text-left font-normal h-9",
                  !selectedDate && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                {format(selectedDate, "dd MMM yyyy")}
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
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => setSelectedDate((d) => addDays(d, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isToday && (
            <Button
              variant="secondary"
              size="sm"
              className="h-9 text-xs font-semibold"
              onClick={() => setSelectedDate(new Date())}
            >
              Today
            </Button>
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground leading-none">{filteredOrders.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total Orders</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
              <Package className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground leading-none">{totalQuantityToDeliver.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total Qty</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <IndianRupee className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground leading-none">
                ₹{totalAmount >= 100000 ? `${(totalAmount / 100000).toFixed(1)}L` : totalAmount.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Total Amount</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground leading-none">
                ₹{totalPending >= 100000 ? `${(totalPending / 100000).toFixed(1)}L` : totalPending.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Pending Balance</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Delivery Progress ── */}
      {filteredOrders.length > 0 && (
        <div className="flex items-center gap-4 px-4 py-3 rounded-xl border bg-card">
          <div className="flex items-center gap-2 shrink-0">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-semibold text-green-700 dark:text-green-400">{deliveredOrders.length} delivered</span>
          </div>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${deliveryProgress}%` }}
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{pendingOrders.length} pending</span>
          </div>
          <span className="text-xs font-bold text-muted-foreground shrink-0">{deliveryProgress}%</span>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row items-end gap-3 p-4 rounded-xl border bg-card">
        <div className="flex items-center gap-2 text-muted-foreground shrink-0 mb-1 sm:mb-0">
          <Filter className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold uppercase tracking-wider">Filters</span>
        </div>
        <div className="flex flex-1 flex-col sm:flex-row gap-3 w-full">
          <div className="flex-1 min-w-[140px]">
            <Select
              value={pageCategoryId}
              onValueChange={(val) => {
                setPageCategoryId(val);
                setPageVarietyId("all");
                setPageLotId("all");
              }}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <Select
              value={pageVarietyId}
              onValueChange={(val) => {
                setPageVarietyId(val);
                setPageLotId("all");
              }}
              disabled={pageCategoryId === "all"}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All Varieties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Varieties</SelectItem>
                {filteredVarietiesPage?.map((v) => (
                  <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <Select
              value={pageLotId}
              onValueChange={setPageLotId}
              disabled={pageVarietyId === "all"}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All Lots" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Lots</SelectItem>
                {filteredLotsPage?.map((l) => (
                  <SelectItem key={l.id} value={l.id.toString()}>{l.lotNumber}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPageCategoryId("all");
                setPageVarietyId("all");
                setPageLotId("all");
              }}
              className="h-9 px-3 text-xs text-muted-foreground hover:text-destructive"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* ── Desktop Table ── */}
      <div className="hidden lg:block rounded-xl border bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="py-3 pl-5 text-xs font-bold uppercase tracking-wider w-8">#</TableHead>
              <TableHead className="py-3 text-xs font-bold uppercase tracking-wider">Customer</TableHead>
              <TableHead className="py-3 text-xs font-bold uppercase tracking-wider">Plant Details</TableHead>
              <TableHead className="py-3 text-xs font-bold uppercase tracking-wider">Lot</TableHead>
              <TableHead className="py-3 text-xs font-bold uppercase tracking-wider text-right">Qty</TableHead>
              <TableHead className="py-3 text-xs font-bold uppercase tracking-wider text-right">Rate</TableHead>
              <TableHead className="py-3 text-xs font-bold uppercase tracking-wider text-right">Total</TableHead>
              <TableHead className="py-3 text-xs font-bold uppercase tracking-wider text-right">Adv / Balance</TableHead>
              <TableHead className="py-3 pr-5 text-xs font-bold uppercase tracking-wider text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center">
                      <CalendarIcon className="w-7 h-7 opacity-40" />
                    </div>
                    <div>
                      <p className="font-semibold">No deliveries scheduled</p>
                      <p className="text-xs mt-0.5">for {format(selectedDate, "dd MMMM yyyy")}</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedOrders.map((order: any, idx: number) => {
                const lot = lots?.find((l) => l.id === order.lotId);
                const variety = varieties?.find((v) => v.id === lot?.varietyId);
                const category = categories?.find((c) => c.id === lot?.categoryId);
                const isDelivered = order.status === "DELIVERED";

                return (
                  <TableRow
                    key={order.id}
                    className={cn(
                      "transition-colors",
                      isDelivered
                        ? "bg-green-50/50 dark:bg-green-950/10 hover:bg-green-50 dark:hover:bg-green-950/20"
                        : "hover:bg-muted/30",
                    )}
                  >
                    <TableCell className="pl-5 py-3 text-xs text-muted-foreground font-mono w-8">
                      {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex flex-col min-w-[130px]">
                        <span className="font-semibold text-sm text-foreground leading-tight">
                          {order.customerName}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono mt-0.5">
                          {order.phone}
                        </span>
                        {order.village && (
                          <span className="text-[10px] text-muted-foreground/70 mt-0.5">
                            {order.village}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2.5">
                        {category?.image ? (
                          <img
                            src={category.image}
                            className="w-9 h-9 rounded-lg object-cover border shadow-sm shrink-0"
                            alt=""
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center border shrink-0">
                            <Layers className="w-4 h-4 text-muted-foreground/40" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-sm leading-tight">{category?.name}</p>
                          <p className="text-xs text-muted-foreground">{variety?.name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      {lot?.lotNumber ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] h-5 font-mono bg-primary/5 text-primary border-primary/20"
                          data-testid={`lot-number-${order.id}`}
                        >
                          {lot.lotNumber}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <span className="font-bold text-primary">{order.bookedQty}</span>
                    </TableCell>
                    <TableCell className="py-3 text-right text-sm text-muted-foreground">
                      ₹{Number(order.perUnitPrice).toLocaleString()}
                    </TableCell>
                    <TableCell className="py-3 text-right font-semibold text-sm">
                      ₹{Number(order.totalAmount).toLocaleString()}
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                          +₹{Number(order.advanceAmount).toLocaleString()}
                        </span>
                        <span className="text-xs text-orange-600 dark:text-orange-400 font-semibold">
                          ₹{Number(order.remainingBalance).toLocaleString()} due
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 pr-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!isDelivered && order.lotStatus === "PENDING_LOT" && (
                          <Badge variant="destructive" className="text-[10px] py-0 h-5 uppercase font-bold" data-testid={`status-lot-pending-${order.id}`}>
                            Lot Pending
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handlePrint(order)}
                          data-testid={`button-print-${order.id}`}
                          title="Print invoice"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-green-600"
                          onClick={() => generateInvoice(order)}
                          data-testid={`button-export-${order.id}`}
                          title="Export to Excel"
                        >
                          <FileSpreadsheet className="h-3.5 w-3.5" />
                        </Button>
                        {isDelivered ? (
                          <div className="flex items-center gap-1">
                            <Badge className="bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800 hover:bg-green-100 gap-1" data-testid={`status-delivered-${order.id}`}>
                              <CheckCircle className="w-3 h-3" />
                              Delivered
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => undoDelivery(order.id)}
                              className="h-7 px-2 text-[10px] font-semibold text-muted-foreground hover:text-destructive"
                              data-testid={`button-undo-${order.id}`}
                            >
                              Undo
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => markDelivered(order.id)}
                            className="h-8 px-3 text-xs font-bold bg-green-600 hover:bg-green-700 text-white shadow-sm"
                            data-testid={`button-mark-delivered-${order.id}`}
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

      {/* ── Mobile / Tablet Card View ── */}
      <div className="lg:hidden space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed rounded-xl border-muted-foreground/10">
            <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-3">
              <CalendarIcon className="w-7 h-7 opacity-40" />
            </div>
            <p className="font-semibold text-muted-foreground">No deliveries scheduled</p>
            <p className="text-xs text-muted-foreground mt-1">for {format(selectedDate, "dd MMMM yyyy")}</p>
          </div>
        ) : (
          paginatedOrders.map((order: any) => {
            const lot = lots?.find((l) => l.id === order.lotId);
            const variety = varieties?.find((v) => v.id === lot?.varietyId);
            const category = categories?.find((c) => c.id === lot?.categoryId);
            const isDelivered = order.status === "DELIVERED";

            return (
              <Card
                key={order.id}
                className={cn(
                  "overflow-hidden border transition-all",
                  isDelivered
                    ? "border-green-200 dark:border-green-800 bg-green-50/40 dark:bg-green-950/10"
                    : "bg-card",
                )}
              >
                <CardContent className="p-0">
                  {/* Card Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
                    <div className="flex items-center gap-2.5">
                      {category?.image ? (
                        <img src={category.image} className="w-8 h-8 rounded-md object-cover border" alt="" />
                      ) : (
                        <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center border">
                          <Layers className="w-4 h-4 text-muted-foreground/40" />
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-sm leading-tight">{order.customerName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{order.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isDelivered ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800 gap-1 text-[10px]" data-testid={`status-delivered-mobile-${order.id}`}>
                          <CheckCircle className="w-2.5 h-2.5" /> Delivered
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-900/20">
                          <Clock className="w-2.5 h-2.5 mr-1" /> Pending
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="px-4 py-3 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-0.5">Plant</p>
                      <p className="font-semibold text-xs leading-tight">{category?.name}</p>
                      <p className="text-[11px] text-muted-foreground">{variety?.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-0.5">Lot / Qty</p>
                      {lot?.lotNumber && (
                        <Badge variant="outline" className="text-[10px] h-4 font-mono bg-primary/5 text-primary border-primary/20 mb-0.5">
                          {lot.lotNumber}
                        </Badge>
                      )}
                      <p className="font-bold text-primary">{order.bookedQty} units</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-0.5">Amount</p>
                      <p className="font-bold text-sm">₹{Number(order.totalAmount).toLocaleString()}</p>
                      <p className="text-[11px] text-orange-600 font-semibold">₹{Number(order.remainingBalance).toLocaleString()} due</p>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-4 py-2.5 border-t bg-muted/10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        onClick={() => handlePrint(order)}
                        data-testid={`button-print-mobile-${order.id}`}
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-green-600"
                        onClick={() => generateInvoice(order)}
                        data-testid={`button-export-mobile-${order.id}`}
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                      </Button>
                      {!isDelivered && order.lotStatus === "PENDING_LOT" && (
                        <Badge variant="destructive" className="text-[10px] h-5 uppercase font-bold">Lot Pending</Badge>
                      )}
                    </div>
                    {isDelivered ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => undoDelivery(order.id)}
                        className="h-7 px-2 text-[11px] font-semibold text-muted-foreground hover:text-destructive"
                        data-testid={`button-undo-mobile-${order.id}`}
                      >
                        Undo
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => markDelivered(order.id)}
                        className="h-8 px-4 text-xs font-bold bg-green-600 hover:bg-green-700 text-white"
                        data-testid={`button-deliver-now-${order.id}`}
                      >
                        Deliver Now
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="h-8 px-3 text-xs"
          >
            <ChevronLeft className="h-3.5 w-3.5 mr-1" />
            Prev
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            Page <span className="font-semibold text-foreground">{currentPage}</span> of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="h-8 px-3 text-xs"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
