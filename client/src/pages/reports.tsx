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

  const dailySowingData = useMemo(() => filteredLots.filter((l: any) => isInRange(l.expectedReadyDate || l.sowingDate)) || [], [filteredLots, dateRange]);

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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Reports</h1>
          <p className="text-muted-foreground">Detailed data analysis and export center.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1">From</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    {dateRange.from ? format(dateRange.from, "MMM dd, y") : <span>Pick date</span>}
                  </Button>
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
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1">To</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    {dateRange.to ? format(dateRange.to, "MMM dd, y") : <span>Pick date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
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

          <div className="flex flex-col gap-1 w-full sm:w-64">
            <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Search</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-muted/20 p-4 rounded-lg border border-dashed relative">
          <Button 
            variant="ghost" 
            size="sm" 
            className="absolute -top-3 right-2 bg-background border h-7 text-[10px] font-bold uppercase hover:bg-destructive hover:text-destructive-foreground transition-colors"
            onClick={handleClearFilters}
          >
            Clear Filters
          </Button>
          <div className="flex flex-col gap-1 w-[200px]">
            <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Filter by Category</span>
            <Select value={selectedCategory} onValueChange={(val) => {
              setSelectedCategory(val);
              setSelectedVariety("all");
            }}>
              <SelectTrigger className="bg-background">
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

          <div className="flex flex-col gap-1 w-[200px]">
            <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Filter by Variety</span>
            <Select value={selectedVariety} onValueChange={setSelectedVariety} disabled={selectedCategory === "all"}>
              <SelectTrigger className="bg-background">
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
      </div>

      <Tabs defaultValue="sowing" value={activeTab} className="w-full" onValueChange={setActiveTab}>
        <TabsList className="flex w-full mb-6 overflow-x-auto pb-2 scrollbar-hide">
          <TabsTrigger value="sowing" className="flex items-center gap-2 flex-1 min-w-[140px]">
            <Sprout className="w-4 h-4" /> <span>Sowing</span>
          </TabsTrigger>
          <TabsTrigger value="stock" className="flex items-center gap-2 flex-1 min-w-[140px]">
            <ShoppingBag className="w-4 h-4" /> <span>Stock</span>
          </TabsTrigger>
          <TabsTrigger value="variety" className="flex items-center gap-2 flex-1 min-w-[140px]">
            <BarChart3 className="w-4 h-4" /> <span>Varieties</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2 flex-1 min-w-[140px]">
            <Search className="w-4 h-4" /> <span>Payments</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sowing">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Sowing Report</CardTitle>
                <p className="text-sm text-muted-foreground">Detailed sowing data.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => exportToPDF(dailySowingData, "Sowing_Report", ["Date", "Lot Number", "Variety", "Seeds Sown", "Ready Date"], ["sowingDate", "lotNumber", "variety.name", "seedsSown", "expectedReadyDate"])}>
                  Download PDF
                </Button>
                <Button size="sm" onClick={() => exportToExcel(dailySowingData, "Sowing_Report")}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Lot Number</TableHead>
                    <TableHead>Variety</TableHead>
                    <TableHead>Seeds Sown</TableHead>
                    <TableHead>Ready Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailySowingData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No sowing data found.</TableCell>
                    </TableRow>
                  ) : (
                    dailySowingData.map((lot: any) => (
                      <TableRow key={lot.id}>
                        <TableCell>{lot.sowingDate}</TableCell>
                        <TableCell className="font-medium">{lot.lotNumber}</TableCell>
                        <TableCell>{(lot as any).variety?.name || "N/A"}</TableCell>
                        <TableCell>{lot.seedsSown}</TableCell>
                        <TableCell>{lot.expectedReadyDate}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Stock Report</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lot</TableHead>
                    <TableHead>Variety</TableHead>
                    <TableHead className="text-right">Sowing Date</TableHead>
                    <TableHead className="text-right">Ready Date</TableHead>
                    <TableHead className="text-right">Sown</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lotStockData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No stock data available.</TableCell>
                    </TableRow>
                  ) : (
                    lotStockData.map((lot: any) => (
                      <TableRow key={lot.id}>
                        <TableCell>{lot.lotNumber}</TableCell>
                        <TableCell>{(lot as any).variety?.name || "N/A"}</TableCell>
                        <TableCell className="text-right">{lot.sowingDate}</TableCell>
                        <TableCell className="text-right">{lot.expectedReadyDate}</TableCell>
                        <TableCell className="text-right">{lot.seedsSown}</TableCell>
                        <TableCell className="text-right font-bold">{lot.available}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variety">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Variety Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variety</TableHead>
                    <TableHead className="text-right">Total Sown</TableHead>
                    <TableHead className="text-right">Total Available</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {varietyPerformance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No variety performance data.</TableCell>
                    </TableRow>
                  ) : (
                    varietyPerformance.map((v: any, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{v.name}</TableCell>
                        <TableCell className="text-right">{v.sown}</TableCell>
                        <TableCell className="text-right">{v.available}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mode</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Total Advance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentSummary.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No payment data for the selected period.</TableCell>
                    </TableRow>
                  ) : (
                    paymentSummary.map((p: any, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="capitalize">{p.mode}</TableCell>
                        <TableCell className="text-right">{p.count}</TableCell>
                        <TableCell className="text-right">₹{p.totalAdvance.toLocaleString()}</TableCell>
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
