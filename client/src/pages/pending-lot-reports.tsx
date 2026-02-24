import { useOrders } from "@/hooks/use-orders";
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, FileSpreadsheet, Loader2, Search, ShoppingCart, Download } from "lucide-react";
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
    if (ordersData && typeof ordersData === 'object' && 'orders' in ordersData) {
      return ordersData.orders;
    }
    return [];
  }, [ordersData]);

  const pendingLotOrders = useMemo(() => {
    return orders.filter((o: any) => 
      o && o.lotStatus === 'PENDING_LOT' && o.status === 'BOOKED'
    );
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let filtered = pendingLotOrders;

    if (selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      // Note: Orders don't have a direct 'sowingDate', but the user mentioned "sowing date count" 
      // for orders without lots. In this system, sowingDate is likely captured as an optional field 
      // or intended to be filtered by. Checking if sowingDate exists on order.
      filtered = filtered.filter((o: any) => o.sowingDate === dateStr);
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter((o: any) => 
        o.customerName.toLowerCase().includes(lowerSearch) ||
        o.phone.includes(lowerSearch) ||
        (o.lot?.variety?.name || "").toLowerCase().includes(lowerSearch)
      );
    }

    return filtered;
  }, [pendingLotOrders, selectedDate, searchTerm]);

  const totalBookedQty = filteredOrders.reduce((sum, o) => sum + (Number(o.bookedQty) || 0), 0);

  const handleDownloadExcel = () => {
    if (filteredOrders.length === 0) return;
    const data = filteredOrders.map(o => ({
      Customer: o.customerName,
      Phone: o.phone,
      Variety: o.variety?.name || o.lot?.variety?.name || "Unknown",
      "Booked Qty": o.bookedQty,
      Status: "Lot Pending",
      "Sowing Date": o.sowingDate || "N/A",
      "Delivery Date": o.deliveryDate || "N/A"
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
    const data = filteredOrders.map(o => [
      o.customerName,
      o.variety?.name || o.lot?.variety?.name || "Unknown",
      o.bookedQty,
      o.sowingDate || "N/A",
      o.deliveryDate || "N/A"
    ]);

    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 20,
    });

    doc.save(`Pending_Lot_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">Pending Lot Reports</h1>
          <p className="text-muted-foreground mt-1 font-medium">Orders waiting for lot allocation</p>
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
          <Badge variant="outline" className="px-4 py-1 text-sm font-bold bg-primary/5 border-primary/20 text-primary">
            Total Orders: {filteredOrders.length}
          </Badge>
          <Badge variant="outline" className="px-4 py-1 text-sm font-bold bg-orange-50 border-orange-200 text-orange-600">
            Total Qty: {totalBookedQty}
          </Badge>
        </div>
      </div>

      <Card className="border-none shadow-md overflow-hidden bg-card">
        <CardHeader className="border-b bg-muted/30 pb-4">
          <div className="flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
            <div className="flex-1 w-full md:max-w-sm relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customer, phone or variety..."
                className="pl-9 h-11 bg-background border-muted-foreground/20 focus-visible:ring-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-11 justify-start text-left font-normal border-muted-foreground/20 w-full md:w-[240px]",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick sowing date</span>}
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
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">Customer</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">Variety</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">Booked Qty</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-center">Status</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">Sowing Date</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">Delivery Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order: any) => (
                    <TableRow key={order.id} className="hover:bg-muted/30 transition-colors border-b border-border/50">
                      <TableCell className="py-4">
                        <div className="font-bold text-sm text-foreground">{order.customerName}</div>
                        <div className="text-[10px] text-muted-foreground font-medium tracking-tight">{order.phone}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-sm">
                          {(order as any).variety?.name || (order as any).lot?.variety?.name || "Unknown Variety"}
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                          {(order as any).category?.name || (order as any).lot?.category?.name || "Unknown"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-black text-primary bg-primary/5 px-2 py-1 rounded">
                          {order.bookedQty}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="destructive" className="font-black text-[10px] uppercase py-0.5">
                          Lot Pending
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">
                          {order.sowingDate ? format(parseISO(order.sowingDate), 'dd MMM yyyy') : "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-bold text-orange-600">
                          {order.deliveryDate ? format(parseISO(order.deliveryDate), 'dd MMM yyyy') : "N/A"}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <ShoppingCart className="h-12 w-12 mb-4 opacity-20" />
                        <p className="text-lg font-medium">No pending lot orders found</p>
                        <p className="text-sm opacity-60">Try adjusting your filters or search term</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
