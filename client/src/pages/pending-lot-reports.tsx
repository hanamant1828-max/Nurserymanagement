import { useOrders } from "@/hooks/use-orders";
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, FileSpreadsheet, Search, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export default function PendingLotReportsPage() {
  const { data: ordersData, isLoading } = useOrders(1, 10000);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");

  const orders = useMemo(() => {
    if (!ordersData) return [];
    if (Array.isArray(ordersData)) return ordersData;
    if (ordersData && typeof ordersData === "object" && "orders" in ordersData) {
      return (ordersData as any).orders;
    }
    return [];
  }, [ordersData]);

  const pendingLotOrders = useMemo(() => {
    return orders.filter(
      (o: any) => o && o.lotStatus === "PENDING_LOT" && o.status === "BOOKED"
    );
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let filtered = pendingLotOrders;

    if (selectedDate) {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      filtered = filtered.filter((o: any) => o.sowingDate === dateStr);
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (o: any) =>
          o.customerName.toLowerCase().includes(lowerSearch) ||
          o.phone.includes(lowerSearch) ||
          (o.lot?.variety?.name || "").toLowerCase().includes(lowerSearch)
      );
    }

    return filtered;
  }, [pendingLotOrders, selectedDate, searchTerm]);

  const totalBookedQty = filteredOrders.reduce(
    (sum: number, o: any) => sum + (Number(o.bookedQty) || 0),
    0
  );

  const uniqueCustomers = useMemo(() => {
    const names = new Set(filteredOrders.map((o: any) => o.customerName));
    return names.size;
  }, [filteredOrders]);

  const handleDownloadExcel = () => {
    if (filteredOrders.length === 0) return;
    const data = filteredOrders.map((o: any) => ({
      Customer: o.customerName,
      Phone: o.phone,
      Variety: o.variety?.name || o.lot?.variety?.name || "Unknown",
      "Booked Qty": o.bookedQty,
      Status: "Lot Pending",
      "Sowing Date": o.sowingDate || "N/A",
      "Delivery Date": o.deliveryDate || "N/A",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pending Lots");
    XLSX.writeFile(wb, `Pending_Lot_Report_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const handleDownloadPDF = () => {
    if (filteredOrders.length === 0) return;
    const doc = new jsPDF();
    doc.text("Pending Lot Report", 14, 15);
    const headers = ["Customer", "Variety", "Booked Qty", "Sowing Date", "Delivery Date"];
    const data = filteredOrders.map((o: any) => [
      o.customerName,
      o.variety?.name || o.lot?.variety?.name || "Unknown",
      o.bookedQty,
      o.sowingDate || "N/A",
      o.deliveryDate || "N/A",
    ]);
    autoTable(doc, { head: [headers], body: data, startY: 20 });
    doc.save(`Pending_Lot_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  return (
    <div className="space-y-6 px-4 md:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pending Lot Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Orders waiting for lot allocation.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2"
            onClick={handleDownloadPDF}
            disabled={filteredOrders.length === 0}
          >
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2"
            onClick={handleDownloadExcel}
            disabled={filteredOrders.length === 0}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-blue-50/50 dark:from-blue-950/30 dark:to-blue-950/20 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">{pendingLotOrders.length}</div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-semibold uppercase tracking-wider">Total Orders</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-green-50/50 dark:from-green-950/30 dark:to-green-950/20 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="text-3xl font-bold text-green-700 dark:text-green-300">{totalBookedQty}</div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-semibold uppercase tracking-wider">Total Qty</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-amber-50/50 dark:from-amber-950/30 dark:to-amber-950/20 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="text-3xl font-bold text-amber-700 dark:text-amber-300">{uniqueCustomers}</div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-semibold uppercase tracking-wider">Customers</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-purple-50/50 dark:from-purple-950/30 dark:to-purple-950/20 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">{filteredOrders.length}</div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-2 font-semibold uppercase tracking-wider">Results</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Card */}
      <Card className="border shadow-sm">
        <CardContent className="p-5">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Search & Filter</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by customer, phone or variety..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-9 justify-start text-left font-normal w-full sm:w-[220px] text-sm",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick sowing date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                  {selectedDate && (
                    <div className="p-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => setSelectedDate(undefined)}
                      >
                        Clear Filter
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Desktop Table */}
      <div className="hidden lg:block">
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="py-4 pl-6 font-bold text-xs uppercase tracking-wider">Customer</TableHead>
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider">Variety</TableHead>
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider">Booked Qty</TableHead>
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider text-center">Status</TableHead>
                <TableHead className="py-4 font-bold text-xs uppercase tracking-wider">Sowing Date</TableHead>
                <TableHead className="py-4 pr-6 font-bold text-xs uppercase tracking-wider">Delivery Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [1, 2, 3].map((i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-6">
                      <div className="h-5 w-32 bg-muted animate-pulse rounded" />
                      <div className="h-3 w-20 bg-muted animate-pulse rounded mt-1" />
                    </TableCell>
                    <TableCell><div className="h-5 w-28 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-6 w-12 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-6 w-20 mx-auto bg-muted animate-pulse rounded-full" /></TableCell>
                    <TableCell><div className="h-5 w-24 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell className="pr-6"><div className="h-5 w-24 bg-muted animate-pulse rounded" /></TableCell>
                  </TableRow>
                ))
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <ShoppingCart className="w-12 h-12 opacity-10" />
                      <p className="text-sm font-medium">No pending lot orders found</p>
                      {(searchTerm || selectedDate) && (
                        <Button
                          variant="ghost"
                          onClick={() => { setSearchTerm(""); setSelectedDate(undefined); }}
                          className="text-primary h-auto p-0"
                        >
                          Clear filters
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order: any) => (
                  <TableRow key={order.id} className="group hover:bg-muted/10 transition-colors">
                    <TableCell className="pl-6 py-4">
                      <div className="font-bold text-sm">{order.customerName}</div>
                      <div className="text-xs text-muted-foreground font-medium">{order.phone}</div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="font-semibold text-sm">
                        {order.variety?.name || order.lot?.variety?.name || "Unknown Variety"}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                        {order.category?.name || order.lot?.category?.name || "Unknown"}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="font-mono font-black text-primary bg-primary/5 px-2 py-1 rounded">
                        {order.bookedQty}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      <Badge variant="destructive" className="rounded-full px-3 py-0.5 font-medium text-[10px] uppercase tracking-wide">
                        Lot Pending
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="text-sm font-medium">
                        {order.sowingDate ? format(parseISO(order.sowingDate), "dd MMM yyyy") : "N/A"}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 pr-6">
                      <div className="text-sm font-bold text-orange-600">
                        {order.deliveryDate ? format(parseISO(order.deliveryDate), "dd MMM yyyy") : "N/A"}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile / Tablet Card View */}
      <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 bg-muted animate-pulse rounded-2xl border" />
          ))
        ) : filteredOrders.length === 0 ? (
          <div className="col-span-full py-20 text-center border-2 border-dashed rounded-2xl border-muted-foreground/10">
            <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-5" />
            <p className="text-muted-foreground font-medium">No pending lot orders found</p>
          </div>
        ) : (
          filteredOrders.map((order: any) => (
            <div
              key={order.id}
              className="group relative bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-primary/20 transition-all"
            >
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="font-bold text-base leading-tight">{order.customerName}</h3>
                    <p className="text-xs text-muted-foreground">{order.phone}</p>
                  </div>
                  <Badge variant="destructive" className="rounded-full text-[10px] uppercase tracking-wider h-5 flex-shrink-0">
                    Lot Pending
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-muted/40 rounded-xl p-3">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Variety</p>
                    <p className="font-semibold leading-tight">
                      {order.variety?.name || order.lot?.variety?.name || "Unknown"}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">
                      {order.category?.name || order.lot?.category?.name || ""}
                    </p>
                  </div>
                  <div className="bg-primary/5 rounded-xl p-3 flex flex-col items-center justify-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Booked Qty</p>
                    <span className="font-mono font-black text-primary text-2xl">{order.bookedQty}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground font-semibold uppercase tracking-widest text-[9px]">Sowing Date</p>
                    <p className="font-medium mt-0.5">
                      {order.sowingDate ? format(parseISO(order.sowingDate), "dd MMM yyyy") : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-semibold uppercase tracking-widest text-[9px]">Delivery Date</p>
                    <p className="font-bold text-orange-600 mt-0.5">
                      {order.deliveryDate ? format(parseISO(order.deliveryDate), "dd MMM yyyy") : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
