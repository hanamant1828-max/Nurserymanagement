import { useState, useMemo } from "react";
import { useLots } from "@/hooks/use-lots";
import { useOrders } from "@/hooks/use-orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, FileSpreadsheet, Truck, CheckCircle, BarChart3, Calendar as CalendarIcon } from "lucide-react";
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
  const { data: orders, isLoading: loadingOrders } = useOrders();
  const [searchTerm, setSearchTerm] = useState("");
  
  const [activeTab, setActiveTab] = useState<string>("pending");
  
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: subMonths(new Date(), 1),
    to: new Date(),
  });

  const [pageDistrictId, setPageDistrictId] = useState<string>("all");
  const [pageTalukId, setPageTalukId] = useState<string>("all");

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

  const uniqueDistricts = useMemo(() => {
    if (!orders) return [];
    const districts = new Set(orders.map(o => o.district).filter(Boolean));
    return Array.from(districts).sort();
  }, [orders]);

  const uniqueTaluks = useMemo(() => {
    if (!orders) return [];
    const taluks = new Set(
      orders
        .filter(o => pageDistrictId === "all" || o.district === pageDistrictId)
        .map(o => o.taluk)
        .filter(Boolean)
    );
    return Array.from(taluks).sort();
  }, [orders, pageDistrictId]);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    let filtered = orders;

    if (pageDistrictId !== "all") {
      filtered = filtered.filter(item => item.district === pageDistrictId);
    }
    
    if (pageTalukId !== "all") {
      filtered = filtered.filter(item => item.taluk === pageTalukId);
    }

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        (item.customerName?.toLowerCase().includes(s)) ||
        (item.village?.toLowerCase().includes(s)) ||
        (item.phone?.toLowerCase().includes(s))
      );
    }

    return filtered;
  }, [orders, searchTerm, pageDistrictId, pageTalukId]);

  const pendingDeliveries = useMemo(() => {
    return filteredOrders.filter(o => o.status === "BOOKED" && isInRange(o.deliveryDate)).map(o => {
      const lot = lots?.find(l => l.id === o.lotId);
      return {
        ...o,
        varietyName: (lot as any)?.variety?.name || "N/A",
        lotNumber: lot?.lotNumber || "N/A"
      };
    });
  }, [filteredOrders, lots, dateRange]);

  const deliveredOrders = useMemo(() => {
    return filteredOrders.filter(o => o.status === "DELIVERED" && isInRange(o.deliveryDate)).map(o => {
      const lot = lots?.find(l => l.id === o.lotId);
      return {
        ...o,
        varietyName: (lot as any)?.variety?.name || "N/A",
        lotNumber: lot?.lotNumber || "N/A"
      };
    });
  }, [filteredOrders, lots, dateRange]);

  const deliveryVarietyReport = useMemo(() => {
    const report: Record<string, any> = {};
    deliveredOrders.forEach(order => {
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
    deliveredOrders.forEach(order => {
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
                    onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
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
                    onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
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

        <div className="flex flex-wrap items-center gap-4 bg-muted/20 p-4 rounded-lg border border-dashed">
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
                {uniqueDistricts.map(d => (
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
                {uniqueTaluks.map(t => (
                  <SelectItem key={t} value={t || "Unknown"}>{t || "Unknown"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Tabs defaultValue="pending" value={activeTab} className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Truck className="w-4 h-4" /> <span>Pending Deliveries</span>
          </TabsTrigger>
          <TabsTrigger value="delivered" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> <span>Delivered Orders</span>
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> <span>Stats Analysis</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Pending Deliveries</CardTitle>
                <p className="text-sm text-muted-foreground">Booked orders awaiting delivery.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => exportToPDF(pendingDeliveries, "Pending_Deliveries", ["Customer", "Variety", "Lot", "Qty", "Date", "Village"], ["customerName", "varietyName", "lotNumber", "bookedQty", "deliveryDate", "village"])}>
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
                    <TableHead>Date</TableHead>
                    <TableHead>Village</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingDeliveries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No pending deliveries found.</TableCell>
                    </TableRow>
                  ) : (
                    pendingDeliveries.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.customerName}</TableCell>
                        <TableCell>{order.varietyName}</TableCell>
                        <TableCell>{order.lotNumber}</TableCell>
                        <TableCell className="text-right">{order.bookedQty}</TableCell>
                        <TableCell>{order.deliveryDate}</TableCell>
                        <TableCell>{order.village}</TableCell>
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
                <Button variant="outline" size="sm" onClick={() => exportToPDF(deliveredOrders, "Delivered_Orders", ["Customer", "Variety", "Qty", "Total", "Date", "Village"], ["customerName", "varietyName", "bookedQty", "totalAmount", "deliveryDate", "village"])}>
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
                    <TableHead>Date</TableHead>
                    <TableHead>Village</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No delivered orders found.</TableCell>
                    </TableRow>
                  ) : (
                    deliveredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.customerName}</TableCell>
                        <TableCell>{order.varietyName}</TableCell>
                        <TableCell className="text-right">{order.bookedQty}</TableCell>
                        <TableCell className="text-right">₹{Number(order.totalAmount).toLocaleString()}</TableCell>
                        <TableCell>{order.deliveryDate}</TableCell>
                        <TableCell>{order.village}</TableCell>
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
            <TabsList className="mb-4">
              <TabsTrigger value="variety">Variety-wise</TabsTrigger>
              <TabsTrigger value="village">Village-wise</TabsTrigger>
            </TabsList>
            <TabsContent value="variety">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Variety Delivery Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Variety</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveryVarietyReport.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No data available for the selected period.</TableCell>
                        </TableRow>
                      ) : (
                        deliveryVarietyReport.map((v: any, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{v.name}</TableCell>
                            <TableCell className="text-right">{v.orderCount}</TableCell>
                            <TableCell className="text-right">{v.totalQty}</TableCell>
                            <TableCell className="text-right">₹{v.totalAmount.toLocaleString()}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="village">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Village Delivery Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Village</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Collected</TableHead>
                        <TableHead className="text-right">Pending</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveryVillageReport.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No data available for the selected period.</TableCell>
                        </TableRow>
                      ) : (
                        deliveryVillageReport.map((v: any, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{v.village}</TableCell>
                            <TableCell className="text-right">{v.orderCount}</TableCell>
                            <TableCell className="text-right">{v.totalQty}</TableCell>
                            <TableCell className="text-right">₹{v.paymentCollected.toLocaleString()}</TableCell>
                            <TableCell className="text-right">₹{v.pendingBalance.toLocaleString()}</TableCell>
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
