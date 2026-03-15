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
        deliveredQty: "0",
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
      { id, status: "BOOKED", deliveredQty: "0" },
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

  const totalQuantityToDeliver = useMemo(() => {
    return filteredOrders.reduce((sum: number, order: any) => sum + (Number(order.bookedQty) || 0), 0);
  }, [filteredOrders]);

  const totalAmount = useMemo(() => {
    return filteredOrders.reduce((sum: number, order: any) => sum + (Number(order.totalAmount) || 0), 0);
  }, [filteredOrders]);

  const totalPending = useMemo(() => {
    return filteredOrders.reduce((sum: number, order: any) => sum + (Number(order.remainingBalance) || 0), 0);
  }, [filteredOrders]);

  const avgOrderValue = filteredOrders.length > 0 ? totalAmount / filteredOrders.length : 0;

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
    <div className="space-y-6 px-4 md:px-8 py-6">
      {printingOrder && <div id="invoice-print" className="hidden print:block"><InvoicePrint order={printingOrder} /></div>}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isSameDay(selectedDate, new Date())
              ? "Today's Deliveries"
              : "Scheduled Deliveries"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(selectedDate, "eeee, dd MMMM yyyy")}
          </p>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full sm:w-[240px] justify-start text-left font-normal h-10 border-muted-foreground/20 rounded-lg",
                !selectedDate && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
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

      <Card className="border shadow-sm">
        <CardContent className="p-5 flex flex-col md:flex-row gap-4 items-end flex-wrap">
          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Category Filter
            </label>
            <Select
              value={pageCategoryId}
              onValueChange={(val) => {
                setPageCategoryId(val);
                setPageVarietyId("all");
                setPageLotId("all");
              }}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Variety Filter
            </label>
            <Select
              value={pageVarietyId}
              onValueChange={(val) => {
                setPageVarietyId(val);
                setPageLotId("all");
              }}
              disabled={pageCategoryId === "all"}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Varieties</SelectItem>
                {filteredVarietiesPage?.map((v) => (
                  <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Lot Filter
            </label>
            <Select
              value={pageLotId}
              onValueChange={setPageLotId}
              disabled={pageVarietyId === "all"}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Lots</SelectItem>
                {filteredLotsPage?.map((l) => (
                  <SelectItem key={l.id} value={l.id.toString()}>{l.lotNumber}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-blue-50/50 dark:from-blue-950/30 dark:to-blue-950/20 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">{filteredOrders.length}</div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-semibold uppercase tracking-wider">Total Orders</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-green-50/50 dark:from-green-950/30 dark:to-green-950/20 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="text-3xl font-bold text-green-700 dark:text-green-300">{totalQuantityToDeliver.toLocaleString()}</div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-semibold uppercase tracking-wider">Total Qty</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-amber-50/50 dark:from-amber-950/30 dark:to-amber-950/20 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="text-3xl font-bold text-amber-700 dark:text-amber-300">₹{(totalAmount / 100000).toFixed(1)}L</div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-semibold uppercase tracking-wider">Total Amount</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-purple-50/50 dark:from-purple-950/30 dark:to-purple-950/20 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">₹{(totalPending / 100000).toFixed(1)}L</div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-2 font-semibold uppercase tracking-wider">Pending</p>
          </CardContent>
        </Card>
      </div>

      <div className="hidden lg:block">
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="py-4 pl-6 font-bold text-xs uppercase tracking-wider">Customer</TableHead>
              <TableHead className="py-4 font-bold text-xs uppercase tracking-wider">Plant Details</TableHead>
              <TableHead className="py-4 font-bold text-xs uppercase tracking-wider">Lot</TableHead>
              <TableHead className="py-4 font-bold text-xs uppercase tracking-wider text-right">Qty</TableHead>
              <TableHead className="py-4 font-bold text-xs uppercase tracking-wider text-right">Rate</TableHead>
              <TableHead className="py-4 font-bold text-xs uppercase tracking-wider text-right">Total</TableHead>
              <TableHead className="py-4 font-bold text-xs uppercase tracking-wider text-right">Adv/Bal</TableHead>
              <TableHead className="py-4 pr-6 font-bold text-xs uppercase tracking-wider text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
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
                  <TableRow key={order.id} className="group hover:bg-muted/10 transition-colors">
                    <TableCell className="pl-6 py-4">
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
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {lot?.lotNumber ? (
                        <Badge variant="outline" className="text-[10px] h-5 bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800" data-testid={`lot-number-${order.id}`}>
                          Lot {lot?.lotNumber}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4 text-right font-black text-primary">
                      {order.bookedQty}
                    </TableCell>
                    <TableCell className="py-4 text-right font-medium text-muted-foreground">
                      ₹{order.perUnitPrice}
                    </TableCell>
                    <TableCell className="py-4 text-right font-bold">
                      ₹{Number(order.totalAmount).toLocaleString()}
                    </TableCell>
                    <TableCell className="py-4 text-right pr-6">
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
                      <div className="flex justify-end gap-2 items-center">
                        {order.status !== "DELIVERED" && order.lotStatus === "PENDING_LOT" && (
                          <Badge
                            variant="destructive"
                            className="font-black text-[10px] uppercase py-0.5 whitespace-nowrap"
                            data-testid={`status-lot-pending-${order.id}`}
                          >
                            Lot Pending
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handlePrint(order)}
                          data-testid={`button-print-${order.id}`}
                        >
                          <Printer className="h-4 w-4 text-primary" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => generateInvoice(order)}
                          data-testid={`button-export-${order.id}`}
                        >
                          <FileSpreadsheet className="h-4 w-4 text-green-600" />
                        </Button>
                        {order.status === "DELIVERED" ? (
                          <div className="flex items-center justify-end gap-1">
                            <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100" data-testid={`status-delivered-${order.id}`}>
                              <CheckCircle className="w-3 h-3 mr-1" /> Delivered
                            </Badge>
                            <Button
                              size="sm"
                              onClick={() => undoDelivery(order.id)}
                              className="h-8 text-[10px] uppercase font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
                              data-testid={`button-undo-${order.id}`}
                            >
                              Undo
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => markDelivered(order.id)}
                            className="bg-green-600 hover:bg-green-700 shadow-sm font-bold h-8"
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
      </div>

      {/* Mobile / Tablet Card View */}
      <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full py-20 text-center border-2 border-dashed rounded-2xl border-muted-foreground/10">
            <CalendarIcon className="w-16 h-16 mx-auto mb-4 opacity-5" />
            <p className="text-muted-foreground font-medium">No deliveries scheduled for this date</p>
          </div>
        ) : (
          paginatedOrders.map((order: any) => {
            const lot = lots?.find((l) => l.id === order.lotId);
            const variety = varieties?.find((v) => v.id === lot?.varietyId);
            const category = categories?.find((c) => c.id === lot?.categoryId);

            return (
              <Card key={order.id} className="rounded-2xl overflow-hidden border shadow-sm hover:shadow-md hover:border-primary/20 transition-all">
                <CardContent className="p-0">
                  <div className="p-4 bg-muted/5 border-b flex items-center justify-between">
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
                          {order.status !== "DELIVERED" && order.lotStatus === "PENDING_LOT" && (
                            <Badge
                              variant="destructive"
                              className="font-black text-[10px] uppercase py-0.5 mt-1 w-fit"
                            >
                              Lot Pending
                            </Badge>
                          )}
                        </div>
                      {order.status === "DELIVERED" ? (
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-100 text-green-700 border-green-200" data-testid={`status-delivered-mobile-${order.id}`}>
                            Delivered
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => undoDelivery(order.id)}
                            className="h-8 text-[10px] font-bold text-muted-foreground hover:text-destructive"
                            data-testid={`button-undo-mobile-${order.id}`}
                          >
                            Undo
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => markDelivered(order.id)}
                          className="bg-green-600 hover:bg-green-700 font-bold"
                          data-testid={`button-deliver-now-${order.id}`}
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

      <div className="flex items-center justify-center gap-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="rounded-lg"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        <div className="text-sm font-medium text-muted-foreground">
          Page {currentPage} of {totalPages || 1}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage >= totalPages}
          className="rounded-lg"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
