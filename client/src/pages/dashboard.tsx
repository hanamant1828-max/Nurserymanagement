import { useLots } from "@/hooks/use-lots";
import { useOrders } from "@/hooks/use-orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sprout, ShoppingCart, Clock, Truck, TrendingUp, AlertCircle, LayoutDashboard, List, Layers, Package, Users, BarChart3 } from "lucide-react";
import { format, isToday, parseISO } from "date-fns";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

export default function Dashboard() {
  const { data: lots, isLoading: loadingLots } = useLots();
  const { data: orders, isLoading: loadingOrders } = useOrders();

  if (loadingLots || loadingOrders) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 bg-muted/50 rounded-2xl" />
        ))}
      </div>
    );
  }

  // Calculate Metrics
  const today = new Date();
  const sowingToday = lots?.filter(l => l && l.sowingDate === format(today, 'yyyy-MM-dd')).length || 0;
  const activeLots = lots?.filter(l => l && (l as any).available > 0).length || 0;
  const pendingOrders = orders?.filter(o => o && o.status === 'BOOKED').length || 0;
  const deliveriesToday = orders?.filter(o => 
    o && 
    o.status === 'BOOKED' && 
    o.deliveryDate === format(today, 'yyyy-MM-dd')
  ).length || 0;

  const totalRevenue = orders?.filter(o => o && o.status === 'DELIVERED')
    .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0) || 0;
  
  // Upcoming deliveries (next 7 days)
  const upcomingDeliveries = orders?.filter(o => {
    if (!o || o.status !== 'BOOKED' || !o.deliveryDate) return false;
    try {
      const deliveryDate = parseISO(o.deliveryDate);
      const diffTime = deliveryDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      return diffDays >= 0 && diffDays <= 7;
    } catch (e) {
      return false;
    }
  }) || [];

  const stats = [
    { 
      label: "Today's Sowing", 
      value: sowingToday, 
      icon: Sprout, 
      color: "text-green-600",
      bg: "bg-green-100"
    },
    { 
      label: "Today's Deliveries", 
      value: deliveriesToday, 
      icon: Truck, 
      color: "text-blue-600",
      bg: "bg-blue-100"
    },
    { 
      label: "Total Revenue", 
      value: `₹${totalRevenue.toLocaleString()}`, 
      icon: TrendingUp, 
      color: "text-emerald-600",
      bg: "bg-emerald-100"
    },
    { 
      label: "Pending Orders", 
      value: pendingOrders, 
      icon: ShoppingCart, 
      color: "text-orange-600",
      bg: "bg-orange-100"
    },
    { 
      label: "Upcoming Deliveries", 
      value: upcomingDeliveries.length, 
      icon: Clock, 
      color: "text-purple-600",
      bg: "bg-purple-100"
    },
  ];

  const navButtons = [
    { label: "Categories", href: "/categories", icon: List },
    { label: "Varieties", href: "/varieties", icon: Layers },
    { label: "Sowing Lots", href: "/lots", icon: Package },
    { label: "Book Orders", href: "/orders", icon: ShoppingCart },
    { label: "Today's Deliveries", href: "/today-deliveries", icon: Truck },
    { label: "Customers", href: "/customers", icon: Users },
    { label: "Reports", href: "/reports", icon: BarChart3 },
  ];

  // Prepare chart data (Sales by Variety)
  const salesByVariety = orders?.reduce((acc, order) => {
    if (!order) return acc;
    // variety name is accessed via order.lot.variety.name because of drizzle relations
    const varietyName = (order as any).lot?.variety?.name || "Unknown Variety";
    acc[varietyName] = (acc[varietyName] || 0) + (order.bookedQty || 0);
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(salesByVariety || {}).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">Kisan Hi-Tech Nursery</h1>
          <p className="text-muted-foreground mt-1 font-medium">Kalloli, Tq: Mudalagi, Dist: Belagavi | Ph: 7348998635, 9663777255</p>
        </div>
        <div className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-xl">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider">Email</p>
          <p className="text-sm font-medium">chidanandkk@gmail.com</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, idx) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card className="border-none shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden relative group">
              <div className={cn("absolute inset-0 opacity-5 transition-opacity group-hover:opacity-10", stat.bg)} />
              <CardContent className="p-5 flex items-center justify-between relative z-10">
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">{stat.label}</p>
                  <h3 className="text-2xl font-black font-display tracking-tight text-foreground">{stat.value}</h3>
                </div>
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm group-hover:rotate-12 transition-all duration-300", stat.bg, stat.color)}>
                  {stat.icon && <stat.icon className="w-6 h-6" />}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {navButtons.map((btn, idx) => (
          <motion.div
            key={btn.href}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + (idx * 0.03) }}
          >
            <Link href={btn.href}>
              <Button 
                variant="outline" 
                className="w-full h-auto py-5 flex flex-col gap-2.5 hover-elevate active-elevate-2 bg-card border-2 border-transparent hover:border-primary/10 shadow-sm rounded-2xl"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <btn.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs font-bold tracking-tight">{btn.label}</span>
              </Button>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Section */}
        <Card className="lg:col-span-2 border-none shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Popular Varieties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No sales data available yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Deliveries List */}
        <Card className="border-none shadow-md overflow-hidden flex flex-col">
          <CardHeader className="border-b bg-muted/10">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="w-4 h-4 text-orange-500" />
              Upcoming Deliveries
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {upcomingDeliveries.length > 0 ? (
              <div className="divide-y divide-border/50">
                {upcomingDeliveries.slice(0, 6).map(order => (
                  <div key={order.id} className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between group">
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">{order.customerName}</p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider truncate">
                        {(order as any).lot?.variety?.name || "Unknown"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-primary">
                        {order.deliveryDate ? format(parseISO(order.deliveryDate), 'dd MMM') : "N/A"}
                      </p>
                      <p className="text-[10px] font-mono text-muted-foreground bg-muted px-1 rounded">
                        #{order.id}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground opacity-60">
                <AlertCircle className="w-10 h-10 mb-2" />
                <p className="text-sm font-medium">No deliveries scheduled soon</p>
              </div>
            )}
          </CardContent>
          {upcomingDeliveries.length > 0 && (
            <div className="p-3 bg-muted/10 border-t">
              <Link href="/orders">
                <Button variant="ghost" size="sm" className="w-full text-xs font-bold text-primary hover:bg-primary/5">
                  View All Orders
                </Button>
              </Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// Icon helper
function LayersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
    </svg>
  );
}
