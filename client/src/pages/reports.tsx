import { useState } from "react";
import { useLots } from "@/hooks/use-lots";
import { useOrders } from "@/hooks/use-orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Download, Search, FileSpreadsheet, Truck, Sprout, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO } from "date-fns";
import * as XLSX from "xlsx";

export default function ReportsPage() {
  const { data: lots, isLoading: loadingLots } = useLots();
  const { data: orders, isLoading: loadingOrders } = useOrders();
  const [searchTerm, setSearchTerm] = useState("");

  const exportToExcel = (data: any[], fileName: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${fileName}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const today = format(new Date(), "yyyy-MM-dd");

  const dailySowingData = lots?.filter(l => l.sowingDate === today) || [];
  const pendingDeliveries = orders?.filter(o => o.status === "BOOKED") || [];
  const lotStockData = lots?.map(l => ({
    ...l,
    available: (l as any).available || 0
  })) || [];

  const filterData = (data: any[], keys: string[]) => {
    if (!searchTerm) return data;
    return data.filter(item => 
      keys.some(key => {
        const val = item[key];
        return val && val.toString().toLowerCase().includes(searchTerm.toLowerCase());
      })
    );
  };

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
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search report..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="sowing" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="sowing" className="flex items-center gap-2">
            <Sprout className="w-4 h-4" /> Daily Sowing
          </TabsTrigger>
          <TabsTrigger value="deliveries" className="flex items-center gap-2">
            <Truck className="w-4 h-4" /> Pending Deliveries
          </TabsTrigger>
          <TabsTrigger value="stock" className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" /> Lot Stock
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sowing">
          <Card className="border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Daily Sowing Report</CardTitle>
                <p className="text-sm text-muted-foreground">Seeds sown today: {today}</p>
              </div>
              <Button onClick={() => exportToExcel(dailySowingData, "Daily_Sowing")}>
                <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lot Number</TableHead>
                    <TableHead>Variety</TableHead>
                    <TableHead>Seeds Sown</TableHead>
                    <TableHead>Ready Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterData(dailySowingData, ["lotNumber"]).map((lot) => (
                    <TableRow key={lot.id}>
                      <TableCell className="font-medium">{lot.lotNumber}</TableCell>
                      <TableCell>{(lot as any).variety?.name || "N/A"}</TableCell>
                      <TableCell>{lot.seedsSown}</TableCell>
                      <TableCell>{lot.expectedReadyDate}</TableCell>
                    </TableRow>
                  ))}
                  {dailySowingData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No sowing recorded today.</TableCell>
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
              <Button onClick={() => exportToExcel(pendingDeliveries, "Pending_Deliveries")}>
                <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
              </Button>
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

        <TabsContent value="stock">
          <Card className="border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Lot-wise Stock Report</CardTitle>
                <p className="text-sm text-muted-foreground">Current availability across all lots.</p>
              </div>
              <Button onClick={() => exportToExcel(lotStockData, "Stock_Report")}>
                <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
              </Button>
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
      </Tabs>
    </div>
  );
}
