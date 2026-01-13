import { Link, useLocation } from "wouter";
import { useUser, useLogout } from "@/hooks/use-auth";
import { 
  LayoutDashboard, 
  Sprout, 
  Flower2, 
  Layers, 
  ShoppingCart, 
  CalendarCheck,
  Users, 
  BarChart3,
  Truck,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { BottomNav } from "@/components/bottom-nav";
import { cn } from "@/lib/utils";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useUser();
  const { mutate: logout } = useLogout();
  const [open, setOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/categories", label: "Categories", icon: Layers },
    { href: "/varieties", label: "Varieties", icon: Flower2 },
    { href: "/lots", label: "Lots & Stock", icon: Sprout },
    { href: "/orders", label: "Orders", icon: ShoppingCart },
    { href: "/today-deliveries", label: "Today's Deliveries", icon: CalendarCheck },
    { href: "/customers", label: "Customers", icon: Users },
    { href: "/delivery-reports", label: "Delivery Reports", icon: Truck },
    { href: "/reports", label: "Reports", icon: BarChart3 },
  ];

  const adminItems = [
    { href: "/users", label: "User Management", icon: Users },
  ];

  const NavContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border/50 overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 min-w-[40px] rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <Sprout className="w-6 h-6 text-white" />
          </div>
          <div className={cn(
            "transition-opacity duration-300 whitespace-nowrap",
            !isMobile && "opacity-0 group-hover/sidebar:opacity-100"
          )}>
            <h1 className="font-display font-bold text-lg leading-tight">Kisan Hi-Tech Nursery</h1>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Kalloli</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className={`nav-item ${isActive ? 'active' : 'text-muted-foreground hover:text-primary'} whitespace-nowrap`} onClick={() => isMobile && setOpen(false)}>
              <item.icon className={`w-5 h-5 min-w-[20px] ${isActive ? 'stroke-2' : 'stroke-[1.5]'}`} />
              <span className={cn(
                "transition-opacity duration-300",
                !isMobile && "opacity-0 group-hover/sidebar:opacity-100"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {user?.role === 'admin' && (
          <div className="pt-4 mt-4 border-t border-border/50">
            <p className={cn(
              "px-3 mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider transition-opacity duration-300",
              !isMobile && "opacity-0 group-hover/sidebar:opacity-100"
            )}>Administration</p>
            {adminItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href} className={`nav-item ${isActive ? 'active' : 'text-muted-foreground hover:text-primary'} whitespace-nowrap`} onClick={() => isMobile && setOpen(false)}>
                  <item.icon className={`w-5 h-5 min-w-[20px] ${isActive ? 'stroke-2' : 'stroke-[1.5]'}`} />
                  <span className={cn(
                    "transition-opacity duration-300",
                    !isMobile && "opacity-0 group-hover/sidebar:opacity-100"
                  )}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-border/50">
        <div className="bg-muted/50 rounded-xl p-4 mb-4 flex items-center gap-3 overflow-hidden">
          <Avatar className="h-10 w-10 min-w-[40px] border-2 border-white shadow-sm">
            <AvatarFallback className="bg-primary/10 text-primary font-bold">
              {user?.username?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className={cn(
            "flex-1 overflow-hidden transition-opacity duration-300",
            !isMobile && "opacity-0 group-hover/sidebar:opacity-100"
          )}>
            <p className="font-medium truncate">{user?.username}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20 overflow-hidden"
          onClick={() => logout()}
        >
          <LogOut className="w-4 h-4 min-w-[16px] mr-2" />
          <span className={cn(
            "transition-opacity duration-300",
            !isMobile && "opacity-0 group-hover/sidebar:opacity-100"
          )}>
            Sign Out
          </span>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/20 flex">
      <aside 
        className="hidden lg:block w-72 bg-card border-r border-border h-screen sticky top-0 transition-[width] duration-300 group/sidebar overflow-hidden hover:w-72 w-20"
      >
        <NavContent isMobile={false} />
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-background/80 backdrop-blur-md border-b z-40 flex items-center px-4 justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <Sprout className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-sm">Kisan Hi-Tech Nursery</span>
        </div>
        
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-80">
            <NavContent isMobile={true} />
          </SheetContent>
        </Sheet>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto w-full pb-20 md:pb-0">
        <div className="container max-w-7xl mx-auto p-4 md:p-8 pt-16 lg:pt-8 min-h-screen animate-in fade-in duration-500">
          {children}
        </div>
      </main>

      {/* Bottom Navigation for Mobile */}
      <BottomNav />
    </div>
  );
}
