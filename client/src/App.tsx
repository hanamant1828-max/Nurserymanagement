import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { useUser } from "@/hooks/use-auth";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { RolePermission } from "@shared/schema";

// Pages
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import CategoriesPage from "@/pages/categories";
import VarietiesPage from "@/pages/varieties";
import LotsPage from "@/pages/lots";
import OrdersPage from "@/pages/orders";
import TodayDeliveriesPage from "@/pages/today-deliveries";
import CustomersPage from "@/pages/customers";
import ReportsPage from "@/pages/reports";
import DeliveryReportsPage from "@/pages/delivery-reports";
import SeedInwardPage from "@/pages/seed-inward";
import UserManagementPage from "@/pages/users";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component, path }: { component: React.ComponentType, path?: string }) {
  const { user, isLoading } = useUser();
  const [, setLocation] = useLocation();

  const { data: permissions } = useQuery<RolePermission[]>({
    queryKey: ["/api/my-permissions"],
    enabled: !!user,
  });

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }

    if (user && user.role !== "admin" && path && permissions) {
      const permission = permissions.find(p => p.pagePath === path);
      if (permission && !permission.canView) {
        setLocation("/");
      }
    }
  }, [user, isLoading, setLocation, path, permissions]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        setLocation("/login");
      } else if (user.role !== "admin") {
        setLocation("/");
      }
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== "admin") return null;

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      
      {/* Protected Routes */}
      <Route path="/">
        {() => <ProtectedRoute component={Dashboard} path="/" />}
      </Route>
      <Route path="/categories">
        {() => <ProtectedRoute component={CategoriesPage} path="/categories" />}
      </Route>
      <Route path="/varieties">
        {() => <ProtectedRoute component={VarietiesPage} path="/varieties" />}
      </Route>
      <Route path="/lots">
        {() => <ProtectedRoute component={LotsPage} path="/lots" />}
      </Route>
      <Route path="/orders">
        {() => <ProtectedRoute component={OrdersPage} path="/orders" />}
      </Route>
      <Route path="/today-deliveries">
        {() => <ProtectedRoute component={TodayDeliveriesPage} path="/today-deliveries" />}
      </Route>
      <Route path="/customers">
        {() => <ProtectedRoute component={CustomersPage} path="/customers" />}
      </Route>
      <Route path="/reports">
        {() => <ProtectedRoute component={ReportsPage} path="/reports" />}
      </Route>
      <Route path="/delivery-reports">
        {() => <ProtectedRoute component={DeliveryReportsPage} path="/delivery-reports" />}
      </Route>
      <Route path="/seed-inward">
        {() => <ProtectedRoute component={SeedInwardPage} path="/seed-inward" />}
      </Route>
      <Route path="/users">
        {() => <AdminRoute component={UserManagementPage} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
