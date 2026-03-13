import { useState, useMemo, useEffect } from "react";
import { useLots } from "@/hooks/use-lots";
import { useOrders } from "@/hooks/use-orders";
import { useCategories } from "@/hooks/use-categories";
import { useVarieties } from "@/hooks/use-varieties";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3, Search, FileSpreadsheet, Sprout, ShoppingBag,
  Calendar as CalendarIcon, Layers, TrendingUp, IndianRupee,
  Package, Filter, X, RefreshCw, FileDown, Wallet
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, subMonths, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export default function ReportsPage() {
  const { data: lots, isLoading: loadingLots } = useLots();
  const { data: ordersData, isLoading: loadingOrders } = useOrders(1, 10000);
  const orders = useMemo(() => {
    if (!ordersData) return [];
    if (Array.isArray(ordersData)) return ordersData;
    if (ordersData && typeof ordersData === "object" && "orders" in ordersData)
      return (ordersData as any).orders;
    return [];
  }, [ordersData]);
  const { data: categories } = useCategories();
  const { data: varieties } = useVarieties();

  const PERSISTENCE_KEY = "reports_filters_state";

  const getInitialState = () => {
    const saved = localStorage.getItem(PERSISTENCE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          searchTerm: parsed.searchTerm || "",
          selectedCategory: parsed.selectedCategory || "all",
          selectedVariety: parsed.selectedVariety || "all",
          dateRange: {
            from: parsed.dateRange?.from ? new Date(parsed.dateRange.from) : subMonths(new Date(), 1),
            to: parsed.dateRange?.to ? new Date(parsed.dateRange.to) : new Date(),
          },
        };
      } catch (_) {}
    }
    return {
      searchTerm: "",
      selectedCategory: "all",
      selectedVariety: "all",
      dateRange: { from: subMonths(new Date(), 1), to: new Date() },
    };
  };

  const initialState = getInitialState();
  const [searchTerm, setSearchTerm] = useState(initialState.searchTerm);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialState.selectedCategory);
  const [selectedVariety, setSelectedVariety] = useState<string>(initialState.selectedVariety);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>(initialState.dateRange);

  const [location] = useLocation();
  const queryParams = new URLSearchParams(location.split("?")[1] || "");
  const viewParam = queryParams.get("view");
  const [activeTab, setActiveTab] = useState<string>("sowing");

  useEffect(() => {
    if (viewParam === "delivery") setActiveTab("payments");
  }, [viewParam]);

  useEffect(() => {
    localStorage.setItem(PERSISTENCE_KEY, JSON.stringify({ searchTerm, selectedCategory, selectedVariety, dateRange }));
  }, [searchTerm, selectedCategory, selectedVariety, dateRange]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedVariety("all");
    setDateRange({ from: subMonths(new Date(), 1), to: new Date() });
  };

  const hasActiveFilters =
    searchTerm !== "" || selectedCategory !== "all" || selectedVariety !== "all";

  const exportToExcel = (data: any[], fileName: string) => {
    if (data.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${fileName}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const exportToPDF = (data: any[], fileName: string, headers: string[], keys: string[]) => {
    if (data.length === 0) return;
    const doc = new jsPDF();
    doc.text(fileName.replace(/_/g, " "), 14, 15);
    const tableData = data.map((item) =>
      keys.map((key) => {
        if (key.includes(".")) {
          const parts = key.split(".");
          let val: any = item;
          for (const part of parts) val = val?.[part];
          return val || "N/A";
        }
        return item[key] || "N/A";
      })
    );
    autoTable(doc, { head: [headers], body: tableData, startY: 20 });
    doc.save(`${fileName}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const isInRange = (dateStr: string) => {
    if (!dateRange.from || !dateRange.to) return true;
    try {
      return isWithinInterval(parseISO(dateStr), {
        start: startOfDay(dateRange.from),
        end: endOfDay(dateRange.to),
      });
    } catch (_) {
      return true;
    }
  };

  const filteredLots = useMemo(() => {
    if (!lots) return [];
    let filtered = lots as any[];
    if (selectedCategory !== "all")
      filtered = filtered.filter((l) => l.categoryId.toString() === selectedCategory);
    if (selectedVariety !== "all")
      filtered = filtered.filter((l) => l.varietyId.toString() === selectedVariety);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.lotNumber.toLowerCase().includes(s) ||
          l.variety?.name?.toLowerCase().includes(s)
      );
    }
    return filtered;
  }, [lots, selectedCategory, selectedVariety, searchTerm]);

  const dailySowingData = useMemo(() => {
    return filteredLots.filter((l) => {
      const dateToCompare = l.sowingDate || l.expectedReadyDate;
      if (!dateToCompare) return false;
      return isInRange(dateToCompare);
    });
  }, [filteredLots, dateRange]);

  const lotStockData = useMemo(
    () => filteredLots.map((l) => ({ ...l, available: l.available || 0 })),
    [filteredLots]
  );

  const varietyPerformance = useMemo(() => {
    const report: Record<string, any> = {};
    filteredLots.forEach((lot) => {
      const varietyName = lot.variety?.name || "N/A";
      if (!report[varietyName])
        report[varietyName] = { name: varietyName, sown: 0, damaged: 0, available: 0 };
      report[varietyName].sown += lot.seedsSown;
      report[varietyName].damaged += lot.damaged;
      report[varietyName].available += lot.available || 0;
    });
    return Object.values(report);
  }, [filteredLots]);

  const paymentSummary = useMemo(() => {
    const report: Record<string, any> = {};
    orders?.forEach((order: any) => {
      if (!isInRange(order.deliveryDate)) return;
      const mode = order.paymentMode || "Cash";
      if (!report[mode]) report[mode] = { mode, count: 0, totalAdvance: 0 };
      report[mode].count += 1;
      report[mode].totalAdvance += Number(order.advanceAmount || 0);
    });
    return Object.values(report);
  }, [orders, dateRange]);

  const totalDeliveredQty = useMemo(
    () =>
      orders?.reduce((sum: number, order: any) => {
        if (!isInRange(order.deliveryDate)) return sum;
        return sum + (Number(order.deliveredQty) || 0);
      }, 0) || 0,
    [orders, dateRange]
  );

  const totalSownQty = useMemo(
    () => filteredLots.reduce((sum, l) => sum + (Number(l.seedsSown) || 0), 0),
    [filteredLots]
  );

  const totalAdvance = useMemo(
    () =>
      paymentSummary.reduce((sum, p) => sum + (Number(p.totalAdvance) || 0), 0),
    [paymentSummary]
  );

  const isLoading = loadingLots || loadingOrders;

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <div className="h-28 bg-muted/40 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted/40 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-12 bg-muted/40 rounded-2xl animate-pulse" />
        <div className="h-64 bg-muted/40 rounded-2xl animate-pulse" />
      </div>
    );
  }

  const tabCounts = {
    sowing: dailySowingData.length,
    stock: lotStockData.length,
    variety: varietyPerformance.length,
    payments: paymentSummary.length,
  };

  return (
    <div className="space-y-5 p-4 md:p-0">
      {/* ── Header ── */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-5 md:p-7">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 rounded-xl bg-primary/10">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-display font-black" data-testid="text-page-title">Reports</h1>
            </div>
            <p className="text-sm text-muted-foreground ml-11">
              Analyse sowing, stock, varieties & payments in one place.
            </p>
          </div>

          {/* Date range + Search */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-end gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">From</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[130px] justify-start text-left text-xs font-medium h-9 bg-background/80",
                        !dateRange.from && "text-muted-foreground"
                      )}
                      data-testid="button-date-from"
                    >
                      <CalendarIcon className="mr-1.5 h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {dateRange.from ? format(dateRange.from, "dd MMM yy") : "Pick date"}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(d) => setDateRange((p) => ({ ...p, from: d || undefined }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">To</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[130px] justify-start text-left text-xs font-medium h-9 bg-background/80",
                        !dateRange.to && "text-muted-foreground"
                      )}
                      data-testid="button-date-to"
                    >
                      <CalendarIcon className="mr-1.5 h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {dateRange.to ? format(dateRange.to, "dd MMM yy") : "Pick date"}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(d) => setDateRange((p) => ({ ...p, to: d || undefined }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Search</span>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Lot, variety…"
                  className="pl-8 h-9 w-44 text-xs bg-background/80"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Total Sown",
            value: totalSownQty.toLocaleString(),
            icon: Sprout,
            color: "text-green-600",
            bg: "bg-green-50",
            border: "border-green-100",
          },
          {
            label: "Delivered Qty",
            value: totalDeliveredQty.toLocaleString(),
            icon: Package,
            color: "text-blue-600",
            bg: "bg-blue-50",
            border: "border-blue-100",
          },
          {
            label: "Total Orders",
            value: (orders?.length || 0).toLocaleString(),
            icon: ShoppingBag,
            color: "text-orange-600",
            bg: "bg-orange-50",
            border: "border-orange-100",
          },
          {
            label: "Total Advance",
            value: "₹" + (totalAdvance / 1000).toFixed(1) + "K",
            icon: IndianRupee,
            color: "text-violet-600",
            bg: "bg-violet-50",
            border: "border-violet-100",
          },
        ].map((stat) => (
          <Card key={stat.label} className={cn("border shadow-none", stat.border)}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("p-2.5 rounded-xl shrink-0", stat.bg)}>
                <stat.icon className={cn("w-4 h-4", stat.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                  {stat.label}
                </p>
                <p className={cn("text-xl font-black leading-tight", stat.color)} data-testid={`text-stat-${stat.label.toLowerCase().replace(/\s/g, "-")}`}>
                  {stat.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-end gap-3 bg-muted/20 border border-dashed rounded-xl p-4">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0 mb-2.5" />

        <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
          <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Category</span>
          <Select
            value={selectedCategory}
            onValueChange={(val) => { setSelectedCategory(val); setSelectedVariety("all"); }}
          >
            <SelectTrigger className="bg-background h-9 text-xs" data-testid="select-category">
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

        <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
          <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Variety</span>
          <Select
            value={selectedVariety}
            onValueChange={setSelectedVariety}
            disabled={selectedCategory === "all"}
          >
            <SelectTrigger className="bg-background h-9 text-xs" data-testid="select-variety">
              <SelectValue placeholder="All Varieties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Varieties</SelectItem>
              {varieties
                ?.filter((v: any) => v.categoryId.toString() === selectedCategory)
                .map((v: any) => (
                  <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border border-destructive/20"
            onClick={handleClearFilters}
            data-testid="button-clear-filters"
          >
            <X className="w-3 h-3" /> Clear Filters
          </Button>
        )}
      </div>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full h-auto p-1 bg-muted/40 rounded-xl mb-1 gap-1">
          {(
            [
              { value: "sowing", label: "Sowing", icon: Sprout },
              { value: "stock", label: "Stock", icon: Layers },
              { value: "variety", label: "Varieties", icon: TrendingUp },
              { value: "payments", label: "Payments", icon: Wallet },
            ] as const
          ).map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs sm:text-sm data-[state=active]:shadow-sm"
              data-testid={`tab-${tab.value}`}
            >
              <tab.icon className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
              <Badge
                variant="secondary"
                className="h-4 px-1.5 text-[9px] font-black leading-none hidden sm:flex"
              >
                {tabCounts[tab.value as keyof typeof tabCounts]}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Sowing Tab ── */}
        <TabsContent value="sowing" className="mt-4">
          <ReportCard
            title="Sowing Report"
            subtitle="Daily sowing data for the selected date range"
            count={dailySowingData.length}
            onPDF={() =>
              exportToPDF(
                dailySowingData, "Sowing_Report",
                ["Date", "Lot Number", "Variety", "Seeds Sown", "Ready Date"],
                ["sowingDate", "lotNumber", "variety.name", "seedsSown", "expectedReadyDate"]
              )
            }
            onExcel={() => exportToExcel(dailySowingData, "Sowing_Report")}
            disabled={dailySowingData.length === 0}
          >
            {/* Desktop */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="text-[10px] font-black uppercase tracking-wider">Date</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-wider">Lot Number</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-wider">Variety</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-wider text-right">Sown</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-wider text-right">Ready Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailySowingData.length === 0 ? (
                    <EmptyRow colSpan={5} icon={<Sprout className="w-8 h-8" />} message="No sowing data for this period." />
                  ) : (
                    dailySowingData.map((lot: any, idx: number) => (
                      <TableRow key={lot.id} className={cn("hover:bg-primary/5 transition-colors", idx % 2 === 0 ? "" : "bg-muted/10")} data-testid={`row-sowing-${lot.id}`}>
                        <TableCell className="text-xs py-3 text-muted-foreground">{lot.sowingDate}</TableCell>
                        <TableCell className="py-3">
                          <span className="font-mono text-xs font-bold bg-muted/60 px-2 py-0.5 rounded">{lot.lotNumber}</span>
                        </TableCell>
                        <TableCell className="text-sm py-3 font-medium">{lot.variety?.name || "N/A"}</TableCell>
                        <TableCell className="text-sm py-3 text-right font-black">{Number(lot.seedsSown).toLocaleString()}</TableCell>
                        <TableCell className="py-3 text-right">
                          <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                            {lot.expectedReadyDate || "—"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile */}
            <div className="md:hidden p-4 space-y-3">
              {dailySowingData.length === 0 ? (
                <MobileEmpty icon={<Sprout className="w-8 h-8" />} message="No sowing data for this period." />
              ) : (
                dailySowingData.map((lot: any) => (
                  <MobileCard key={lot.id} data-testid={`card-sowing-${lot.id}`}>
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Lot</p>
                        <p className="font-mono text-sm font-black">{lot.lotNumber}</p>
                      </div>
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 whitespace-nowrap">
                        {lot.expectedReadyDate || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between items-end pt-2 border-t border-dashed">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Variety</p>
                        <p className="text-sm font-medium">{lot.variety?.name || "N/A"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Sown</p>
                        <p className="text-sm font-black">{Number(lot.seedsSown).toLocaleString()}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 pt-1">{lot.sowingDate}</p>
                  </MobileCard>
                ))
              )}
            </div>
          </ReportCard>
        </TabsContent>

        {/* ── Stock Tab ── */}
        <TabsContent value="stock" className="mt-4">
          <ReportCard
            title="Stock Report"
            subtitle="Current available stock across all sowing lots"
            count={lotStockData.length}
            onPDF={() =>
              exportToPDF(lotStockData, "Stock_Report",
                ["Lot", "Variety", "Sown", "Available"],
                ["lotNumber", "variety.name", "seedsSown", "available"]
              )
            }
            onExcel={() => exportToExcel(lotStockData, "Stock_Report")}
            disabled={lotStockData.length === 0}
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-[10px] font-black uppercase tracking-wider">Lot</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider">Variety</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider text-right">Sown</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider text-right">Available</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lotStockData.length === 0 ? (
                  <EmptyRow colSpan={4} icon={<ShoppingBag className="w-8 h-8" />} message="No stock data available." />
                ) : (
                  lotStockData.map((lot: any, idx: number) => (
                    <TableRow key={lot.id} className={cn("hover:bg-primary/5 transition-colors", idx % 2 !== 0 ? "bg-muted/10" : "")} data-testid={`row-stock-${lot.id}`}>
                      <TableCell className="py-3">
                        <span className="font-mono text-xs font-bold bg-muted/60 px-2 py-0.5 rounded">{lot.lotNumber}</span>
                      </TableCell>
                      <TableCell className="text-sm py-3 font-medium">{lot.variety?.name || "N/A"}</TableCell>
                      <TableCell className="text-right text-sm py-3 text-muted-foreground">{Number(lot.seedsSown).toLocaleString()}</TableCell>
                      <TableCell className="text-right py-3">
                        <span className={cn(
                          "text-sm font-black px-2 py-0.5 rounded",
                          lot.available > 0 ? "text-primary" : "text-destructive"
                        )}>
                          {Number(lot.available).toLocaleString()}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ReportCard>
        </TabsContent>

        {/* ── Variety Tab ── */}
        <TabsContent value="variety" className="mt-4">
          <ReportCard
            title="Variety Performance"
            subtitle="Aggregated metrics grouped by plant variety"
            count={varietyPerformance.length}
            onPDF={() =>
              exportToPDF(varietyPerformance, "Variety_Performance",
                ["Variety", "Total Sown", "Damaged", "Available"],
                ["name", "sown", "damaged", "available"]
              )
            }
            onExcel={() => exportToExcel(varietyPerformance, "Variety_Performance")}
            disabled={varietyPerformance.length === 0}
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-[10px] font-black uppercase tracking-wider">Variety</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider text-right">Total Sown</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider text-right">Damaged</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider text-right">Available</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {varietyPerformance.length === 0 ? (
                  <EmptyRow colSpan={4} icon={<BarChart3 className="w-8 h-8" />} message="No variety performance data." />
                ) : (
                  varietyPerformance.map((v: any, idx: number) => {
                    const healthPct = v.sown > 0 ? Math.round(((v.sown - v.damaged) / v.sown) * 100) : 100;
                    return (
                      <TableRow key={idx} className={cn("hover:bg-primary/5 transition-colors", idx % 2 !== 0 ? "bg-muted/10" : "")} data-testid={`row-variety-${idx}`}>
                        <TableCell className="text-sm py-3 font-bold">{v.name}</TableCell>
                        <TableCell className="text-right text-sm py-3 font-medium">{Number(v.sown).toLocaleString()}</TableCell>
                        <TableCell className="text-right py-3">
                          <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                            {Number(v.damaged).toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right py-3">
                          <div className="flex items-center justify-end gap-2">
                            <div className="hidden sm:block w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${Math.min(100, healthPct)}%` }}
                              />
                            </div>
                            <span className="text-sm font-black text-primary">{Number(v.available).toLocaleString()}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ReportCard>
        </TabsContent>

        {/* ── Payments Tab ── */}
        <TabsContent value="payments" className="mt-4">
          <ReportCard
            title="Payment Summary"
            subtitle="Advance payments grouped by payment mode"
            count={paymentSummary.length}
            onPDF={() =>
              exportToPDF(paymentSummary, "Payment_Report",
                ["Mode", "Count", "Total Advance"],
                ["mode", "count", "totalAdvance"]
              )
            }
            onExcel={() => exportToExcel(paymentSummary, "Payment_Report")}
            disabled={paymentSummary.length === 0}
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-[10px] font-black uppercase tracking-wider">Payment Mode</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider text-right">Orders</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-wider text-right">Total Advance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentSummary.length === 0 ? (
                  <EmptyRow colSpan={3} icon={<Wallet className="w-8 h-8" />} message="No payment data for this period." />
                ) : (
                  paymentSummary.map((p: any, idx: number) => (
                    <TableRow key={idx} className={cn("hover:bg-primary/5 transition-colors", idx % 2 !== 0 ? "bg-muted/10" : "")} data-testid={`row-payment-${idx}`}>
                      <TableCell className="py-3">
                        <span className="capitalize font-bold text-sm inline-flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-primary/60 inline-block" />
                          {p.mode}
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-3">
                        <Badge variant="secondary" className="font-black text-xs">{p.count}</Badge>
                      </TableCell>
                      <TableCell className="text-right py-3">
                        <span className="text-sm font-black text-primary">₹{Number(p.totalAdvance).toLocaleString()}</span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ReportCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ── Sub-components ── */

function ReportCard({
  title, subtitle, count, onPDF, onExcel, disabled, children,
}: {
  title: string;
  subtitle: string;
  count: number;
  onPDF: () => void;
  onExcel: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className="border shadow-sm overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/10 border-b py-4 px-5">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-black">{title}</CardTitle>
              <Badge variant="secondary" className="text-[10px] font-black">{count} rows</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={onPDF}
            disabled={disabled}
            data-testid={`button-pdf-${title.replace(/\s/g, "-").toLowerCase()}`}
          >
            <FileDown className="w-3.5 h-3.5" /> PDF
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 shadow-none"
            onClick={onExcel}
            disabled={disabled}
            data-testid={`button-excel-${title.replace(/\s/g, "-").toLowerCase()}`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">{children}</CardContent>
    </Card>
  );
}

function EmptyRow({ colSpan, icon, message }: { colSpan: number; icon: React.ReactNode; message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-16 text-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
          {icon}
          <p className="text-sm font-medium">{message}</p>
        </div>
      </TableCell>
    </TableRow>
  );
}

function MobileCard({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className="p-3.5 bg-muted/20 rounded-xl border space-y-2">
      {children}
    </div>
  );
}

function MobileEmpty({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground/40">
      {icon}
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
