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
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t pb-safe">
      <div className="flex justify-around items-center h-16 px-2">
        {items.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                "flex flex-col items-center justify-center flex-1 gap-1 px-2 py-1 transition-colors cursor-pointer",
                isActive ? "text-primary" : "text-muted-foreground hover:text-primary/70"
              )}>
                <item.icon className={cn("h-6 w-6", isActive && "animate-in zoom-in-75 duration-300")} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
