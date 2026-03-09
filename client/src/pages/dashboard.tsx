import { useState, useEffect, useMemo } from "react";
import { useLots } from "@/hooks/use-lots";
import { useOrders } from "@/hooks/use-orders";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Sprout, 
  ShoppingCart, 
  Clock, 
  Truck, 
  BarChart3, 
  CheckCircle, 
  Layers,
  Users,
  UserCheck,
  UserX,
  Calendar,
  AlertCircle,
  Package
} from "lucide-react";
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
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from "recharts";

export default function Dashboard() {
  const { data: lots, isLoading: loadingLots } = useLots();
  const { data: ordersData, isLoading: loadingOrders } = useOrders(1, 10000);
  
  // Fetch today's attendance
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const { data: attendance, isLoading: loadingAttendance } = useQuery({
    queryKey: [`/api/attendance`, todayStr],
    queryFn: async () => {
      const res = await fetch(`/api/attendance?date=${todayStr}`);
      if (!res.ok) throw new Error("Failed to fetch attendance");
      return res.json();
    }
  });

  const { data: employees, isLoading: loadingEmployees } = useQuery({
    queryKey: [`/api/employees`],
    queryFn: async () => {
      const res = await fetch(`/api/employees`);
      if (!res.ok) throw new Error("Failed to fetch employees");
      return res.json();
    }
  });
  
  const orders = useMemo(() => {
    if (!ordersData) return [];
    if (Array.isArray(ordersData)) return ordersData;
    if (ordersData && typeof ordersData === 'object' && 'orders' in ordersData) {
      return ordersData.orders;
    }
    return [];
  }, [ordersData]);

  if (loadingLots || loadingOrders || loadingAttendance || loadingEmployees) {
    return (
      <div className="space-y-6 p-4 md:p-8">
        <div className="h-20 bg-muted/50 rounded-2xl animate-pulse mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-32 bg-muted/50 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Calculate Metrics
  const today = new Date();
  const sowingToday = lots?.filter((l: any) => l && l.sowingDate === format(today, 'yyyy-MM-dd')).length || 0;
  const unassignedOrders = orders?.filter((o: any) => o && o.lotStatus === 'PENDING_LOT' && o.status === 'BOOKED').length || 0;
  
  const ordersToday = orders?.filter((o: any) => 
    o && 
    o.deliveryDate === format(today, 'yyyy-MM-dd')
  ).length || 0;

  const deliveriesToday = orders?.filter((o: any) => 
    o && 
    o.status === 'DELIVERED' && 
    (o.actualDeliveryDate === format(today, 'yyyy-MM-dd') || (o.deliveryDate === format(today, 'yyyy-MM-dd') && !o.actualDeliveryDate))
  ).length || 0;

  const deliverableToday = orders?.filter((o: any) => 
    o && 
    o.status === 'BOOKED' && 
    o.deliveryDate === format(today, 'yyyy-MM-dd')
  ).length || 0;

  const totalInStock = lots?.reduce((sum, l) => sum + (Number((l as any).available) || 0), 0) || 0;

  // Attendance Stats
  const totalEmployees = employees?.length || 0;
  const presentCount = attendance?.filter((a: any) => a.status === 'PRESENT').length || 0;
  const absentCount = totalEmployees - presentCount;

  const mainStats = [
    { 
      label: "Total Employees", 
      value: totalEmployees, 
      icon: Users, 
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      border: "border-indigo-100",
      href: "/employees"
    },
    { 
      label: "Present Today", 
      value: presentCount, 
      icon: UserCheck, 
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-100",
      href: "/attendance"
    },
    { 
      label: "Absent Today", 
      value: absentCount, 
      icon: UserX, 
      color: "text-rose-600",
      bg: "bg-rose-50",
      border: "border-rose-100",
      href: "/attendance"
    }
  ];

  const subStats = [
    { label: "Today's Sowing", value: sowingToday, icon: Sprout, color: "text-green-600", bg: "bg-green-100/50", href: "/lots" },
    { label: "Pending Lots", value: unassignedOrders, icon: Package, color: "text-red-600", bg: "bg-red-100/50", href: "/pending-lot-reports" },
    { label: "Deliverable Today", value: deliverableToday, icon: Clock, color: "text-orange-600", bg: "bg-orange-100/50", href: "/today-deliveries" },
    { label: "Delivered Today", value: deliveriesToday, icon: Truck, color: "text-blue-600", bg: "bg-blue-100/50", href: "/delivery-reports" },
  ];

  const salesByVariety = orders?.reduce((acc: Record<string, number>, order: any) => {
    if (!order) return acc;
    const varietyName = order.variety?.name || order.lot?.variety?.name || "Unknown Variety";
    acc[varietyName] = (acc[varietyName] || 0) + (Number(order.bookedQty) || 0);
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(salesByVariety || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const upcomingDeliveries = orders?.filter((o: any) => {
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

  return (
    <div className="space-y-8 p-2 md:p-4 pb-12" data-testid="page-dashboard">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-gradient-to-r from-green-600 to-emerald-700 p-8 rounded-[2rem] text-white shadow-xl shadow-green-900/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm font-bold tracking-widest uppercase opacity-80">Management Portal</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-black tracking-tight" data-testid="text-nursery-name">Kisan Hi-Tech Nursery</h1>
          <p className="mt-2 text-green-50/80 font-medium max-w-md">Kalloli, Tq: Mudalagi, Dist: Belagavi</p>
        </div>
        <div className="flex flex-col items-end gap-2 relative z-10">
          <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
            <Calendar className="w-4 h-4 text-green-200" />
            <span className="text-sm font-bold">{format(new Date(), 'EEEE, dd MMMM yyyy')}</span>
          </div>
          <p className="text-xs font-medium opacity-60">Help: 7348998635 | 9663777255</p>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {mainStats.map((stat, idx) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Link href={stat.href} data-testid={`link-stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
              <Card className={cn("border-none shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden group", stat.bg)}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className={cn("p-3 rounded-2xl shadow-sm group-hover:scale-110 transition-transform duration-300", "bg-white", stat.color)}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                    {stat.trend && (
                      <div className={cn("flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full", stat.isPositive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                        {stat.isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {stat.trend}
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">{stat.label}</p>
                  <h3 className="text-3xl font-black tracking-tight" data-testid={`text-stat-value-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>{stat.value}</h3>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Secondary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {subStats.map((stat, idx) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + idx * 0.1 }}
          >
            <Link href={stat.href} data-testid={`link-substat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
              <div className={cn("p-4 rounded-3xl flex items-center gap-4 cursor-pointer hover:shadow-md transition-all group", stat.bg)}>
                <div className={cn("p-2 rounded-xl bg-white shadow-sm group-hover:rotate-12 transition-transform", stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">{stat.label}</p>
                  <p className="text-xl font-black leading-tight" data-testid={`text-substat-value-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>{stat.value}</p>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Chart Section */}
        <Card className="lg:col-span-2 border-none shadow-lg rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-muted/5 border-b border-muted/20 pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Popular Varieties
                </CardTitle>
                <CardDescription>Based on total booked quantity</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl font-bold text-xs" asChild data-testid="button-full-report">
                <Link href="/reports">Full Report</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="h-[350px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      fontSize={11} 
                      fontWeight={700}
                      tickLine={false} 
                      axisLine={false}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      fontSize={11} 
                      fontWeight={700}
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                        padding: '12px'
                      }}
                      cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(var(--primary) / ${1 - index * 0.1})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm font-medium italic">
                  No sales data available yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Lot Orders List */}
        <Card className="border-none shadow-lg rounded-[2rem] overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/5 border-b border-muted/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Package className="w-5 h-5 text-red-500" />
                Pending Lots
              </CardTitle>
              <div className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-[10px] font-black uppercase tracking-widest">
                Awaiting Lot
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto">
            {unassignedOrders > 0 ? (
              <div className="divide-y divide-border/30">
                {orders.filter((o: any) => o && o.lotStatus === 'PENDING_LOT' && o.status === 'BOOKED').slice(0, 8).map((order: any, idx: number) => (
                  <motion.div 
                    key={order.id} 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + idx * 0.05 }}
                    className="p-4 hover:bg-muted/20 transition-all flex items-center justify-between group cursor-default"
                    data-testid={`row-pending-lot-${order.id}`}
                  >
                    <div className="min-w-0">
                      <p className="font-black text-sm truncate group-hover:text-primary transition-colors" data-testid={`text-pending-customer-${order.id}`}>{order.customerName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate bg-muted px-1.5 py-0.5 rounded" data-testid={`text-pending-variety-${order.id}`}>
                          {order.variety?.name || order.lot?.variety?.name || "Unknown"}
                        </span>
                        <span className="text-[10px] font-bold text-red-600" data-testid={`text-pending-qty-${order.id}`}>QTY: {order.bookedQty}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-red-600">
                        PENDING
                      </p>
                      <p className="text-[10px] font-bold text-muted-foreground/60 mt-1">
                        #{order.id}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground/40 italic">
                <Package className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">No pending lot orders</p>
              </div>
            )}
          </CardContent>
          {unassignedOrders > 0 && (
            <div className="p-4 bg-muted/5 border-t border-muted/20">
              <Button className="w-full rounded-xl font-bold text-xs" asChild data-testid="button-full-pending-lots">
                <Link href="/pending-lot-reports">Full Pending Lots Report</Link>
              </Button>
            </div>
          )}
        </Card>

        {/* Upcoming Deliveries List */}
        <Card className="border-none shadow-lg rounded-[2rem] overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/5 border-b border-muted/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-500" />
                Next 7 Days
              </CardTitle>
              <div className="px-2 py-1 bg-orange-100 text-orange-700 rounded-lg text-[10px] font-black uppercase tracking-widest">
                Deliveries
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto">
            {upcomingDeliveries.length > 0 ? (
              <div className="divide-y divide-border/30">
                {upcomingDeliveries.slice(0, 8).map((order: any, idx: number) => (
                  <motion.div 
                    key={order.id} 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + idx * 0.05 }}
                    className="p-4 hover:bg-muted/20 transition-all flex items-center justify-between group cursor-default"
                    data-testid={`row-delivery-${order.id}`}
                  >
                    <div className="min-w-0">
                      <p className="font-black text-sm truncate group-hover:text-primary transition-colors" data-testid={`text-customer-${order.id}`}>{order.customerName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate bg-muted px-1.5 py-0.5 rounded" data-testid={`text-variety-${order.id}`}>
                          {order.variety?.name || order.lot?.variety?.name || "Unknown"}
                        </span>
                        <span className="text-[10px] font-bold text-primary" data-testid={`text-qty-${order.id}`}>QTY: {order.bookedQty}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-orange-600">
                        {order.deliveryDate ? format(parseISO(order.deliveryDate), 'dd MMM') : "N/A"}
                      </p>
                      <p className="text-[10px] font-bold text-muted-foreground/60 mt-1">
                        #{order.id}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground/40 italic">
                <AlertCircle className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">No deliveries scheduled soon</p>
              </div>
            )}
          </CardContent>
          {upcomingDeliveries.length > 0 && (
            <div className="p-4 bg-muted/5 border-t border-muted/20">
              <Button className="w-full rounded-xl font-bold text-xs" asChild data-testid="button-full-schedule">
                <Link href="/today-deliveries">Full Delivery Schedule</Link>
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
