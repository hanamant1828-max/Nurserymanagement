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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Customers</h1>
          <p className="text-muted-foreground">List of all customers who have placed orders.</p>
        </div>
        <Button onClick={exportToExcel} variant="outline" className="w-full md:w-auto">
          <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
          Export to Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, phone, village..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={villageFilter} onValueChange={setVillageFilter}>
          <SelectTrigger>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Filter by Village" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Villages</SelectItem>
            {uniqueVillages.map(v => (
              <SelectItem key={v} value={v}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Filter by Category" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categoriesData?.map(c => (
              <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={varietyFilter} onValueChange={setVarietyFilter}>
          <SelectTrigger>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Filter by Variety" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Varieties</SelectItem>
            {varietiesData?.filter(v => categoryFilter === "all" || v.categoryId === Number(categoryFilter)).map(v => (
              <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
