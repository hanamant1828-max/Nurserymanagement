import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEmployees } from "@/hooks/use-employees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Edit2, Trash2, Search, IndianRupee, Users, CalendarDays, TrendingDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { EmployeeAdvance } from "@shared/schema";

const formSchema = z.object({
  employeeId: z.coerce.number().min(1, "Please select an employee"),
  amount: z.string().min(1, "Amount is required").refine(v => parseFloat(v) > 0, "Amount must be positive"),
  date: z.string().min(1, "Date is required"),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function AdvancesPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState<EmployeeAdvance | null>(null);
  const [search, setSearch] = useState("");
  const [filterEmployee, setFilterEmployee] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");

  const { data: employees } = useEmployees();

  const { data: advances = [], isLoading } = useQuery<EmployeeAdvance[]>({
    queryKey: ["/api/employee-advances"],
  });

  const createMutation = useMutation({
    mutationFn: (data: FormValues) => {
      const date = data.date;
      const month = date.slice(0, 7);
      return apiRequest("POST", "/api/employee-advances", { ...data, month });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-advances"] });
      setDialogOpen(false);
      form.reset();
      toast({ title: "Advance recorded successfully" });
    },
    onError: () => toast({ title: "Failed to record advance", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: FormValues }) => {
      const month = data.date.slice(0, 7);
      return apiRequest("PUT", `/api/employee-advances/${id}`, { ...data, month });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-advances"] });
      setDialogOpen(false);
      setEditingAdvance(null);
      form.reset();
      toast({ title: "Advance updated successfully" });
    },
    onError: () => toast({ title: "Failed to update advance", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/employee-advances/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-advances"] });
      toast({ title: "Advance deleted" });
    },
    onError: () => toast({ title: "Failed to delete advance", variant: "destructive" }),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employeeId: 0,
      amount: "",
      date: format(new Date(), "yyyy-MM-dd"),
      note: "",
    },
  });

  const openAdd = () => {
    setEditingAdvance(null);
    form.reset({ employeeId: 0, amount: "", date: format(new Date(), "yyyy-MM-dd"), note: "" });
    setDialogOpen(true);
  };

  const openEdit = (adv: EmployeeAdvance) => {
    setEditingAdvance(adv);
    form.reset({
      employeeId: adv.employeeId,
      amount: adv.amount,
      date: adv.date,
      note: adv.note || "",
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: FormValues) => {
    if (editingAdvance) {
      updateMutation.mutate({ id: editingAdvance.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const employeeMap = useMemo(() => {
    const map: Record<number, string> = {};
    employees?.forEach(e => { map[e.id] = e.name; });
    return map;
  }, [employees]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    advances.forEach(a => months.add(a.month));
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [advances]);

  const filtered = useMemo(() => {
    let result = advances;
    if (filterEmployee !== "all") result = result.filter(a => a.employeeId === Number(filterEmployee));
    if (filterMonth !== "all") result = result.filter(a => a.month === filterMonth);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(a =>
        (employeeMap[a.employeeId] || "").toLowerCase().includes(q) ||
        (a.note || "").toLowerCase().includes(q) ||
        a.amount.includes(q)
      );
    }
    return result;
  }, [advances, filterEmployee, filterMonth, search, employeeMap]);

  const totalAmount = useMemo(() => filtered.reduce((s, a) => s + parseFloat(a.amount || "0"), 0), [filtered]);
  const uniqueEmployees = useMemo(() => new Set(filtered.map(a => a.employeeId)).size, [filtered]);
  const thisMonth = format(new Date(), "yyyy-MM");
  const thisMonthTotal = useMemo(() =>
    advances.filter(a => a.month === thisMonth).reduce((s, a) => s + parseFloat(a.amount || "0"), 0),
    [advances, thisMonth]
  );

  return (
    <div className="space-y-6 px-4 md:px-8 py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Advance Payments</h1>
          <p className="text-sm text-muted-foreground mt-1">Track and manage all salary advances given to employees.</p>
        </div>
        <Button onClick={openAdd} className="bg-green-600 hover:bg-green-700 w-full sm:w-auto" data-testid="button-add-advance">
          <Plus className="mr-2 h-4 w-4" /> Add Advance
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-2 border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50 to-red-50/50 dark:from-red-950/30 dark:to-red-950/20 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="text-3xl font-bold text-red-700 dark:text-red-300">₹{(totalAmount / 1000).toFixed(1)}K</div>
            <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-semibold uppercase tracking-wider">Filtered Total</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50 to-orange-50/50 dark:from-orange-950/30 dark:to-orange-950/20 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="text-3xl font-bold text-orange-700 dark:text-orange-300">₹{(thisMonthTotal / 1000).toFixed(1)}K</div>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 font-semibold uppercase tracking-wider">This Month</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-blue-50/50 dark:from-blue-950/30 dark:to-blue-950/20 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">{uniqueEmployees}</div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-semibold uppercase tracking-wider">Employees</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-purple-50/50 dark:from-purple-950/30 dark:to-purple-950/20 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">{filtered.length}</div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-2 font-semibold uppercase tracking-wider">Records</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or note..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
                data-testid="input-search-advances"
              />
            </div>
            <Select value={filterEmployee} onValueChange={setFilterEmployee}>
              <SelectTrigger className="h-9 w-full sm:w-[180px] text-sm" data-testid="select-filter-employee">
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees?.map(e => (
                  <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="h-9 w-full sm:w-[160px] text-sm" data-testid="select-filter-month">
                <SelectValue placeholder="All Months" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {availableMonths.map(m => (
                  <SelectItem key={m} value={m}>{format(new Date(m + "-01"), "MMM yyyy")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(filterEmployee !== "all" || filterMonth !== "all" || search) && (
              <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={() => { setFilterEmployee("all"); setFilterMonth("all"); setSearch(""); }}>
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="py-4 pl-6 font-bold text-xs uppercase tracking-wider">#</TableHead>
              <TableHead className="py-4 font-bold text-xs uppercase tracking-wider">Employee</TableHead>
              <TableHead className="py-4 font-bold text-xs uppercase tracking-wider text-right">Amount</TableHead>
              <TableHead className="py-4 font-bold text-xs uppercase tracking-wider">Date</TableHead>
              <TableHead className="py-4 font-bold text-xs uppercase tracking-wider">Month</TableHead>
              <TableHead className="py-4 font-bold text-xs uppercase tracking-wider">Note</TableHead>
              <TableHead className="py-4 pr-6 text-right font-bold text-xs uppercase tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [1, 2, 3, 4, 5].map(i => (
                <TableRow key={i}>
                  <TableCell className="pl-6"><div className="h-4 w-6 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                  <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-28 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell className="pr-6"><div className="h-8 w-16 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                    <IndianRupee className="w-12 h-12 opacity-10" />
                    <p className="text-sm font-medium">No advance records found</p>
                    {(search || filterEmployee !== "all" || filterMonth !== "all") && (
                      <p className="text-xs">Try clearing the filters</p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((adv, idx) => (
                <TableRow key={adv.id} className="group hover:bg-muted/10 transition-colors" data-testid={`row-advance-${adv.id}`}>
                  <TableCell className="pl-6 py-4 text-xs text-muted-foreground font-medium">{idx + 1}</TableCell>
                  <TableCell className="py-4">
                    <div className="font-semibold text-sm">{employeeMap[adv.employeeId] || `Employee #${adv.employeeId}`}</div>
                  </TableCell>
                  <TableCell className="py-4 text-right">
                    <span className="font-bold text-red-600 dark:text-red-400 text-base">
                      ₹{parseFloat(adv.amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </TableCell>
                  <TableCell className="py-4 text-sm text-muted-foreground">{adv.date}</TableCell>
                  <TableCell className="py-4">
                    <Badge variant="outline" className="text-xs rounded-full bg-muted/30">
                      {format(new Date(adv.month + "-01"), "MMM yyyy")}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4 text-sm text-muted-foreground max-w-[180px] truncate">
                    {adv.note || <span className="opacity-40 italic">No note</span>}
                  </TableCell>
                  <TableCell className="py-4 pr-6">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-xl hover:bg-primary/10 hover:text-primary"
                        onClick={() => openEdit(adv)}
                        data-testid={`button-edit-advance-${adv.id}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl hover:bg-destructive/10 hover:text-destructive"
                            data-testid={`button-delete-advance-${adv.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Advance?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Delete ₹{parseFloat(adv.amount).toLocaleString("en-IN")} advance for <span className="font-bold text-foreground">{employeeMap[adv.employeeId]}</span> on {adv.date}? This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="gap-2">
                            <AlertDialogCancel className="rounded-xl mt-0">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(adv.id)}
                              className="bg-destructive hover:bg-destructive/90 rounded-xl"
                            >
                              Yes, Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
            {filtered.length > 0 && (
              <TableRow className="bg-muted/20 border-t-2">
                <TableCell colSpan={2} className="pl-6 py-4 font-bold text-sm uppercase tracking-wider text-muted-foreground">
                  Total ({filtered.length} records)
                </TableCell>
                <TableCell className="py-4 text-right font-bold text-red-600 dark:text-red-400 text-lg">
                  ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell colSpan={4} />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) { setEditingAdvance(null); form.reset(); } }}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingAdvance ? "Edit Advance" : "Record New Advance"}
            </DialogTitle>
            <DialogDescription>
              {editingAdvance ? "Update the advance payment details." : "Record a salary advance given to an employee."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Employee</FormLabel>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={v => field.onChange(Number(v))}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-lg" data-testid="select-employee-advance">
                          <SelectValue placeholder="Select employee..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees?.filter(e => e.active).map(e => (
                          <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Amount (₹)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. 500"
                          type="number"
                          min="1"
                          step="0.01"
                          className="h-11 rounded-lg"
                          {...field}
                          data-testid="input-advance-amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Date</FormLabel>
                      <FormControl>
                        <Input type="date" className="h-11 rounded-lg" {...field} data-testid="input-advance-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Note (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Medical emergency, festival advance..."
                        className="h-11 rounded-lg"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-advance-note"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="flex-1 h-11 rounded-xl">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-[2] h-11 rounded-xl font-bold"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-advance"
                >
                  {editingAdvance ? "Update Advance" : "Save Advance"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
