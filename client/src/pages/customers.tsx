import { useOrders } from "@/hooks/use-orders";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Phone, MapPin } from "lucide-react";

export default function CustomersPage() {
  const { data: orders, isLoading } = useOrders();

  // Aggregate unique customers from orders
  const customers = orders ? Object.values(orders.reduce((acc, order) => {
    const key = order.phone; // Using phone as unique key
    if (!acc[key]) {
      acc[key] = {
        name: order.customerName,
        phone: order.phone,
        village: order.village,
        totalOrders: 0,
        lastOrderDate: order.deliveryDate
      };
    }
    acc[key].totalOrders += 1;
    // Update last order date if newer
    if (new Date(order.deliveryDate) > new Date(acc[key].lastOrderDate)) {
        acc[key].lastOrderDate = order.deliveryDate;
    }
    return acc;
  }, {} as Record<string, { name: string, phone: string, village: string | null, totalOrders: number, lastOrderDate: string }>)) : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold">Customers</h1>
        <p className="text-muted-foreground">List of all customers who have placed orders.</p>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Customer Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-center">Total Orders</TableHead>
              <TableHead className="text-right">Last Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center">Loading customers...</TableCell></TableRow>
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="w-8 h-8 opacity-20" />
                    No customers found yet.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium text-lg">{customer.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-3 h-3" /> {customer.phone}
                    </div>
                  </TableCell>
                  <TableCell>
                    {customer.village && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-3 h-3" /> {customer.village}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center font-bold text-primary">{customer.totalOrders}</TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">{customer.lastOrderDate}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
