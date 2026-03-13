import { useState, useMemo, useEffect, type ReactNode } from "react";
import { useLots } from "@/hooks/use-lots";
import { useOrders } from "@/hooks/use-orders";
import { useCategories } from "@/hooks/use-categories";
import { useVarieties } from "@/hooks/use-varieties";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, FileSpreadsheet, Truck, CheckCircle, BarChart3, Calendar as CalendarIcon, MapPin, Sprout, SlidersHorizontal, X, FileDown, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, parseISO, subMonths, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { formatIndianNumber } from "@/lib/formatters";

export default function DeliveryReportsPage() {
  const { data: lots, isLoading: loadingLots } = useLots();
  const { data: ordersData, isLoading: loadingOrders } = useOrders(1, 10000);
  const orders = useMemo(() => {
    if (!ordersData) return [];
    if (Array.isArray(ordersData)) return ordersData;
    if (ordersData && typeof ordersData === 'object' && 'orders' in ordersData) {
      return ordersData.orders;
    }
    return [];
  }, [ordersData]);
  const { data: categories } = useCategories();
  const { data: varieties } = useVarieties();

  const PERSISTENCE_KEY = "delivery_reports_filters_state";

  const getInitialState = () => {
    const saved = localStorage.getItem(PERSISTENCE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          searchTerm: parsed.searchTerm || "",
          activeTab: parsed.activeTab || "pending",
          dateRange: parsed.dateRange ? {
            from: parsed.dateRange.from ? new Date(parsed.dateRange.from) : undefined,
            to: parsed.dateRange.to ? new Date(parsed.dateRange.to) : undefined,
          } : {
            from: subMonths(new Date(), 1),
            to: new Date(),
          },
          pageDistrictId: parsed.pageDistrictId || "all",
          pageTalukId: parsed.pageTalukId || "all",
          selectedCategory: parsed.selectedCategory || "all",
          selectedVariety: parsed.selectedVariety || "all",
        };
      } catch (e) {
        console.error("Failed to parse saved filters", e);
      }
    }
    return {
      searchTerm: "",
      activeTab: "pending",
      dateRange: {
        from: subMonths(new Date(), 1),
        to: new Date(),
      },
      pageDistrictId: "all",
      pageTalukId: "all",
      selectedCategory: "all",
      selectedVariety: "all",
    };
  };

  const initialState = getInitialState();
  const [searchTerm, setSearchTerm] = useState(initialState.searchTerm);
  const [activeTab, setActiveTab] = useState<string>(initialState.activeTab);
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>(initialState.dateRange);

  const [pageDistrictId, setPageDistrictId] = useState<string>(initialState.pageDistrictId);
  const [pageTalukId, setPageTalukId] = useState<string>(initialState.pageTalukId);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialState.selectedCategory);
  const [selectedVariety, setSelectedVariety] = useState<string>(initialState.selectedVariety);

  useEffect(() => {
    const stateToSave = {
      searchTerm,
      activeTab,
      dateRange,
      pageDistrictId,
      pageTalukId,
      selectedCategory,
      selectedVariety,
    };
    localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(stateToSave));
  }, [searchTerm, activeTab, dateRange, pageDistrictId, pageTalukId, selectedCategory, selectedVariety]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setDateRange({
      from: subMonths(new Date(), 1),
      to: new Date(),
    });
    setPageDistrictId("all");
    setPageTalukId("all");
    setSelectedCategory("all");
    setSelectedVariety("all");
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (pageDistrictId !== "all") count++;
    if (pageTalukId !== "all") count++;
    if (selectedCategory !== "all") count++;
    if (selectedVariety !== "all") count++;
    return count;
  }, [searchTerm, pageDistrictId, pageTalukId, selectedCategory, selectedVariety]);

  const exportToExcel = (data: any[], fileName: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${fileName}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const exportToPDF = (data: any[], fileName: string, headers: string[], keys: string[]) => {
    const doc = new jsPDF();
    doc.text(fileName.replace(/_/g, " "), 14, 15);
    
    const tableData = data.map(item => keys.map(key => {
      if (key.includes('.')) {
        const parts = key.split('.');
        let val = item;
        for (const part of parts) {
          val = val?.[part];
        }
        return val || "N/A";
      }
      return item[key] || "N/A";
    }));

    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 20,
    });

    doc.save(`${fileName}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const isInRange = (dateStr: string | null, fallbackDateStr: string) => {
    if (!dateRange.from || !dateRange.to) return true;
    try {
      const date = parseISO(dateStr || fallbackDateStr);
      return isWithinInterval(date, {
        start: startOfDay(dateRange.from),
        end: endOfDay(dateRange.to)
      });
    } catch (e) {
      return true;
    }
  };

  const uniqueDistricts = useMemo(() => {
    if (!orders) return [];
    const districts = new Set(orders.map((o: any) => o.district).filter(Boolean));
    return Array.from(districts).sort();
  }, [orders]);

  const uniqueTaluks = useMemo(() => {
    if (!orders) return [];
    const taluks = new Set(
      orders
        .filter((o: any) => pageDistrictId === "all" || o.district === pageDistrictId)
        .map((o: any) => o.taluk)
        .filter(Boolean)
    );
    return Array.from(taluks).sort();
  }, [orders, pageDistrictId]);

  const filteredOrdersForTotals = useMemo(() => {
    if (!orders) return [];
    let filtered = orders;
    if (pageDistrictId !== "all") {
      filtered = filtered.filter((item: any) => item.district === pageDistrictId);
    }
    if (pageTalukId !== "all") {
      filtered = filtered.filter((item: any) => item.taluk === pageTalukId);
    }
    return filtered;
  }, [orders, pageDistrictId, pageTalukId]);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    let filtered = orders;
    if (pageDistrictId !== "all") {
      filtered = filtered.filter((item: any) => item.district === pageDistrictId);
    }
    if (pageTalukId !== "all") {
      filtered = filtered.filter((item: any) => item.taluk === pageTalukId);
    }
    if (selectedCategory !== "all") {
      filtered = filtered.filter((item: any) => {
        const lot = lots?.find((l: any) => l.id === item.lotId);
        return lot?.categoryId?.toString() === selectedCategory;
      });
    }
    if (selectedVariety !== "all") {
      filtered = filtered.filter((item: any) => {
        const lot = lots?.find((l: any) => l.id === item.lotId);
        return lot?.varietyId?.toString() === selectedVariety;
      });
    }
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter((item: any) => 
        (item.customerName?.toLowerCase().includes(s)) ||
        (item.village?.toLowerCase().includes(s)) ||
        (item.phone?.toLowerCase().includes(s))
      );
    }
    return filtered;
  }, [orders, searchTerm, pageDistrictId, pageTalukId, selectedCategory, selectedVariety, lots]);

  const pendingDeliveries = useMemo(() => {
    return filteredOrders.filter((o: any) => o.status === "BOOKED" && isInRange(null, o.deliveryDate)).map((o: any) => {
      const lot = lots?.find((l: any) => l.id === o.lotId);
      return {
        ...o,
        varietyName: (lot as any)?.variety?.name || "N/A",
        lotNumber: lot?.lotNumber || "N/A"
      };
    });
  }, [filteredOrders, lots, dateRange]);

  const deliveredOrders = useMemo(() => {
    return filteredOrders.filter((o: any) => o.status === "DELIVERED" && isInRange(o.actualDeliveryDate, o.deliveryDate)).map((o: any) => {
      const lot = lots?.find((l: any) => l.id === o.lotId);
      return {
        ...o,
        varietyName: (lot as any)?.variety?.name || "N/A",
        lotNumber: lot?.lotNumber || "N/A"
      };
    });
  }, [filteredOrders, lots, dateRange]);

  const totalQtyToDeliver = useMemo(() => {
    return filteredOrdersForTotals
      .filter((o: any) => o.status === "BOOKED" && isInRange(null, o.deliveryDate))
      .reduce((sum: number, order: any) => sum + (Number(order.bookedQty) || 0), 0);
  }, [filteredOrdersForTotals, dateRange]);

  const totalQtyDelivered = useMemo(() => {
    return filteredOrdersForTotals
      .filter((o: any) => o.status === "DELIVERED" && isInRange(o.actualDeliveryDate, o.deliveryDate))
      .reduce((sum: number, order: any) => sum + (Number(order.bookedQty) || 0), 0);
  }, [filteredOrdersForTotals, dateRange]);

  const deliveryVarietyReport = useMemo(() => {
    const report: Record<string, any> = {};
    deliveredOrders.forEach((order: any) => {
      const key = order.varietyName;
      if (!report[key]) {
        report[key] = { name: key, orderCount: 0, totalQty: 0, totalAmount: 0 };
      }
      report[key].orderCount += 1;
      report[key].totalQty += Number(order.bookedQty) || 0;
      report[key].totalAmount += Number(order.totalAmount);
    });
    return Object.values(report);
  }, [deliveredOrders]);

  const deliveryVillageReport = useMemo(() => {
    const report: Record<string, any> = {};
    deliveredOrders.forEach((order: any) => {
      const key = order.village || "Unknown";
      if (!report[key]) {
        report[key] = { village: key, orderCount: 0, totalQty: 0, paymentCollected: 0, pendingBalance: 0 };
      }
      report[key].orderCount += 1;
      report[key].totalQty += Number(order.bookedQty) || 0;
      report[key].paymentCollected += Number(order.advanceAmount);
      report[key].pendingBalance += Number(order.remainingBalance);
    });
    return Object.values(report);
  }, [deliveredOrders]);

  if (loadingLots || loadingOrders) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-muted-foreground text-sm font-medium">Loading delivery reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Truck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">Delivery Reports</h1>
            <p className="text-sm text-muted-foreground">Track pending and completed deliveries</p>
          </div>
        </div>

        {/* Date Range Picker */}
        <div className="flex items-center gap-2 bg-muted/40 border rounded-xl px-3 py-2">
          <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "text-sm font-medium hover:text-primary transition-colors",
                  !dateRange.from && "text-muted-foreground"
                )}
              >
                {dateRange.from ? format(dateRange.from, "MMM dd, yyyy") : "Start date"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange.from}
                onSelect={(date) => setDateRange((prev: any) => ({ ...prev, from: date || undefined }))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground text-xs">→</span>
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "text-sm font-medium hover:text-primary transition-colors",
                  !dateRange.to && "text-muted-foreground"
                )}
              >
                {dateRange.to ? format(dateRange.to, "MMM dd, yyyy") : "End date"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={dateRange.to}
                onSelect={(date) => setDateRange((prev: any) => ({ ...prev, to: date || undefined }))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Filters Panel */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            {/* Search */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Search className="w-3 h-3" /> Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Customer, village, phone..."
                  className="pl-9 h-9 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search"
                />
              </div>
            </div>

            <div className="w-px h-8 bg-border hidden sm:block" />

            {/* District */}
            <div className="flex flex-col gap-1.5 w-[160px]">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" /> District
              </label>
              <Select value={pageDistrictId} onValueChange={(val) => {
                setPageDistrictId(val);
                setPageTalukId("all");
              }}>
                <SelectTrigger className="h-9 text-sm" data-testid="select-district">
                  <SelectValue placeholder="All Districts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Districts</SelectItem>
                  {uniqueDistricts.map((d: any) => (
                    <SelectItem key={d} value={d || "Unknown"}>{d || "Unknown"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Taluk */}
            <div className="flex flex-col gap-1.5 w-[160px]">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Taluk</label>
              <Select value={pageTalukId} onValueChange={setPageTalukId} disabled={pageDistrictId === "all"}>
                <SelectTrigger className="h-9 text-sm" data-testid="select-taluk">
                  <SelectValue placeholder="All Taluks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Taluks</SelectItem>
                  {uniqueTaluks.map((t: any) => (
                    <SelectItem key={t} value={t || "Unknown"}>{t || "Unknown"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-px h-8 bg-border hidden sm:block" />

            {/* Category */}
            <div className="flex flex-col gap-1.5 w-[160px]">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Layers className="w-3 h-3" /> Category
              </label>
              <Select value={selectedCategory} onValueChange={(val) => {
                setSelectedCategory(val);
                setSelectedVariety("all");
              }}>
                <SelectTrigger className="h-9 text-sm" data-testid="select-category">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Variety */}
            <div className="flex flex-col gap-1.5 w-[160px]">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Sprout className="w-3 h-3" /> Variety
              </label>
              <Select value={selectedVariety} onValueChange={setSelectedVariety} disabled={selectedCategory === "all"}>
                <SelectTrigger className="h-9 text-sm" data-testid="select-variety">
                  <SelectValue placeholder="All Varieties" />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  <SelectItem value="all">All Varieties</SelectItem>
                  {varieties?.filter((v: any) => selectedCategory === "all" || v.categoryId.toString() === selectedCategory).map((v: any) => (
                    <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border border-destructive/20"
                onClick={handleClearFilters}
                data-testid="button-clear-filters"
              >
                <X className="w-3.5 h-3.5" />
                Clear
                <Badge variant="destructive" className="h-4 w-4 p-0 flex items-center justify-center text-[10px] rounded-full">
                  {activeFilterCount}
                </Badge>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs + Summary */}
      <Tabs defaultValue="pending" value={activeTab} className="w-full" onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <TabsList className="flex-1 grid grid-cols-3 h-11">
            <TabsTrigger value="pending" className="flex items-center gap-2 text-sm" data-testid="tab-pending">
              <Truck className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Pending</span>
              <span className="sm:hidden">Pending</span>
              {pendingDeliveries.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{pendingDeliveries.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="delivered" className="flex items-center gap-2 text-sm" data-testid="tab-delivered">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>Delivered</span>
              {deliveredOrders.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{deliveredOrders.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2 text-sm" data-testid="tab-analysis">
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span>Analysis</span>
            </TabsTrigger>
          </TabsList>

          {/* Summary Stat */}
          <div className="flex items-center gap-3 bg-primary/5 border border-primary/15 rounded-xl px-4 py-2.5 sm:w-56 shrink-0">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sprout className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {activeTab === "pending" ? "To Deliver" : activeTab === "delivered" ? "Delivered Qty" : "Total Delivered"}
              </p>
              <p className="text-xl font-black text-primary leading-tight">
                {formatIndianNumber(activeTab === "pending" ? totalQtyToDeliver : totalQtyDelivered)}
              </p>
            </div>
          </div>
        </div>

        {/* Pending Tab */}
        <TabsContent value="pending" className="mt-0">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between py-4 px-5">
                <div>
                  <CardTitle className="text-base">Pending Deliveries</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Booked orders awaiting delivery</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => exportToPDF(pendingDeliveries, "Pending_Deliveries", ["Customer", "Variety", "Lot", "Qty", "Exp. Date", "Village", "Taluk"], ["customerName", "varietyName", "lotNumber", "bookedQty", "deliveryDate", "village", "taluk"])}>
                    <FileDown className="w-3.5 h-3.5" /> PDF
                  </Button>
                  <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => exportToExcel(pendingDeliveries, "Pending_Deliveries")}>
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="pl-5 font-semibold text-xs uppercase tracking-wider">Customer</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Variety</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Lot</TableHead>
                      <TableHead className="text-right font-semibold text-xs uppercase tracking-wider">Qty</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Exp. Date</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Village</TableHead>
                      <TableHead className="pr-5 font-semibold text-xs uppercase tracking-wider">Taluk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingDeliveries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-16 text-center">
                          <EmptyState icon={<Truck className="w-8 h-8" />} message="No pending deliveries found" sub="Try adjusting your filters or date range" />
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingDeliveries.map((order: any) => (
                        <TableRow key={order.id} className="hover:bg-muted/20 transition-colors">
                          <TableCell className="pl-5">
                            <div className="font-semibold text-sm">{order.customerName}</div>
                            <div className="text-xs text-muted-foreground">{order.phone}</div>
                          </TableCell>
                          <TableCell className="text-sm">{order.varietyName}</TableCell>
                          <TableCell>
                            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{order.lotNumber}</span>
                          </TableCell>
                          <TableCell className="text-right font-bold text-primary">{order.bookedQty}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{order.deliveryDate}</TableCell>
                          <TableCell className="font-semibold text-sm">{order.village}</TableCell>
                          <TableCell className="pr-5 text-sm text-muted-foreground">{order.taluk || "N/A"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {pendingDeliveries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-card rounded-xl border border-dashed gap-2">
                <Truck className="w-8 h-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground font-medium">No pending deliveries found</p>
              </div>
            ) : (
              pendingDeliveries.map((order: any) => (
                <Card key={order.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex items-start justify-between p-4 pb-3">
                      <div>
                        <h3 className="font-bold text-sm">{order.customerName}</h3>
                        <p className="text-xs text-muted-foreground">{order.phone}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-semibold uppercase text-muted-foreground">Qty</div>
                        <div className="text-lg font-black text-primary">{order.bookedQty}</div>
                      </div>
                    </div>
                    <div className="mx-4 border-t border-dashed" />
                    <div className="grid grid-cols-2 gap-3 p-4 pt-3">
                      <div>
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-0.5">Variety</div>
                        <div className="text-sm font-medium">{order.varietyName}</div>
                        <div className="font-mono text-[10px] bg-muted inline-block px-1 rounded mt-0.5">{order.lotNumber}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-0.5">Exp. Date</div>
                        <div className="text-sm">{order.deliveryDate}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-4 pb-4 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3 text-primary/60" />
                      <span>{order.village}{order.taluk ? `, ${order.taluk}` : ""}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Delivered Tab */}
        <TabsContent value="delivered" className="mt-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-4 px-5">
              <div>
                <CardTitle className="text-base">Delivered Orders</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Orders successfully delivered</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => exportToPDF(deliveredOrders, "Delivered_Orders", ["Customer", "Variety", "Qty", "Total", "Exp. Date", "Actual Date", "Village", "Taluk"], ["customerName", "varietyName", "bookedQty", "totalAmount", "deliveryDate", "actualDeliveryDate", "village", "taluk"])}>
                  <FileDown className="w-3.5 h-3.5" /> PDF
                </Button>
                <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => exportToExcel(deliveredOrders, "Delivered_Orders")}>
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="pl-5 font-semibold text-xs uppercase tracking-wider">Customer</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">Variety</TableHead>
                    <TableHead className="text-right font-semibold text-xs uppercase tracking-wider">Qty</TableHead>
                    <TableHead className="text-right font-semibold text-xs uppercase tracking-wider">Total</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">Exp. Date</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">Actual Date</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">Village</TableHead>
                    <TableHead className="pr-5 font-semibold text-xs uppercase tracking-wider">Taluk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-16 text-center">
                        <EmptyState icon={<CheckCircle className="w-8 h-8" />} message="No delivered orders found" sub="Try adjusting your filters or date range" />
                      </TableCell>
                    </TableRow>
                  ) : (
                    deliveredOrders.map((order: any) => (
                      <TableRow key={order.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="pl-5">
                          <div className="font-semibold text-sm">{order.customerName}</div>
                          <div className="text-xs text-muted-foreground">{order.phone}</div>
                        </TableCell>
                        <TableCell className="text-sm">{order.varietyName}</TableCell>
                        <TableCell className="text-right font-bold text-primary">{order.bookedQty}</TableCell>
                        <TableCell className="text-right text-sm font-semibold">₹{Number(order.totalAmount).toLocaleString()}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{order.deliveryDate}</TableCell>
                        <TableCell className="text-sm">
                          {order.actualDeliveryDate ? (
                            <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full text-xs font-medium">
                              <CheckCircle className="w-3 h-3" /> {order.actualDeliveryDate}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold text-sm">{order.village}</TableCell>
                        <TableCell className="pr-5 text-sm text-muted-foreground">{order.taluk || "N/A"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="mt-0">
          <Tabs defaultValue="variety">
            <TabsList className="w-full grid grid-cols-2 mb-4 h-10">
              <TabsTrigger value="variety" className="text-sm" data-testid="tab-variety-analysis">Variety-wise</TabsTrigger>
              <TabsTrigger value="village" className="text-sm" data-testid="tab-village-analysis">Village-wise</TabsTrigger>
            </TabsList>
            <TabsContent value="variety" className="mt-0">
              <Card>
                <CardHeader className="py-4 px-5">
                  <CardTitle className="text-base">Delivery by Variety</CardTitle>
                  <p className="text-xs text-muted-foreground">Breakdown of delivered orders per variety</p>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="pl-5 font-semibold text-xs uppercase tracking-wider">Variety</TableHead>
                        <TableHead className="text-right font-semibold text-xs uppercase tracking-wider">Orders</TableHead>
                        <TableHead className="text-right font-semibold text-xs uppercase tracking-wider">Total Qty</TableHead>
                        <TableHead className="pr-5 text-right font-semibold text-xs uppercase tracking-wider">Total Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveryVarietyReport.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="py-16 text-center">
                            <EmptyState icon={<BarChart3 className="w-8 h-8" />} message="No data available" sub="No delivered orders in selected range" />
                          </TableCell>
                        </TableRow>
                      ) : (
                        deliveryVarietyReport.map((v: any) => (
                          <TableRow key={v.name} className="hover:bg-muted/20 transition-colors">
                            <TableCell className="pl-5 font-semibold text-sm">{v.name}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary" className="font-mono">{v.orderCount}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-bold text-primary">{v.totalQty}</TableCell>
                            <TableCell className="pr-5 text-right font-semibold text-sm">₹{v.totalAmount.toLocaleString()}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="village" className="mt-0">
              <Card>
                <CardHeader className="py-4 px-5">
                  <CardTitle className="text-base">Delivery by Village</CardTitle>
                  <p className="text-xs text-muted-foreground">Payment summary per village</p>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="pl-5 font-semibold text-xs uppercase tracking-wider">Village</TableHead>
                        <TableHead className="text-right font-semibold text-xs uppercase tracking-wider">Orders</TableHead>
                        <TableHead className="text-right font-semibold text-xs uppercase tracking-wider">Collected</TableHead>
                        <TableHead className="pr-5 text-right font-semibold text-xs uppercase tracking-wider">Pending</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveryVillageReport.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="py-16 text-center">
                            <EmptyState icon={<MapPin className="w-8 h-8" />} message="No data available" sub="No delivered orders in selected range" />
                          </TableCell>
                        </TableRow>
                      ) : (
                        deliveryVillageReport.map((v: any) => (
                          <TableRow key={v.village} className="hover:bg-muted/20 transition-colors">
                            <TableCell className="pl-5 font-semibold text-sm">{v.village}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary" className="font-mono">{v.orderCount}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold text-green-700">₹{v.paymentCollected.toLocaleString()}</TableCell>
                            <TableCell className="pr-5 text-right font-semibold text-orange-600">₹{v.pendingBalance.toLocaleString()}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Layers({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/>
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/>
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>
    </svg>
  );
}

function EmptyState({ icon, message, sub }: { icon: ReactNode; message: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
      <div className="text-muted-foreground/30">{icon}</div>
      <p className="font-medium text-sm">{message}</p>
      {sub && <p className="text-xs text-muted-foreground/70">{sub}</p>}
    </div>
  );
}
