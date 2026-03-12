import { useOrders } from "@/hooks/use-orders";
import { useVarieties } from "@/hooks/use-varieties";
import { useCategories } from "@/hooks/use-categories";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Phone, MapPin, Search, FileSpreadsheet, Layers, Tag } from "lucide-react";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as XLSX from "xlsx";

export default function CustomersPage() {
  const { data, isLoading } = useOrders(1, 10000); // Fetch more orders for comprehensive customer list
  const { data: categoriesData } = useCategories();
  const { data: varietiesData } = useVarieties();

  const [searchTerm, setSearchTerm] = useState("");
  const [villageFilter, setVillageFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [varietyFilter, setVarietyFilter] = useState("all");

  const orders = data?.orders || [];

  // Aggregate unique customers from orders
  const customers = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    
    const aggregated = orders.reduce((acc, order) => {
      const key = order.phone; // Using phone as unique key
      if (!acc[key]) {
        acc[key] = {
          name: order.customerName,
          phone: order.phone,
          village: order.village || "N/A",
          totalOrders: 0,
          lastOrderDate: order.deliveryDate,
          varieties: new Set<number>(),
          categories: new Set<number>()
        };
      }
      acc[key].totalOrders += 1;
      
      const categoryId = order.categoryId || order.lot?.categoryId;
      const varietyId = order.varietyId || order.lot?.varietyId;

      if (categoryId) {
        acc[key].categories.add(Number(categoryId));
      }
      if (varietyId) {
        acc[key].varieties.add(Number(varietyId));
      }

      // Update last order date if newer
      if (new Date(order.deliveryDate) > new Date(acc[key].lastOrderDate)) {
        acc[key].lastOrderDate = order.deliveryDate;
      }
      return acc;
    }, {} as Record<string, any>);

    return Object.values(aggregated).map((c: any) => {
      const customerVarieties = varietiesData?.filter(v => c.varieties.has(v.id)) || [];
      const varietiesList = customerVarieties.map(v => v.name).join(", ");
      
      return {
        ...c,
        varietiesList
      };
    });
  }, [orders, varietiesData]);

  const uniqueVillages = useMemo(() => {
    const villages = new Set(customers.map((c: any) => c.village));
    return Array.from(villages).sort();
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer: any) => {
      const matchesSearch = 
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.includes(searchTerm) ||
        customer.village.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesVillage = villageFilter === "all" || customer.village === villageFilter;
      
      const matchesCategory = categoryFilter === "all" || customer.categories.has(Number(categoryFilter));
      
      const matchesVariety = varietyFilter === "all" || customer.varieties.has(Number(varietyFilter));

      return matchesSearch && matchesVillage && matchesCategory && matchesVariety;
    });
  }, [customers, searchTerm, villageFilter, categoryFilter, varietyFilter]);

  const exportToExcel = () => {
    const exportData = filteredCustomers.map((c: any) => ({
      "Customer Name": c.name,
      "Phone": c.phone,
      "Village": c.village,
      "Total Orders": c.totalOrders,
      "Last Active": c.lastOrderDate,
      "Varieties Purchased": c.varietiesList
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    XLSX.writeFile(wb, `Customers_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6 px-4 md:px-8 py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage customer information and track order history.</p>
        </div>
        <Button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export to Excel
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-blue-50/50 dark:from-blue-950/30 dark:to-blue-950/20 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">{filteredCustomers.length}</div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-semibold uppercase tracking-wider">Total Customers</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-green-50/50 dark:from-green-950/30 dark:to-green-950/20 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="text-3xl font-bold text-green-700 dark:text-green-300">{filteredCustomers.reduce((sum, c) => sum + c.totalOrders, 0)}</div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-semibold uppercase tracking-wider">Total Orders</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-amber-50/50 dark:from-amber-950/30 dark:to-amber-950/20 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="text-3xl font-bold text-amber-700 dark:text-amber-300">{filteredCustomers.length > 0 ? Math.round(filteredCustomers.reduce((sum, c) => sum + c.totalOrders, 0) / filteredCustomers.length) : 0}</div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-semibold uppercase tracking-wider">Avg Orders</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-purple-50/50 dark:from-purple-950/30 dark:to-purple-950/20 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">{uniqueVillages.length}</div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-2 font-semibold uppercase tracking-wider">Villages</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border shadow-sm">
        <CardContent className="p-5">
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold mb-4 text-foreground">Filters</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Search</label>
                <Input
                  placeholder="Name, phone, village..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 px-3 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Village</label>
                <Select value={villageFilter} onValueChange={setVillageFilter}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Villages</SelectItem>
                    {uniqueVillages.map(v => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categoriesData?.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Variety</label>
                <Select value={varietyFilter} onValueChange={setVarietyFilter}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Varieties</SelectItem>
                    {varietiesData?.filter(v => categoryFilter === "all" || v.categoryId === Number(categoryFilter)).map(v => (
                      <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="hidden md:block rounded-xl border bg-card shadow-sm overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Customer Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Categories</TableHead>
              <TableHead>Varieties</TableHead>
              <TableHead className="text-center">Total Orders</TableHead>
              <TableHead className="text-right">Last Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center">Loading customers...</TableCell></TableRow>
            ) : filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="w-8 h-8 opacity-20" />
                    No customers found.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer, idx) => {
                const customerCategories = categoriesData?.filter(cat => customer.categories.has(cat.id)).map(cat => cat.name).join(", ") || "N/A";
                return (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Phone className="w-3 h-3" /> {customer.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <MapPin className="w-3 h-3" /> {customer.village}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground line-clamp-1" title={customerCategories}>
                        {customerCategories}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground line-clamp-1" title={customer.varietiesList}>
                        {customer.varietiesList}
                      </span>
                    </TableCell>
                    <TableCell className="text-center font-bold text-primary">{customer.totalOrders}</TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">{customer.lastOrderDate}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-4">
        {isLoading ? (
          <div className="h-24 flex items-center justify-center bg-card rounded-xl border border-dashed text-muted-foreground">
            Loading customers...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center bg-card rounded-xl border border-dashed text-muted-foreground">
            <Users className="w-8 h-8 opacity-20 mb-2" />
            No customers found.
          </div>
        ) : (
          filteredCustomers.map((customer, idx) => {
            const customerCategories = categoriesData?.filter(cat => customer.categories.has(cat.id)).map(cat => cat.name).join(", ") || "N/A";
            return (
              <Card key={idx} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{customer.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-3.5 h-3.5" /> {customer.phone}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase text-muted-foreground">Total Orders</div>
                    <div className="text-xl font-black text-primary">{customer.totalOrders}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground border-t pt-2">
                  <MapPin className="w-3.5 h-3.5" /> {customer.village}
                </div>
                <div className="text-xs text-muted-foreground">
                  <span className="font-semibold">Categories:</span> {customerCategories}
                </div>
                <div className="text-xs text-muted-foreground">
                  <span className="font-semibold">Varieties:</span> {customer.varietiesList}
                </div>
                <div className="text-right text-[10px] text-muted-foreground pt-1 border-t border-dashed">
                  Last Active: {customer.lastOrderDate}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
