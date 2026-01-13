import { Link, useLocation } from "wouter";
import { Home, LayoutGrid, ShoppingCart, Truck, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { icon: Home, label: "Home", href: "/" },
  { icon: LayoutGrid, label: "Lots", href: "/lots" },
  { icon: ShoppingCart, label: "Orders", href: "/orders" },
  { icon: Truck, label: "Today", href: "/today-deliveries" },
  { icon: Users, label: "Customers", href: "/customers" },
  { icon: Settings, label: "Settings", href: "/users" },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
      <div className="flex justify-around items-center h-16 px-1">
        {items.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                "flex flex-col items-center justify-center flex-1 gap-1 px-1 py-1 transition-all duration-300 cursor-pointer active:scale-90",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                <div className={cn(
                  "p-1 rounded-xl transition-colors",
                  isActive ? "bg-primary/10" : "transparent"
                )}>
                  <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
                </div>
                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-tight transition-all",
                  isActive ? "opacity-100 scale-110" : "opacity-70"
                )}>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
