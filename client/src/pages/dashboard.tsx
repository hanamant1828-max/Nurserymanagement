import { useLots } from "@/hooks/use-lots";
import { useOrders } from "@/hooks/use-orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sprout, ShoppingCart, Clock, Truck, TrendingUp, AlertCircle } from "lucide-react";
import { format, isToday, parseISO } from "date-fns";
import { motion } from "framer-motion";
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
  const sowingToday = lots?.filter(l => l.sowingDate === format(today, 'yyyy-MM-dd')).length || 0;
  const activeLots = lots?.filter(l => l.seedsSown > (l.damaged + (l.available || 0))).length || 0; // Simplified logic
  const pendingOrders = orders?.filter(o => o.status === 'BOOKED').length || 0;
  
  // Upcoming deliveries (next 7 days)
  const upcomingDeliveries = orders?.filter(o => {
    if (o.status !== 'BOOKED') return false;
    const deliveryDate = parseISO(o.deliveryDate);
    const diffTime = deliveryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays >= 0 && diffDays <= 7;
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
      label: "Active Lots", 
      value: activeLots, 
      icon: LayersIcon, 
      color: "text-blue-600",
      bg: "bg-blue-100"
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
      icon: Truck, 
      color: "text-purple-600",
      bg: "bg-purple-100"
    },
  ];

  // Prepare chart data (Sales by Variety)
  const salesByVariety = orders?.reduce((acc, order) => {
    const varietyName = order.lot?.variety?.name || "Unknown Variety";
    acc[varietyName] = (acc[varietyName] || 0) + order.bookedQty;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(salesByVariety || {}).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Here's what's happening in your nursery today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className="border-none shadow-lg shadow-black/5 hover:shadow-xl transition-all duration-300 group">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">{stat.label}</p>
                  <h3 className="text-3xl font-bold font-display tracking-tight">{stat.value}</h3>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
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
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-accent" />
              Next Deliveries
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {upcomingDeliveries.length > 0 ? (
              <div className="divide-y divide-border">
                {upcomingDeliveries.slice(0, 5).map(order => (
                  <div key={order.id} className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{order.customerName}</p>
                      <p className="text-xs text-muted-foreground">{order.lot?.variety?.name || "Unknown"} • {order.bookedQty} qty</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{format(parseISO(order.deliveryDate), 'MMM d')}</p>
                      <p className="text-xs text-muted-foreground">Lot #{order.lot.lotNumber}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center">
                <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                No deliveries scheduled for the next 7 days.
              </div>
            )}
          </CardContent>
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
