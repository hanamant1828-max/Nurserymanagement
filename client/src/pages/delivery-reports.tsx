import { useState, useMemo, useEffect } from "react";
import { useLots } from "@/hooks/use-lots";
import { useOrders } from "@/hooks/use-orders";
import { useCategories } from "@/hooks/use-categories";
import { useVarieties } from "@/hooks/use-varieties";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, FileSpreadsheet, Truck, CheckCircle, BarChart3, Calendar as CalendarIcon, MapPin, Layers, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  // Persistence key
  const PERSISTENCE_KEY = "delivery_reports_filters_state";

  // Initial state helper
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

  // Persist state changes
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
      // Use actualDeliveryDate if available, otherwise use fallback (deliveryDate)
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
        return lot?.categoryId.toString() === selectedCategory;
      });
    }

    if (selectedVariety !== "all") {
      filtered = filtered.filter((item: any) => {
        const lot = lots?.find((l: any) => l.id === item.lotId);
        return lot?.varietyId.toString() === selectedVariety;
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
  }, [orders, searchTerm, pageDistrictId, pageTalukId]);

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
    return pendingDeliveries.reduce((sum: number, order: any) => sum + (order.bookedQty || 0), 0);
  }, [pendingDeliveries]);

  const totalQtyDelivered = useMemo(() => {
    return deliveredOrders.reduce((sum: number, order: any) => sum + (order.bookedQty || 0), 0);
  }, [deliveredOrders]);

  const deliveryVarietyReport = useMemo(() => {
    const report: Record<string, any> = {};
    deliveredOrders.forEach((order: any) => {
      const key = order.varietyName;
      if (!report[key]) {
        report[key] = {
          name: key,
          orderCount: 0,
          totalQty: 0,
          totalAmount: 0
        };
      }
      report[key].orderCount += 1;
      report[key].totalQty += order.bookedQty;
      report[key].totalAmount += Number(order.totalAmount);
    });
    return Object.values(report);
  }, [deliveredOrders]);

  const deliveryVillageReport = useMemo(() => {
    const report: Record<string, any> = {};
    deliveredOrders.forEach((order: any) => {
      const key = order.village || "Unknown";
      if (!report[key]) {
        report[key] = {
          village: key,
          orderCount: 0,
          totalQty: 0,
          paymentCollected: 0,
          pendingBalance: 0
        };
      }
      report[key].orderCount += 1;
      report[key].totalQty += order.bookedQty;
      report[key].paymentCollected += Number(order.advanceAmount);
      report[key].pendingBalance += Number(order.remainingBalance);
    });
    return Object.values(report);
  }, [deliveredOrders]);

  if (loadingLots || loadingOrders) {
    return <div className="p-8 text-center text-muted-foreground">Loading delivery reports...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Delivery Reports</h1>
          <p className="text-muted-foreground">Track pending and completed deliveries.</p>
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
                placeholder="Customer, village, phone..." 
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
            className="absolute -top-3 right-4 bg-background border h-7 text-[10px] font-bold uppercase hover:bg-destructive hover:text-destructive-foreground transition-colors"
            onClick={handleClearFilters}
          >
            Clear Filters
          </Button>
          <div className="flex flex-col gap-1 w-[200px]">
            <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Filter by District</span>
            <Select value={pageDistrictId} onValueChange={(val) => {
              setPageDistrictId(val);
              setPageTalukId("all");
            }}>
              <SelectTrigger className="bg-background">
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

          <div className="flex flex-col gap-1 w-[200px]">
            <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Filter by Taluk</span>
            <Select value={pageTalukId} onValueChange={setPageTalukId} disabled={pageDistrictId === "all"}>
              <SelectTrigger className="bg-background">
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
              <SelectContent className="z-[100]">
                <SelectItem value="all">All Varieties</SelectItem>
                {varieties?.filter((v: any) => selectedCategory === "all" || v.categoryId.toString() === selectedCategory).map((v: any) => (
                  <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Tabs defaultValue="pending" value={activeTab} className="w-full" onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <TabsList className="flex w-full overflow-x-auto pb-2 scrollbar-hide">
            <TabsTrigger value="pending" className="flex items-center gap-2 flex-1 min-w-[160px]">
              <Truck className="w-4 h-4" /> <span>Pending Deliveries</span>
            </TabsTrigger>
            <TabsTrigger value="delivered" className="flex items-center gap-2 flex-1 min-w-[160px]">
              <CheckCircle className="w-4 h-4" /> <span>Delivered Orders</span>
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2 flex-1 min-w-[160px]">
              <BarChart3 className="w-4 h-4" /> <span>Stats Analysis</span>
            </TabsTrigger>
          </TabsList>

          <Card className="sm:w-64 bg-primary/5 border-primary/20 shadow-sm">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Sprout className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                    {activeTab === "pending" ? "Total to Deliver" : "Total Delivered Qty"}
                  </p>
                  <p className="text-xl font-black text-primary">
                    {(activeTab === "pending" ? totalQtyToDeliver : totalQtyDelivered).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <TabsContent value="pending">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Pending Deliveries</CardTitle>
                <p className="text-sm text-muted-foreground">Booked orders awaiting delivery.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => exportToPDF(pendingDeliveries, "Pending_Deliveries", ["Customer", "Variety", "Lot", "Qty", "Exp. Date", "Village", "Taluk"], ["customerName", "varietyName", "lotNumber", "bookedQty", "deliveryDate", "village", "taluk"])}>
                  PDF
                </Button>
                <Button size="sm" onClick={() => exportToExcel(pendingDeliveries, "Pending_Deliveries")}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Variety</TableHead>
                    <TableHead>Lot</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Exp. Date</TableHead>
                    <TableHead>Village</TableHead>
                    <TableHead>Taluk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingDeliveries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No pending deliveries found.</TableCell>
                    </TableRow>
                  ) : (
                    pendingDeliveries.map((order: any) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.customerName}</TableCell>
                        <TableCell>{order.varietyName}</TableCell>
                        <TableCell>{order.lotNumber}</TableCell>
                        <TableCell className="text-right">{order.bookedQty}</TableCell>
                        <TableCell>{order.deliveryDate}</TableCell>
                        <TableCell className="font-black text-base">{order.village}</TableCell>
                        <TableCell>{order.taluk || "N/A"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivered">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Delivered Orders</CardTitle>
                <p className="text-sm text-muted-foreground">Orders successfully delivered.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => exportToPDF(deliveredOrders, "Delivered_Orders", ["Customer", "Variety", "Qty", "Total", "Exp. Date", "Actual Date", "Village", "Taluk"], ["customerName", "varietyName", "bookedQty", "totalAmount", "deliveryDate", "actualDeliveryDate", "village", "taluk"])}>
                  PDF
                </Button>
                <Button size="sm" onClick={() => exportToExcel(deliveredOrders, "Delivered_Orders")}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Variety</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Exp. Date</TableHead>
                    <TableHead>Actual Date</TableHead>
                    <TableHead>Village</TableHead>
                    <TableHead>Taluk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No delivered orders found.</TableCell>
                    </TableRow>
                  ) : (
                    deliveredOrders.map((order: any) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.customerName}</TableCell>
                        <TableCell>{order.varietyName}</TableCell>
                        <TableCell className="text-right">{order.bookedQty}</TableCell>
                        <TableCell className="text-right">₹{Number(order.totalAmount).toLocaleString()}</TableCell>
                        <TableCell>{order.deliveryDate}</TableCell>
                        <TableCell>{order.actualDeliveryDate || "N/A"}</TableCell>
                        <TableCell className="font-black text-base">{order.village}</TableCell>
                        <TableCell>{order.taluk || "N/A"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis">
          <Tabs defaultValue="variety">
            <TabsList className="flex w-full mb-4 overflow-x-auto scrollbar-hide">
              <TabsTrigger value="variety" className="flex-1 min-w-[120px]">Variety-wise</TabsTrigger>
              <TabsTrigger value="village" className="flex-1 min-w-[120px]">Village-wise</TabsTrigger>
            </TabsList>
            <TabsContent value="variety">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Variety</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">Total Qty</TableHead>
                        <TableHead className="text-right">Total Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveryVarietyReport.map((v: any) => (
                        <TableRow key={v.name}>
                          <TableCell className="font-bold">{v.name}</TableCell>
                          <TableCell className="text-right">{v.orderCount}</TableCell>
                          <TableCell className="text-right">{v.totalQty}</TableCell>
                          <TableCell className="text-right">₹{v.totalAmount.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="village">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Village</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">Collected</TableHead>
                        <TableHead className="text-right">Pending</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveryVillageReport.map((v: any) => (
                        <TableRow key={v.village}>
                          <TableCell className="font-bold">{v.village}</TableCell>
                          <TableCell className="text-right">{v.orderCount}</TableCell>
                          <TableCell className="text-right text-green-600">₹{v.paymentCollected.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-orange-600">₹{v.pendingBalance.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
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
