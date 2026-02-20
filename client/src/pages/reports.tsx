import { useState, useMemo, useEffect } from "react";
import { useLots } from "@/hooks/use-lots";
import { useOrders } from "@/hooks/use-orders";
import { useCategories } from "@/hooks/use-categories";
import { useVarieties } from "@/hooks/use-varieties";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Search, FileSpreadsheet, Sprout, ShoppingBag, Calendar as CalendarIcon, MapPin, Layers } from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    if (ordersData && typeof ordersData === 'object' && 'orders' in ordersData) {
      return ordersData.orders;
    }
    return [];
  }, [ordersData]);
  const { data: categories } = useCategories();
  const { data: varieties } = useVarieties();
  
  // Persistence key
  const PERSISTENCE_KEY = "reports_filters_state";

  // Initial state helper
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
          }
        };
      } catch (e) {
        console.error("Failed to parse saved filters", e);
      }
    }
    return {
      searchTerm: "",
      selectedCategory: "all",
      selectedVariety: "all",
      dateRange: {
        from: subMonths(new Date(), 1),
        to: new Date(),
      }
    };
  };

  const initialState = getInitialState();
  const [searchTerm, setSearchTerm] = useState(initialState.searchTerm);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialState.selectedCategory);
  const [selectedVariety, setSelectedVariety] = useState<string>(initialState.selectedVariety);
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>(initialState.dateRange);

  const [location] = useLocation();
  const queryParams = new URLSearchParams(location.split('?')[1] || "");
  const viewParam = queryParams.get("view");
  const [activeTab, setActiveTab] = useState<string>(viewParam === "standard" ? "sowing" : "sowing");

  useEffect(() => {
    if (viewParam === "standard") {
      setActiveTab("sowing");
    } else if (viewParam === "delivery") {
      setActiveTab("payments");
    }
  }, [viewParam]);

  // Persist state changes
  useEffect(() => {
    const stateToSave = {
      searchTerm,
      selectedCategory,
      selectedVariety,
      dateRange
    };
    localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(stateToSave));
  }, [searchTerm, selectedCategory, selectedVariety, dateRange]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedVariety("all");
    setDateRange({
      from: subMonths(new Date(), 1),
      to: new Date(),
    });
  };

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

  const isInRange = (dateStr: string) => {
    if (!dateRange.from || !dateRange.to) return true;
    try {
      const date = parseISO(dateStr);
      return isWithinInterval(date, {
        start: startOfDay(dateRange.from),
        end: endOfDay(dateRange.to)
      });
    } catch (e) {
      return true;
    }
  };

  const filteredLots = useMemo(() => {
    if (!lots) return [];
    let filtered = lots;

    if (selectedCategory !== "all") {
      filtered = filtered.filter((l: any) => l.categoryId.toString() === selectedCategory);
    }
    if (selectedVariety !== "all") {
      filtered = filtered.filter((l: any) => l.varietyId.toString() === selectedVariety);
    }
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter((l: any) => 
        l.lotNumber.toLowerCase().includes(s) ||
        (l as any).variety?.name.toLowerCase().includes(s)
      );
    }
    return filtered;
  }, [lots, selectedCategory, selectedVariety, searchTerm]);

  const dailySowingData = useMemo(() => {
    return filteredLots.filter((l: any) => {
      // Priority 1: sowingDate (The actual date it was sown)
      // Priority 2: expectedReadyDate
      const dateToCompare = l.sowingDate || l.expectedReadyDate;
      if (!dateToCompare) return false;
      return isInRange(dateToCompare);
    }) || [];
  }, [filteredLots, dateRange]);

  const lotStockData = useMemo(() => filteredLots.map((l: any) => ({
    ...l,
    available: (l as any).available || 0
  })) || [], [filteredLots]);

  const varietyPerformance = useMemo(() => {
    const report: Record<string, any> = {};
    filteredLots.forEach((lot: any) => {
      const varietyName = (lot as any).variety?.name || "N/A";
      if (!report[varietyName]) {
        report[varietyName] = { name: varietyName, sown: 0, damaged: 0, available: 0 };
      }
      report[varietyName].sown += lot.seedsSown;
      report[varietyName].damaged += lot.damaged;
      report[varietyName].available += (lot as any).available || 0;
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

  if (loadingLots || loadingOrders) {
    return <div className="p-8 text-center text-muted-foreground">Loading reports...</div>;
  }

  return (
    <div className="space-y-6 md:space-y-8 p-4 md:p-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">Detailed data analysis and export center.</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex items-end gap-3 w-full lg:w-auto">
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1">From</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full sm:w-[130px] justify-start text-left font-normal h-10",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    <span className="truncate">{dateRange.from ? format(dateRange.from, "MMM dd, y") : "Pick date"}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => setDateRange((prev: any) => ({ ...prev, from: date || undefined }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1">To</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full sm:w-[130px] justify-start text-left font-normal h-10",
                      !dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    <span className="truncate">{dateRange.to ? format(dateRange.to, "MMM dd, y") : "Pick date"}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0" align="start">
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

          <div className="flex flex-col gap-1 w-full lg:w-64">
            <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Search</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search lots, variety..." 
                className="pl-9 h-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 items-end gap-4 bg-muted/20 p-4 rounded-xl border border-dashed relative">
        <Button 
          variant="ghost" 
          size="sm" 
          className="absolute -top-3 right-4 bg-background border h-7 text-[10px] font-bold uppercase hover:bg-destructive hover:text-destructive-foreground transition-colors z-10"
          onClick={handleClearFilters}
        >
          Clear Filters
        </Button>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Filter by Category</span>
          <Select value={selectedCategory} onValueChange={(val) => {
            setSelectedCategory(val);
            setSelectedVariety("all");
          }}>
            <SelectTrigger className="bg-background h-10">
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

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Filter by Variety</span>
          <Select value={selectedVariety} onValueChange={setSelectedVariety} disabled={selectedCategory === "all"}>
            <SelectTrigger className="bg-background h-10">
              <SelectValue placeholder="All Varieties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Varieties</SelectItem>
              {varieties?.filter((v: any) => v.categoryId.toString() === selectedCategory).map((v: any) => (
                <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="sowing" value={activeTab} className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto p-1 bg-muted/50 rounded-xl mb-6">
          <TabsTrigger value="sowing" className="flex items-center gap-2 py-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Sprout className="w-4 h-4" /> <span className="text-xs sm:text-sm">Sowing</span>
          </TabsTrigger>
          <TabsTrigger value="stock" className="flex items-center gap-2 py-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <ShoppingBag className="w-4 h-4" /> <span className="text-xs sm:text-sm">Stock</span>
          </TabsTrigger>
          <TabsTrigger value="variety" className="flex items-center gap-2 py-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <BarChart3 className="w-4 h-4" /> <span className="text-xs sm:text-sm">Varieties</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2 py-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Search className="w-4 h-4" /> <span className="text-xs sm:text-sm">Payments</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sowing" className="mt-0">
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/10 pb-4">
              <div>
                <CardTitle className="text-lg">Sowing Report</CardTitle>
                <p className="text-xs text-muted-foreground">Detailed sowing data for the selected period.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-9 text-xs flex-1 sm:flex-none" onClick={() => exportToPDF(dailySowingData, "Sowing_Report", ["Date", "Lot Number", "Variety", "Seeds Sown", "Ready Date"], ["sowingDate", "lotNumber", "variety.name", "seedsSown", "expectedReadyDate"])}>
                  PDF
                </Button>
                <Button size="sm" className="h-9 text-xs flex-1 sm:flex-none shadow-sm" onClick={() => exportToExcel(dailySowingData, "Sowing_Report")}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto hidden md:block">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Date</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Lot Number</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Variety</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Sown</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Ready</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailySowingData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2 opacity-50">
                          <Sprout className="w-8 h-8" />
                          <p className="text-sm font-medium">No sowing data found.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    dailySowingData.map((lot: any) => (
                      <TableRow key={lot.id} className="hover:bg-muted/20">
                        <TableCell className="text-sm py-3">{lot.sowingDate}</TableCell>
                        <TableCell className="text-sm py-3 font-mono font-bold">{lot.lotNumber}</TableCell>
                        <TableCell className="text-sm py-3">{(lot as any).variety?.name || "N/A"}</TableCell>
                        <TableCell className="text-sm py-3 text-right font-medium">{lot.seedsSown}</TableCell>
                        <TableCell className="text-sm py-3 text-right text-amber-600 font-bold">{lot.expectedReadyDate}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CardContent className="md:hidden p-4 space-y-4">
              {dailySowingData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground opacity-50">
                  <Sprout className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm font-medium">No sowing data found.</p>
                </div>
              ) : (
                dailySowingData.map((lot: any) => (
                  <div key={lot.id} className="p-3 bg-muted/20 rounded-lg border space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase">Lot Number</div>
                        <div className="text-sm font-mono font-bold">{lot.lotNumber}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase">Sown</div>
                        <div className="text-sm font-bold">{lot.seedsSown}</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase">Variety</div>
                        <div className="text-sm">{(lot as any).variety?.name || "N/A"}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase">Ready</div>
                        <div className="text-sm text-amber-600 font-bold">{lot.expectedReadyDate}</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground pt-1 border-t border-dashed">
                      Sown Date: {lot.sowingDate}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock" className="mt-0">
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/10 pb-4">
              <CardTitle className="text-lg">Stock Report</CardTitle>
              <p className="text-xs text-muted-foreground">Current available stock across all sowing lots.</p>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Lot</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Variety</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Sown</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Available</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lotStockData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2 opacity-50">
                          <ShoppingBag className="w-8 h-8" />
                          <p className="text-sm font-medium">No stock data available.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    lotStockData.map((lot: any) => (
                      <TableRow key={lot.id} className="hover:bg-muted/20">
                        <TableCell className="text-sm py-3 font-mono font-bold">{lot.lotNumber}</TableCell>
                        <TableCell className="text-sm py-3">{(lot as any).variety?.name || "N/A"}</TableCell>
                        <TableCell className="text-right text-sm py-3">{lot.seedsSown}</TableCell>
                        <TableCell className="text-right text-sm py-3 font-black text-primary">{lot.available}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variety" className="mt-0">
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/10 pb-4">
              <CardTitle className="text-lg">Variety Performance</CardTitle>
              <p className="text-xs text-muted-foreground">Aggregated performance metrics by plant variety.</p>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Variety</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Total Sown</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-right text-destructive">Damaged</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-right text-primary">Available</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {varietyPerformance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2 opacity-50">
                          <BarChart3 className="w-8 h-8" />
                          <p className="text-sm font-medium">No variety performance data.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    varietyPerformance.map((v: any, idx) => (
                      <TableRow key={idx} className="hover:bg-muted/20">
                        <TableCell className="text-sm py-3 font-bold">{v.name}</TableCell>
                        <TableCell className="text-right text-sm py-3">{v.sown}</TableCell>
                        <TableCell className="text-right text-sm py-3 text-destructive font-medium">{v.damaged}</TableCell>
                        <TableCell className="text-right text-sm py-3 font-black text-primary">{v.available}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-0">
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/10 pb-4">
              <CardTitle className="text-lg">Payment Summary</CardTitle>
              <p className="text-xs text-muted-foreground">Breakdown of advance payments by payment mode.</p>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Mode</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Orders</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Total Advance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentSummary.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2 opacity-50">
                          <Search className="w-8 h-8" />
                          <p className="text-sm font-medium">No payment data for this period.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paymentSummary.map((p: any, idx) => (
                      <TableRow key={idx} className="hover:bg-muted/20">
                        <TableCell className="capitalize text-sm py-3 font-bold">{p.mode}</TableCell>
                        <TableCell className="text-right text-sm py-3 font-medium">{p.count}</TableCell>
                        <TableCell className="text-right text-sm py-3 font-black text-primary">₹{p.totalAdvance.toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
