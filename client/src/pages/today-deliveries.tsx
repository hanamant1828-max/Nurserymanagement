import { useOrders } from "@/hooks/use-orders";
import { useLots } from "@/hooks/use-lots";
import { useVarieties } from "@/hooks/use-varieties";
import { useCategories } from "@/hooks/use-categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, isToday, parseISO } from "date-fns";
import { ShoppingCart, CheckCircle, Clock, Calendar, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUpdateOrder } from "@/hooks/use-orders";

export default function TodayDeliveriesPage() {
  const { data: orders, isLoading } = useOrders();
  const { data: lots } = useLots();
  const { data: varieties } = useVarieties();
  const { data: categories } = useCategories();
  const { mutate: update } = useUpdateOrder();

  const todayOrders = orders?.filter(order => {
    try {
      // Assuming deliveryDate is stored as "yyyy-MM-dd" or ISO string
      const deliveryDate = parseISO(order.deliveryDate);
      return isToday(deliveryDate) && order.status === "BOOKED";
    } catch (e) {
      return false;
    }
  }) || [];

  const markDelivered = (id: number) => {
    update({ id, status: "DELIVERED", deliveredQty: 0 });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Clock className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold">Today's Deliveries</h1>
        <p className="text-muted-foreground">Orders scheduled for delivery today, {format(new Date(), "eeee, dd MMMM yyyy")}.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" /> Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-primary">{todayOrders.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="hidden md:block rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Plant Details</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Advance</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {todayOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Calendar className="w-8 h-8 opacity-20" />
                    No deliveries scheduled for today.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              todayOrders.map((order) => {
                const lot = lots?.find(l => l.id === order.lotId);
                const variety = varieties?.find(v => v.id === lot?.varietyId);
                const category = categories?.find(c => c.id === lot?.categoryId);

                return (
                  <TableRow key={order.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="font-bold">{order.customerName}</div>
                      <div className="text-xs text-muted-foreground font-mono">{order.phone}</div>
                      {order.village && <div className="text-[10px] text-muted-foreground italic truncate">({order.village})</div>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {category?.image ? (
                          <img src={category.image} className="w-10 h-10 rounded-md object-cover border" alt="" />
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center border">
                            <Layers className="w-5 h-5 text-muted-foreground/30" />
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-sm block leading-tight">{variety?.name}</span>
                          <p className="text-[10px] text-muted-foreground uppercase font-mono">{lot?.lotNumber}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-black text-primary text-lg">{order.bookedQty}</TableCell>
                    <TableCell className="text-right">
                      <div className="font-bold">₹{order.advanceAmount}</div>
                      <div className="text-[9px] uppercase font-bold text-muted-foreground">{order.paymentMode}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                        onClick={() => markDelivered(order.id)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1.5" /> Delivered
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-4 pb-12">
        {todayOrders.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground italic bg-muted/20 rounded-lg border-2 border-dashed">
            No deliveries scheduled for today.
          </div>
        ) : (
          todayOrders.map((order) => {
            const lot = lots?.find(l => l.id === order.lotId);
            const variety = varieties?.find(v => v.id === lot?.varietyId);
            const category = categories?.find(c => c.id === lot?.categoryId);

            return (
              <Card key={order.id} className="overflow-hidden border-2 shadow-sm">
                <CardContent className="p-0">
                  <div className="p-3 bg-primary/5 flex justify-between items-center border-b">
                    <div>
                      <p className="font-black text-lg leading-tight">{order.customerName}</p>
                      <p className="text-sm font-mono text-muted-foreground">{order.phone}</p>
                    </div>
                    <Badge className="bg-primary text-white font-bold">TODAY</Badge>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    <div className="flex items-center gap-3">
                      {category?.image ? (
                        <img src={category.image} className="w-12 h-12 rounded-md object-cover border" alt="" />
                      ) : (
                        <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center border">
                          <Layers className="w-6 h-6 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-bold text-sm">{variety?.name}</p>
                        <p className="text-xs font-mono text-muted-foreground">{lot?.lotNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Qty</p>
                        <p className="font-black text-2xl text-primary">{order.bookedQty}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-dashed">
                       <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Advance</p>
                        <p className="font-bold">₹{order.advanceAmount} <span className="text-[9px] opacity-70">({order.paymentMode})</span></p>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => markDelivered(order.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 h-10 px-4 font-bold"
                      >
                        <CheckCircle className="w-4 h-4 mr-1.5" /> Deliver
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
