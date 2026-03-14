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
import { Plus, Edit2, Trash2, IndianRupee, Clock, User, ChevronRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
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
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);

  const { data: employees } = useEmployees();

  const { data: advances = [], isLoading } = useQuery<EmployeeAdvance[]>({
    queryKey: ["/api/employee-advances"],
  });

  const createMutation = useMutation({
    mutationFn: (data: FormValues) => {
      const month = data.date.slice(0, 7);
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

  const openAdd = (empId?: number) => {
    setEditingAdvance(null);
    form.reset({
      employeeId: empId || selectedEmployeeId || 0,
      amount: "",
      date: format(new Date(), "yyyy-MM-dd"),
      note: "",
    });
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

  const advanceByEmployee = useMemo(() => {
    const map: Record<number, { total: number; count: number; lastDate: string }> = {};
    for (const adv of advances) {
      if (!map[adv.employeeId]) map[adv.employeeId] = { total: 0, count: 0, lastDate: "" };
      map[adv.employeeId].total += parseFloat(adv.amount || "0");
      map[adv.employeeId].count += 1;
      if (!map[adv.employeeId].lastDate || adv.date > map[adv.employeeId].lastDate) {
        map[adv.employeeId].lastDate = adv.date;
      }
    }
    return map;
  }, [advances]);

  // Employees who have any advance, sorted by most recent advance date
  const employeesWithAdvances = useMemo(() => {
    return Object.entries(advanceByEmployee)
      .map(([id, data]) => ({ id: Number(id), ...data, name: employeeMap[Number(id)] || `Employee #${id}` }))
      .sort((a, b) => b.lastDate.localeCompare(a.lastDate));
  }, [advanceByEmployee, employeeMap]);

  // Visible advances on right panel
  const visibleAdvances = useMemo(() => {
    if (selectedEmployeeId !== null) {
      return advances
        .filter(a => a.employeeId === selectedEmployeeId)
        .sort((a, b) => b.date.localeCompare(a.date));
    }
    // "Recent" view: latest 20 across all employees
    return [...advances].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
  }, [advances, selectedEmployeeId]);

  const selectedEmployee = selectedEmployeeId !== null
    ? employees?.find(e => e.id === selectedEmployeeId)
    : null;

  const selectedTotal = selectedEmployeeId !== null
    ? (advanceByEmployee[selectedEmployeeId]?.total || 0)
    : null;

  const thisMonth = format(new Date(), "yyyy-MM");
  const grandTotal = useMemo(() => advances.reduce((s, a) => s + parseFloat(a.amount || "0"), 0), [advances]);
  const thisMonthTotal = useMemo(() =>
    advances.filter(a => a.month === thisMonth).reduce((s, a) => s + parseFloat(a.amount || "0"), 0),
    [advances, thisMonth]
  );

  return (
    <div className="flex flex-col h-full px-4 md:px-8 py-6 gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Advance Tracker</h1>
          <p className="text-sm text-muted-foreground mt-1">Track salary advances given to employees.</p>
        </div>
        <Button
          onClick={() => openAdd()}
          className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
          data-testid="button-add-advance"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Advance
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-2 border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50 to-red-50/50 dark:from-red-950/30 shadow-sm">
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-red-700 dark:text-red-300">
              ₹{(grandTotal / 1000).toFixed(1)}K
            </div>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-semibold uppercase tracking-wider">All Time</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50 to-orange-50/50 dark:from-orange-950/30 shadow-sm">
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
              ₹{(thisMonthTotal / 1000).toFixed(1)}K
            </div>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 font-semibold uppercase tracking-wider">This Month</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-blue-50/50 dark:from-blue-950/30 shadow-sm">
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {employeesWithAdvances.length}
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-semibold uppercase tracking-wider">Employees</p>
          </CardContent>
        </Card>
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-col lg:flex-row gap-4 min-h-0 flex-1">

        {/* Left panel — Employee List */}
        <div className="lg:w-64 xl:w-72 flex-shrink-0">
          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Employees</p>
            </div>

            <div className="divide-y max-h-[calc(100vh-420px)] overflow-y-auto">
              {/* "All Recent" option */}
              <button
                onClick={() => setSelectedEmployeeId(null)}
                data-testid="button-select-all-recent"
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/20",
                  selectedEmployeeId === null && "bg-primary/5 border-l-2 border-l-primary"
                )}
              >
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
                  selectedEmployeeId === null ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <Clock className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">All Recent</p>
                  <p className="text-xs text-muted-foreground">Latest 20 entries</p>
                </div>
              </button>

              {/* Employee rows */}
              {isLoading ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                      <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                    </div>
                  </div>
                ))
              ) : employeesWithAdvances.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                  No advances recorded yet
                </div>
              ) : (
                employeesWithAdvances.map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedEmployeeId(emp.id)}
                    data-testid={`button-select-employee-${emp.id}`}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/20",
                      selectedEmployeeId === emp.id && "bg-primary/5 border-l-2 border-l-primary"
                    )}
                  >
                    <div className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold",
                      selectedEmployeeId === emp.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{emp.name}</p>
                      <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                        ₹{emp.total.toLocaleString("en-IN")}
                        <span className="text-muted-foreground font-normal ml-1">({emp.count})</span>
                      </p>
                    </div>
                    {selectedEmployeeId === emp.id && (
                      <ChevronRight className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right panel — Advance Details */}
        <div className="flex-1 min-w-0">
          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden h-full">

            {/* Panel header */}
            <div className="px-6 py-4 border-b bg-muted/20 flex items-center justify-between gap-4">
              <div>
                {selectedEmployee ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                      {selectedEmployee.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="font-bold text-lg leading-tight">{selectedEmployee.name}</h2>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{selectedEmployee.designation}</span>
                        <span className="text-xs font-bold text-red-600 dark:text-red-400">
                          Total: ₹{(selectedTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Clock className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h2 className="font-bold text-lg">Recent Advances</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Latest 20 entries across all employees</p>
                    </div>
                  </div>
                )}
              </div>
              <Button
                size="sm"
                onClick={() => openAdd(selectedEmployeeId || undefined)}
                className="bg-green-600 hover:bg-green-700 shrink-0"
                data-testid="button-add-advance-panel"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add
              </Button>
            </div>

            {/* Table */}
            <div className="overflow-auto max-h-[calc(100vh-420px)]">
              <Table>
                <TableHeader className="bg-muted/10 sticky top-0">
                  <TableRow>
                    {selectedEmployeeId === null && (
                      <TableHead className="py-3 pl-6 font-bold text-xs uppercase tracking-wider">Employee</TableHead>
                    )}
                    <TableHead className="py-3 pl-6 font-bold text-xs uppercase tracking-wider">Date</TableHead>
                    <TableHead className="py-3 font-bold text-xs uppercase tracking-wider">Month</TableHead>
                    <TableHead className="py-3 font-bold text-xs uppercase tracking-wider text-right">Amount</TableHead>
                    <TableHead className="py-3 font-bold text-xs uppercase tracking-wider">Note</TableHead>
                    <TableHead className="py-3 pr-6 text-right font-bold text-xs uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleAdvances.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                          <IndianRupee className="w-10 h-10 opacity-10" />
                          <p className="text-sm font-medium">
                            {selectedEmployee ? `No advances recorded for ${selectedEmployee.name}` : "No advances yet"}
                          </p>
                          <Button size="sm" variant="outline" onClick={() => openAdd(selectedEmployeeId || undefined)} className="mt-1">
                            <Plus className="w-3.5 h-3.5 mr-1" /> Record First Advance
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {visibleAdvances.map((adv) => (
                        <TableRow key={adv.id} className="group hover:bg-muted/10 transition-colors" data-testid={`row-advance-${adv.id}`}>
                          {selectedEmployeeId === null && (
                            <TableCell className="py-3 pl-6">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                                  {(employeeMap[adv.employeeId] || "?").charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm font-semibold">
                                  {employeeMap[adv.employeeId] || `#${adv.employeeId}`}
                                </span>
                              </div>
                            </TableCell>
                          )}
                          <TableCell className="py-3 pl-6 text-sm text-muted-foreground font-medium">{adv.date}</TableCell>
                          <TableCell className="py-3">
                            <Badge variant="outline" className="text-xs rounded-full bg-muted/30 font-normal">
                              {format(new Date(adv.month + "-01"), "MMM yyyy")}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            <span className="font-bold text-red-600 dark:text-red-400">
                              ₹{parseFloat(adv.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 text-sm text-muted-foreground max-w-[160px]">
                            <span className="truncate block">
                              {adv.note || <span className="opacity-40 italic text-xs">—</span>}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 pr-6">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary"
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
                                    className="h-7 w-7 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                                    data-testid={`button-delete-advance-${adv.id}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-2xl">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Advance?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Delete ₹{parseFloat(adv.amount).toLocaleString("en-IN")} advance for <span className="font-bold text-foreground">{employeeMap[adv.employeeId]}</span> on {adv.date}?
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
                      ))}
                      {/* Total row */}
                      {selectedEmployeeId !== null && visibleAdvances.length > 0 && (
                        <TableRow className="bg-muted/20 border-t-2">
                          <TableCell className="pl-6 py-3 font-bold text-sm text-muted-foreground uppercase tracking-wider">
                            Total ({visibleAdvances.length} records)
                          </TableCell>
                          <TableCell />
                          <TableCell className="py-3 text-right font-bold text-red-600 dark:text-red-400 text-base">
                            ₹{(selectedTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell colSpan={2} />
                        </TableRow>
                      )}
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Dialog */}
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
