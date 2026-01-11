import { useState } from "react";
import { useLots } from "@/hooks/use-lots";
import { useOrders } from "@/hooks/use-orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Download, Search, FileSpreadsheet, Truck, Sprout, ShoppingBag, CheckCircle, Calendar as CalendarIcon } from "lucide-react";
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
  const { data: orders, isLoading: loadingOrders } = useOrders();
  const [searchTerm, setSearchTerm] = useState("");
  
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: subMonths(new Date(), 1),
    to: new Date(),
  });

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
        const [obj, k] = key.split('.');
        return item[obj]?.[k] || "N/A";
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

  const today = format(new Date(), "yyyy-MM-dd");

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

  const filterData = (data: any[], keys: string[]) => {
    if (!searchTerm) return data;
    return data.filter(item => 
      keys.some(key => {
        const val = item[key];
        return val && val.toString().toLowerCase().includes(searchTerm.toLowerCase());
      })
    );
  };

  const dailySowingData = lots?.filter(l => isInRange(l.sowingDate)) || [];
  const pendingDeliveries = orders?.filter(o => o.status === "BOOKED" && isInRange(o.deliveryDate)) || [];
  const deliveredOrders = orders?.filter(o => o.status === "DELIVERED" && isInRange(o.deliveryDate)) || [];
  
  const filteredDeliveredOrders = filterData(deliveredOrders, ["customerName", "village"]);
  const deliveryVarietyReport = deliveredOrders.map(order => {
    const lot = lots?.find(l => l.id === order.lotId);
    const varietyName = (lot as any)?.variety?.name || "N/A";
    const categoryName = (lot as any)?.category?.name || "N/A";

    return {
      name: varietyName,
      category: categoryName,
      customerName: order.customerName,
      phone: order.phone,
      orderCount: 1,
      totalQty: order.bookedQty,
      totalAmount: Number(order.totalAmount)
    };
  });

  const deliveryVillageReport = deliveredOrders.map(order => {
    return {
      village: order.village || "Unknown",
      customerName: order.customerName,
      phone: order.phone,
      orderCount: 1,
      totalQty: order.bookedQty,
      paymentCollected: Number(order.advanceAmount),
      pendingBalance: Number(order.remainingBalance)
    };
  });

  const deliveryCategoryReport = deliveredOrders.map(order => {
    const lot = lots?.find(l => l.id === order.lotId);
    const catName = (lot as any)?.category?.name || "Unknown";
    return {
      name: catName,
      customerName: order.customerName,
      phone: order.phone,
      orderCount: 1,
      totalQty: order.bookedQty,
      totalRevenue: Number(order.totalAmount)
    };
  });

  const paymentSummary = Object.values(orders?.reduce((acc: any, order) => {
    const mode = order.paymentMode;
    if (!acc[mode]) acc[mode] = { mode, count: 0, totalAdvance: 0 };
    acc[mode].count += 1;
    acc[mode].totalAdvance += Number(order.advanceAmount);
    return acc;
  }, {}) || {});

  const lotStockData = lots?.map(l => ({
    ...l,
    available: l.available || 0
  })) || [];

  const varietyPerformance = Object.values(lots?.reduce((acc: any, lot) => {
    const vId = lot.varietyId;
    const varietyName = (lot as any).variety?.name || "N/A";
    if (!acc[vId]) acc[vId] = { name: varietyName, sown: 0, damaged: 0, available: 0 };
    acc[vId].sown += lot.seedsSown;
    acc[vId].damaged += lot.damaged;
    acc[vId].available += lot.available;
    return acc;
  }, {}) || {});

  const villageData = Object.values(orders?.reduce((acc: any, order) => {
    const village = order.village || "Unknown";
    if (!acc[village]) acc[village] = { village, orderCount: 0, totalQty: 0 };
    acc[village].orderCount += 1;
    acc[village].totalQty += order.bookedQty;
    return acc;
  }, {}) || {});


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
                placeholder="Customer, lot, variety..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="sowing" className="w-full">
        <div className="overflow-x-auto pb-2 scrollbar-hide">
          <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-8 mb-4">
            <TabsTrigger value="sowing" className="flex items-center gap-2 whitespace-nowrap">
              <Sprout className="w-4 h-4" /> <span className="hidden md:inline">Sowing</span><span className="md:hidden">Sow</span>
            </TabsTrigger>
            <TabsTrigger value="deliveries" className="flex items-center gap-2 whitespace-nowrap">
              <Truck className="w-4 h-4" /> <span className="hidden md:inline">Pending</span><span className="md:hidden">Wait</span>
            </TabsTrigger>
            <TabsTrigger value="delivered" className="flex items-center gap-2 whitespace-nowrap">
              <CheckCircle className="w-4 h-4" /> <span className="hidden md:inline">Delivered</span><span className="md:hidden">Done</span>
            </TabsTrigger>
            <TabsTrigger value="delivery-reports" className="flex items-center gap-2 whitespace-nowrap">
              <BarChart3 className="w-4 h-4" /> <span className="hidden md:inline">Delivery Stats</span><span className="md:hidden">Stats</span>
            </TabsTrigger>
            <TabsTrigger value="stock" className="flex items-center gap-2 whitespace-nowrap">
              <ShoppingBag className="w-4 h-4" /> <span className="hidden md:inline">Stock</span><span className="md:hidden">Inv</span>
            </TabsTrigger>
            <TabsTrigger value="variety" className="flex items-center gap-2 whitespace-nowrap">
              <BarChart3 className="w-4 h-4" /> <span className="hidden md:inline">Varieties</span><span className="md:hidden">Var.</span>
            </TabsTrigger>
            <TabsTrigger value="villages" className="flex items-center gap-2 whitespace-nowrap">
              <Search className="w-4 h-4" /> <span className="hidden md:inline">Villages</span><span className="md:hidden">Vill.</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2 whitespace-nowrap">
              <Search className="w-4 h-4" /> <span className="hidden md:inline">Payments</span><span className="md:hidden">Pay</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="sowing">
          <Card className="border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Sowing Report</CardTitle>
                <p className="text-sm text-muted-foreground">Detailed sowing data for the selected range.</p>
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
                  {filterData(dailySowingData, ["lotNumber", "sowingDate"]).map((lot) => (
                    <TableRow key={lot.id}>
                      <TableCell>{lot.sowingDate}</TableCell>
                      <TableCell className="font-medium">{lot.lotNumber}</TableCell>
                      <TableCell>{(lot as any).variety?.name || "N/A"}</TableCell>
                      <TableCell>{lot.seedsSown}</TableCell>
                      <TableCell>{lot.expectedReadyDate}</TableCell>
                    </TableRow>
                  ))}
                  {dailySowingData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No sowing recorded in this range.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deliveries">
          <Card className="border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Pending Delivery Report</CardTitle>
                <p className="text-sm text-muted-foreground">All booked orders awaiting delivery.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => exportToPDF(pendingDeliveries, "Pending_Deliveries", ["Customer", "Lot", "Qty", "Delivery Date", "Village"], ["customerName", "lot.lotNumber", "bookedQty", "deliveryDate", "village"])}>
                  Download PDF
                </Button>
                <Button size="sm" onClick={() => exportToExcel(pendingDeliveries, "Pending_Deliveries")}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Lot</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Delivery Date</TableHead>
                    <TableHead>Village</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterData(pendingDeliveries, ["customerName", "village"]).map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.customerName}</TableCell>
                      <TableCell>{(order as any).lot?.lotNumber || "N/A"}</TableCell>
                      <TableCell>{order.bookedQty}</TableCell>
                      <TableCell>{order.deliveryDate}</TableCell>
                      <TableCell>{order.village}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivered">
          <Card className="border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Delivered Orders Report</CardTitle>
                <p className="text-sm text-muted-foreground">All successfully delivered orders.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => exportToPDF(deliveredOrders, "Delivered_Orders", ["Customer", "Lot", "Qty", "Delivery Date", "Village"], ["customerName", "lot.lotNumber", "bookedQty", "deliveryDate", "village"])}>
                  Download PDF
                </Button>
                <Button size="sm" onClick={() => exportToExcel(deliveredOrders, "Delivered_Orders")}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Lot</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Delivery Date</TableHead>
                    <TableHead>Village</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterData(filteredDeliveredOrders, ["customerName", "village"]).map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.customerName}</TableCell>
                      <TableCell>{(order as any).lot?.lotNumber || "N/A"}</TableCell>
                      <TableCell>{order.bookedQty}</TableCell>
                      <TableCell>{order.deliveryDate}</TableCell>
                      <TableCell>{order.village}</TableCell>
                    </TableRow>
                  ))}
                  {filteredDeliveredOrders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No delivered orders found in this range.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivery-reports">
          <Tabs defaultValue="variety" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="variety">Variety-wise</TabsTrigger>
              <TabsTrigger value="village">Village-wise</TabsTrigger>
              <TabsTrigger value="category">Category-wise</TabsTrigger>
            </TabsList>

            <TabsContent value="variety">
              <Card className="border-none shadow-md">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Variety-wise Delivery Report</CardTitle>
                    <p className="text-sm text-muted-foreground">Performance analysis per plant variety.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => exportToPDF(deliveryVarietyReport, "Variety_Delivery_Report", ["Variety", "Category", "Customer", "Phone", "Orders", "Qty", "Total (₹)"], ["name", "category", "customerName", "phone", "orderCount", "totalQty", "totalAmount"])}>
                      Download PDF
                    </Button>
                    <Button size="sm" onClick={() => exportToExcel(deliveryVarietyReport, "Variety_Delivery_Report")}>
                      <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Variety Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveryVarietyReport.map((v: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{v.name}</TableCell>
                          <TableCell>{v.category}</TableCell>
                          <TableCell>{v.customerName}</TableCell>
                          <TableCell>{v.phone}</TableCell>
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
              <Card className="border-none shadow-md">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Village-wise Delivery Report</CardTitle>
                    <p className="text-sm text-muted-foreground">Delivery analysis by location.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => exportToPDF(deliveryVillageReport, "Village_Delivery_Report", ["Village", "Customer", "Phone", "Orders", "Qty", "Collected (₹)", "Pending (₹)"], ["village", "customerName", "phone", "orderCount", "totalQty", "paymentCollected", "pendingBalance"])}>
                      Download PDF
                    </Button>
                    <Button size="sm" onClick={() => exportToExcel(deliveryVillageReport, "Village_Delivery_Report")}>
                      <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Village Name</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Collected</TableHead>
                        <TableHead className="text-right">Pending Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveryVillageReport.map((v: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{v.village}</TableCell>
                          <TableCell>{v.customerName}</TableCell>
                          <TableCell>{v.phone}</TableCell>
                          <TableCell className="text-right">{v.orderCount}</TableCell>
                          <TableCell className="text-right">{v.totalQty}</TableCell>
                          <TableCell className="text-right text-green-600 font-bold">₹{v.paymentCollected.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-destructive font-bold">₹{v.pendingBalance.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="category">
              <Card className="border-none shadow-md">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Category-wise Delivery Report</CardTitle>
                    <p className="text-sm text-muted-foreground">Revenue performance by product category.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => exportToPDF(deliveryCategoryReport, "Category_Delivery_Report", ["Category", "Customer", "Phone", "Orders", "Qty", "Revenue (₹)"], ["name", "customerName", "phone", "orderCount", "totalQty", "totalRevenue"])}>
                      Download PDF
                    </Button>
                    <Button size="sm" onClick={() => exportToExcel(deliveryCategoryReport, "Category_Delivery_Report")}>
                      <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category Name</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Total Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveryCategoryReport.map((v: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{v.name}</TableCell>
                          <TableCell>{v.customerName}</TableCell>
                          <TableCell>{v.phone}</TableCell>
                          <TableCell className="text-right">{v.orderCount}</TableCell>
                          <TableCell className="text-right">{v.totalQty}</TableCell>
                          <TableCell className="text-right font-black text-primary">₹{v.totalRevenue.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="stock">
          <Card className="border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Lot-wise Stock Report</CardTitle>
                <p className="text-sm text-muted-foreground">Current availability across all lots.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => exportToPDF(lotStockData, "Stock_Report", ["Lot Number", "Variety", "Seeds Sown", "Damaged", "Available"], ["lotNumber", "variety.name", "seedsSown", "damaged", "available"])}>
                  Download PDF
                </Button>
                <Button size="sm" onClick={() => exportToExcel(lotStockData, "Stock_Report")}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lot Number</TableHead>
                    <TableHead>Variety</TableHead>
                    <TableHead>Seeds Sown</TableHead>
                    <TableHead>Damaged</TableHead>
                    <TableHead>Available</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterData(lotStockData, ["lotNumber"]).map((lot) => (
                    <TableRow key={lot.id}>
                      <TableCell className="font-medium">{lot.lotNumber}</TableCell>
                      <TableCell>{(lot as any).variety?.name || "N/A"}</TableCell>
                      <TableCell>{lot.seedsSown}</TableCell>
                      <TableCell className="text-destructive">{lot.damaged}</TableCell>
                      <TableCell className="font-bold text-primary">{lot.available}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variety">
          <Card className="border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Variety Performance</CardTitle>
                <p className="text-sm text-muted-foreground">Aggregated success rates per variety.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => exportToPDF(varietyPerformance, "Variety_Performance", ["Variety", "Total Sown", "Total Damaged", "Total Available"], ["name", "sown", "damaged", "available"])}>
                  Download PDF
                </Button>
                <Button size="sm" onClick={() => exportToExcel(varietyPerformance, "Variety_Performance")}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variety Name</TableHead>
                    <TableHead>Total Sown</TableHead>
                    <TableHead>Total Damaged</TableHead>
                    <TableHead>Total Available</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {varietyPerformance.map((v: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{v.name}</TableCell>
                      <TableCell>{v.sown}</TableCell>
                      <TableCell className="text-destructive">{v.damaged}</TableCell>
                      <TableCell className="font-bold text-primary">{v.available}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="villages">
          <Card className="border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Village Distribution</CardTitle>
                <p className="text-sm text-muted-foreground">Orders and quantity by village.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => exportToPDF(villageData, "Village_Distribution", ["Village", "Order Count", "Total Quantity"], ["village", "orderCount", "totalQty"])}>
                  Download PDF
                </Button>
                <Button size="sm" onClick={() => exportToExcel(villageData, "Village_Distribution")}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Village Name</TableHead>
                    <TableHead>Total Orders</TableHead>
                    <TableHead>Total Plants Booked</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {villageData.map((v: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{v.village}</TableCell>
                      <TableCell>{v.orderCount}</TableCell>
                      <TableCell className="font-bold">{v.totalQty}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card className="border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Payment Summary</CardTitle>
                <p className="text-sm text-muted-foreground">Advances collected by payment mode.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => exportToPDF(paymentSummary, "Payment_Summary", ["Mode", "Transaction Count", "Total Advance"], ["mode", "count", "totalAdvance"])}>
                  Download PDF
                </Button>
                <Button size="sm" onClick={() => exportToExcel(paymentSummary, "Payment_Summary")}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment Mode</TableHead>
                    <TableHead>Transactions</TableHead>
                    <TableHead>Total Advance (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentSummary.map((p: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{p.mode}</TableCell>
                      <TableCell>{p.count}</TableCell>
                      <TableCell className="font-bold text-green-600">₹{p.totalAdvance.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
